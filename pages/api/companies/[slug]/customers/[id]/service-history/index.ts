import { throwIfNoCompanyAccess } from 'models/company';
import { throwIfNotAllowed } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCustomer } from 'models/customer';
import { 
  createServiceHistory, 
  getServiceHistories 
} from 'models/serviceHistory';
import { createServiceReadings, upsertServiceReadings } from 'models/serviceReadings';
import { batchCreateChemicalDoses, clearChemicalDoses } from 'models/chemicalDose';
import { validateWithSchema } from '@/lib/zod';
import { createServiceHistorySchema, serviceHistoryQuerySchema } from '@/lib/zod/serviceHistory';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        await handleGET(req, res);
        break;
      case 'POST':
        await handlePOST(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET, POST');
        res.status(405).json({
          error: { message: `Method ${method} Not Allowed` },
        });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;
    res.status(status).json({ error: { message } });
  }
}

// Get service histories for a customer
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  throwIfNotAllowed(companyMember, 'company', 'read');

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: { message: 'Customer ID is required' },
    });
  }

  // Verify customer belongs to company
  const customer = await getCustomer(id, companyMember.company.id);
  if (!customer) {
    return res.status(404).json({
      error: { message: 'Customer not found' },
    });
  }

  // Parse and validate query parameters
  const queryParams = validateWithSchema(serviceHistoryQuerySchema, req.query);

  const { histories, totalCount } = await getServiceHistories(
    companyMember.company.id,
    {
      customerId: customer.id,
      ...queryParams,
    }
  );

  res.status(200).json({ data: histories, totalCount });
};

// Create a new service history entry
const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  throwIfNotAllowed(companyMember, 'company', 'create');

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: { message: 'Customer ID is required' },
    });
  }

  // Verify customer belongs to company
  const customer = await getCustomer(id, companyMember.company.id);
  if (!customer) {
    return res.status(404).json({
      error: { message: 'Customer not found' },
    });
  }

  // Validate request body
  const {
    routeId,
    serviceDate,
    status,
    technicianId,
    notes,
    readings,
    doses,
  } = validateWithSchema(createServiceHistorySchema, req.body);

  // Verify route exists and belongs to customer's pools
  const route = await prisma.route.findFirst({
    where: {
      id: routeId,
      pool: {
        customerId: customer.id,
      },
    },
    include: {
      pool: true,
    },
  });

  if (!route) {
    return res.status(404).json({
      error: { message: 'Route not found for this customer' },
    });
  }

  // Create service history with all related data in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create service history
    const serviceHistory = await tx.serviceHistory.create({
      data: {
        routeId,
        serviceDate,
        status,
        technicianId: technicianId || route.techId,
        companyId: companyMember.company.id,
        notes: notes || null,
        createdById: companyMember.userId,
      },
    });

    // Create readings if provided
    if (readings && Object.values(readings).some(val => val !== null && val !== undefined)) {
      await tx.serviceReadings.create({
        data: {
          serviceHistoryId: serviceHistory.id,
          freeChlorine: readings.freeChlorine,
          totalChlorine: readings.totalChlorine,
          pH: readings.pH,
          totalAlkalinity: readings.totalAlkalinity,
          calciumHardness: readings.calciumHardness,
          cyanuricAcid: readings.cyanuricAcid,
          salt: readings.salt,
          temperatureC: readings.temperatureC,
          method: readings.method,
          notes: readings.notes,
        },
      });
    }

    // Create chemical doses if provided
    if (doses && doses.length > 0) {
      for (const dose of doses) {
        await tx.chemicalDose.create({
          data: {
            serviceHistoryId: serviceHistory.id,
            chemical: dose.chemical,
            amount: dose.amount,
            unit: dose.unit,
            productName: dose.productName,
            costCents: dose.costCents,
            notes: dose.notes,
          },
        });
      }
    }

    return serviceHistory;
  });

  // Fetch the complete service history with relations
  const completeServiceHistory = await getServiceHistories(
    companyMember.company.id,
    { customerId: customer.id }
  );

  const createdHistory = completeServiceHistory.histories.find(h => h.id === result.id);

  res.status(201).json({ data: createdHistory });
};
