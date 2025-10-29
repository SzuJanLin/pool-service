import { prisma } from '@/lib/prisma';
import { ChemicalDose, Prisma } from '@prisma/client';

export const createChemicalDose = async (
  serviceHistoryId: string,
  data: Omit<Prisma.ChemicalDoseCreateInput, 'serviceHistory'>
): Promise<ChemicalDose> => {
  return await prisma.chemicalDose.create({
    data: {
      ...data,
      serviceHistory: {
        connect: { id: serviceHistoryId },
      },
    },
  });
};

export const getChemicalDoses = async (
  serviceHistoryId: string
): Promise<ChemicalDose[]> => {
  return await prisma.chemicalDose.findMany({
    where: { serviceHistoryId },
    orderBy: { createdAt: 'desc' },
  });
};

export const deleteChemicalDose = async (
  id: string,
  serviceHistoryId: string
): Promise<void> => {
  const dose = await prisma.chemicalDose.findFirst({
    where: { id, serviceHistoryId },
  });

  if (!dose) {
    throw new Error('Chemical dose not found');
  }

  await prisma.chemicalDose.delete({
    where: { id },
  });
};

export const batchCreateChemicalDoses = async (
  serviceHistoryId: string,
  doses: Omit<Prisma.ChemicalDoseCreateManyInput, 'serviceHistoryId'>[]
): Promise<ChemicalDose[]> => {
  const createdDoses = [];
  
  for (const dose of doses) {
    const created = await createChemicalDose(serviceHistoryId, dose);
    createdDoses.push(created);
  }
  
  return createdDoses;
};

export const clearChemicalDoses = async (serviceHistoryId: string): Promise<void> => {
  await prisma.chemicalDose.deleteMany({
    where: { serviceHistoryId },
  });
};
