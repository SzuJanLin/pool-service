import { prisma } from '@/lib/prisma';
import { 
  ServiceHistory, 
  Prisma,
  ServiceReadings,
  ChemicalDose,
  Route,
  User,
  Company
} from '@prisma/client';

export type ServiceHistoryWithRelations = ServiceHistory & {
  route: Route & {
    pool: {
      id: string;
      name: string;
      customer: {
        id: string;
        firstName: string;
        lastName: string;
      };
    };
  };
  technician?: User | null;
  company?: Company | null;
  readings?: ServiceReadings | null;
  doses: ChemicalDose[];
};

export const createServiceHistory = async (
  data: Prisma.ServiceHistoryCreateInput
): Promise<ServiceHistory> => {
  return await prisma.serviceHistory.create({
    data,
  });
};

export const getServiceHistory = async (
  id: string,
  companyId: string
): Promise<ServiceHistoryWithRelations | null> => {
  return await prisma.serviceHistory.findFirst({
    where: {
      id,
      companyId,
    },
    include: {
      route: {
        include: {
          pool: {
            include: {
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
      technician: true,
      company: true,
      readings: true,
      doses: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });
};

export const getServiceHistories = async (
  companyId: string,
  filters?: {
    routeId?: string;
    customerId?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    technicianId?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<{ histories: ServiceHistoryWithRelations[]; totalCount: number }> => {
  const { page = 1, pageSize = 50 } = filters || {};
  const skip = (page - 1) * pageSize;

  const where: Prisma.ServiceHistoryWhereInput = {
    companyId,
  };

  if (filters?.routeId) {
    where.routeId = filters.routeId;
  }

  if (filters?.customerId) {
    where.route = {
      pool: {
        customerId: filters.customerId,
      },
    };
  }

  if (filters?.status) {
    where.status = filters.status as any;
  }

  if (filters?.dateFrom || filters?.dateTo) {
    where.serviceDate = {};
    if (filters.dateFrom) where.serviceDate.gte = filters.dateFrom;
    if (filters.dateTo) where.serviceDate.lte = filters.dateTo;
  }

  if (filters?.technicianId) {
    where.technicianId = filters.technicianId;
  }

  const [histories, totalCount] = await Promise.all([
    prisma.serviceHistory.findMany({
      where,
      include: {
        route: {
          include: {
            pool: {
              include: {
                customer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        readings: true,
        doses: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        serviceDate: 'desc',
      },
      skip,
      take: pageSize,
    }),
    prisma.serviceHistory.count({ where }),
  ]);

  return { histories, totalCount };
};

export const updateServiceHistory = async (
  id: string,
  companyId: string,
  data: Prisma.ServiceHistoryUpdateInput
): Promise<ServiceHistory> => {
  const history = await prisma.serviceHistory.findFirst({
    where: { id, companyId },
  });

  if (!history) {
    throw new Error('Service history not found');
  }

  return await prisma.serviceHistory.update({
    where: { id },
    data,
  });
};

export const deleteServiceHistory = async (
  id: string,
  companyId: string
): Promise<void> => {
  const history = await prisma.serviceHistory.findFirst({
    where: { id, companyId },
  });

  if (!history) {
    throw new Error('Service history not found');
  }

  await prisma.serviceHistory.delete({
    where: { id },
  });
};
