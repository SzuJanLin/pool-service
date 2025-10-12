import { prisma } from '@/lib/prisma';
import { Customer, CustomerStatus, Prisma } from '@prisma/client';

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
  }
): Promise<{ customers: Customer[]; totalCount: number }> => {
  const { page = 1, pageSize = 10 } = options || {};
  const skip = (page - 1) * pageSize;

  const [customers, totalCount] = await Promise.all([
    prisma.customer.findMany({
      where: {
        companyId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: pageSize,
    }),
    prisma.customer.count({
      where: {
        companyId,
      },
    }),
  ]);

  return { customers, totalCount };
};

export const getCustomer = async (
  id: string,
  companyId: string
): Promise<Customer | null> => {
  return await prisma.customer.findFirst({
    where: {
      id,
      companyId,
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

