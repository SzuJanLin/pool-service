import { prisma } from '@/lib/prisma';
import { Pool, Prisma } from '@prisma/client';

export const createPool = async (
  data: Prisma.PoolCreateInput
): Promise<Pool> => {
  return await prisma.pool.create({
    data,
  });
};

export const getPools = async (customerId: string): Promise<Pool[]> => {
  return await prisma.pool.findMany({
    where: {
      customerId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const getPool = async (
  id: string,
  customerId: string
): Promise<Pool | null> => {
  return await prisma.pool.findFirst({
    where: { id, customerId },
  });
};

export const updatePool = async (
  id: string,
  customerId: string,
  data: Prisma.PoolUpdateInput
): Promise<Pool> => {
  // First verify the pool belongs to the customer
  const pool = await prisma.pool.findFirst({
    where: { id, customerId },
  });

  if (!pool) {
    throw new Error('Pool not found');
  }

  return await prisma.pool.update({
    where: {
      id,
    },
    data,
  });
};

export const deletePool = async (
  id: string,
  customerId: string
): Promise<void> => {
  // First verify the pool belongs to the customer
  const pool = await prisma.pool.findFirst({
    where: { id, customerId },
  });

  if (!pool) {
    throw new Error('Pool not found');
  }

  await prisma.pool.delete({
    where: {
      id,
    },
  });
};

