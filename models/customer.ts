import { prisma } from '@/lib/prisma';
import { Customer, Prisma, Pool, Route, User } from '@prisma/client';

export type CustomerWithPoolsAndRoutes = Customer & {
  pools: (Pool & {
    routes: (Route & {
      tech: User | null;
    })[];
  })[];
};

export const createCustomer = async (
  data: Prisma.CustomerCreateInput
): Promise<Customer> => {
  return await prisma.customer.create({
    data,
  });
};

export const getCustomers = async (
  companyId: string,
  options?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }
): Promise<{ customers: Customer[]; totalCount: number }> => {
  const { page = 1, pageSize = 10, search = '' } = options || {};
  const skip = (page - 1) * pageSize;

  // Build search conditions
  const searchConditions = search
    ? {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
          { addressStreet: { contains: search, mode: 'insensitive' as const } },
          { addressCity: { contains: search, mode: 'insensitive' as const } },
          { addressState: { contains: search, mode: 'insensitive' as const } },
          { addressZip: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const whereClause = {
    companyId,
    ...searchConditions,
  };

  const [customers, totalCount] = await Promise.all([
    prisma.customer.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: pageSize,
    }),
    prisma.customer.count({
      where: whereClause,
    }),
  ]);

  return { customers, totalCount };
};

export const getCustomer = async (
  id: string,
  companyId: string
): Promise<CustomerWithPoolsAndRoutes | null> => {
  return await prisma.customer.findFirst({
    where: {
      id,
      companyId,
    },
    include: {
      pools: {
        include: {
          routes: {
            include: {
              tech: true,
            },
          },
        },
      },
    },
  });
};

export const updateCustomer = async (
  id: string,
  companyId: string,
  data: Prisma.CustomerUpdateInput
): Promise<Customer> => {
  // First verify the customer belongs to the company
  const customer = await prisma.customer.findFirst({
    where: { id, companyId },
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  return await prisma.customer.update({
    where: {
      id,
    },
    data,
  });
};

export const deleteCustomer = async (
  id: string,
  companyId: string
): Promise<Customer> => {
  // First verify the customer belongs to the company
  const customer = await prisma.customer.findFirst({
    where: { id, companyId },
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  return await prisma.customer.delete({
    where: {
      id,
    },
  });
};

export const countCustomers = async (
  args: Prisma.CustomerCountArgs
): Promise<number> => {
  return await prisma.customer.count(args);
};

