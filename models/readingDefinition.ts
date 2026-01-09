import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const getReadingDefinitions = async (companyId: string) => {
  return await prisma.readingDefinition.findMany({
    where: {
      companyId,
      deletedAt: null,
    },
    orderBy: {
      orderIndex: 'asc',
    },
  });
};

export const createReadingDefinition = async (
  data: Omit<Prisma.ReadingDefinitionCreateInput, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
) => {
  return await prisma.readingDefinition.create({
    data,
  });
};

export const updateReadingDefinition = async (
  id: string,
  data: Prisma.ReadingDefinitionUpdateInput
) => {
  return await prisma.readingDefinition.update({
    where: { id },
    data,
  });
};

export const deleteReadingDefinition = async (id: string) => {
  return await prisma.readingDefinition.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });
};

export const getReadingDefinition = async (id: string) => {
  return await prisma.readingDefinition.findUnique({
    where: { id },
  });
};
