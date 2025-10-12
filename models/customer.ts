import { prisma } from '@/lib/prisma';
import { Customer, CustomerStatus, Prisma } from '@prisma/client';

export const createCustomer = async (
  data: Prisma.CustomerCreateInput
): Promise<Customer> => {
  return await prisma.customer.create({
    data,
  });
};

export const getCustomers = async (companyId: string): Promise<Customer[]> => {
  return await prisma.customer.findMany({
    where: {
      companyId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
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
  return await prisma.customer.update({
    where: {
      id,
    },
    data: {
      ...data,
      companyId,
    },
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

