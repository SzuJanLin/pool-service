import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const getDosageDefinitions = async (companyId: string) => {
  return await prisma.dosageDefinition.findMany({
    where: {
      companyId,
      deletedAt: null,
    },
    orderBy: {
      orderIndex: 'asc',
    },
  });
};

export const createDosageDefinition = async (
  data: Omit<Prisma.DosageDefinitionCreateInput, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
) => {
  return await prisma.dosageDefinition.create({
    data,
  });
};

export const updateDosageDefinition = async (
  id: string,
  data: Prisma.DosageDefinitionUpdateInput
) => {
  return await prisma.dosageDefinition.update({
    where: { id },
    data,
  });
};

export const deleteDosageDefinition = async (id: string) => {
  return await prisma.dosageDefinition.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });
};

export const getDosageDefinition = async (id: string) => {
  return await prisma.dosageDefinition.findUnique({
    where: { id },
  });
};
