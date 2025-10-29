import { prisma } from '@/lib/prisma';
import { ServiceReadings, Prisma } from '@prisma/client';

export const createServiceReadings = async (
  serviceHistoryId: string,
  data: Omit<Prisma.ServiceReadingsCreateInput, 'serviceHistory'>
): Promise<ServiceReadings> => {
  return await prisma.serviceReadings.create({
    data: {
      ...data,
      serviceHistory: {
        connect: { id: serviceHistoryId },
      },
    },
  });
};

export const updateServiceReadings = async (
  serviceHistoryId: string,
  data: Prisma.ServiceReadingsUpdateInput
): Promise<ServiceReadings> => {
  return await prisma.serviceReadings.update({
    where: { serviceHistoryId },
    data,
  });
};

export const getServiceReadings = async (
  serviceHistoryId: string
): Promise<ServiceReadings | null> => {
  return await prisma.serviceReadings.findUnique({
    where: { serviceHistoryId },
  });
};

export const upsertServiceReadings = async (
  serviceHistoryId: string,
  data: Omit<Prisma.ServiceReadingsCreateInput, 'serviceHistory'>
): Promise<ServiceReadings> => {
  return await prisma.serviceReadings.upsert({
    where: { serviceHistoryId },
    update: data,
    create: {
      ...data,
      serviceHistory: {
        connect: { id: serviceHistoryId },
      },
    },
  });
};
