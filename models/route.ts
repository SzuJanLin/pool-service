import { prisma } from '@/lib/prisma';
import { Route, Prisma } from '@prisma/client';

export const createRoute = async (
  data: Prisma.RouteCreateInput
): Promise<Route> => {
  return await prisma.route.create({
    data,
  });
};

export const getCompanyRoutes = async (companyId: string): Promise<Route[]> => {
  return await prisma.route.findMany({
    where: {
      pool: {
        customer: {
          companyId,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      tech: true,
      pool: {
        include: {
          customer: true,
        },
      },
    },
  });
};

export const getRoutes = async (poolId: string): Promise<Route[]> => {
  return await prisma.route.findMany({
    where: {
      poolId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      tech: true,
    },
  });
};

export const getRoute = async (
  id: string,
  poolId: string
): Promise<Route | null> => {
  return await prisma.route.findFirst({
    where: { id, poolId },
    include: {
      tech: true,
    },
  });
};

export const updateRoute = async (
  id: string,
  poolId: string,
  data: Prisma.RouteUpdateInput
): Promise<Route> => {
  const route = await prisma.route.findFirst({
    where: { id, poolId },
  });

  if (!route) {
    throw new Error('Route not found');
  }

  return await prisma.route.update({
    where: {
      id,
    },
    data,
    include: {
      tech: true,
    },
  });
};

export const deleteRoute = async (
  id: string,
  poolId: string
): Promise<void> => {
  const route = await prisma.route.findFirst({
    where: { id, poolId },
  });

  if (!route) {
    throw new Error('Route not found');
  }

  await prisma.route.delete({
    where: {
      id,
    },
  });
};