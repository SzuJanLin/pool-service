import { throwIfNoCompanyAccess } from 'models/company';
import { throwIfNotAllowed } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCustomer } from 'models/customer';
import { createPool, getPools, deletePool, updatePool } from 'models/pool';
import {
  createPoolSchema,
  updatePoolSchema,
  deletePoolSchema,
  validateWithSchema,
} from '@/lib/zod';

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
      case 'DELETE':
        await handleDELETE(req, res);
        break;
      case 'PATCH':
        await handlePATCH(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET, POST, DELETE, PATCH');
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

// Get pools for a customer
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

  const pools = await getPools(id);

  res.status(200).json({ data: pools });
};

// Create a new pool
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

  const { name, gallons, chemicalType, baselinePressure, notes } =
    validateWithSchema(createPoolSchema, req.body);

  const pool = await createPool({
    name,
    gallons: gallons ?? null,
    chemicalType: chemicalType ?? null,
    baselinePressure: baselinePressure ?? null,
    notes: notes ?? null,
    customer: {
      connect: {
        id: customer.id,
      },
    },
  } as any);

  res.status(201).json({ data: pool });
};

// Delete a pool
const handleDELETE = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  throwIfNotAllowed(companyMember, 'company', 'delete');

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

  const { poolId } = validateWithSchema(
    deletePoolSchema,
    req.query as { poolId: string }
  );

  await deletePool(poolId, customer.id);

  res.status(200).json({ data: {} });
};

// Update a pool
const handlePATCH = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  throwIfNotAllowed(companyMember, 'company', 'update');

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

  const { poolId, name, gallons, chemicalType, baselinePressure, notes } =
    validateWithSchema(updatePoolSchema, req.body);

  const updatedPool = await updatePool(poolId, customer.id, {
    ...(name && { name }),
    ...(gallons !== undefined && { gallons: gallons ?? null }),
    ...(chemicalType !== undefined && { chemicalType: chemicalType ?? null }),
    ...(baselinePressure !== undefined && {
      baselinePressure: baselinePressure ?? null,
    }),
    ...(notes !== undefined && { notes: notes ?? null }),
  });

  res.status(200).json({ data: updatedPool });
};

