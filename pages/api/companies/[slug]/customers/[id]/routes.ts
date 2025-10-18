import { throwIfNoCompanyAccess } from 'models/company';
import { throwIfNotAllowed } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCustomer } from 'models/customer';
import { getPool } from 'models/pool';
import { createRoute, getRoutes, deleteRoute, updateRoute } from 'models/route';
import { validateWithSchema } from '@/lib/zod';
import { 
  createRouteSchema,
  updateRouteSchema,
  deleteRouteSchema
} from '@/lib/zod/route';

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

// Get routes for a pool
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  throwIfNotAllowed(companyMember, 'company', 'read');
  
  const { id, poolId } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: { message: 'Customer ID is required' },
    });
  }

  if (!poolId || typeof poolId !== 'string') {
    return res.status(400).json({
      error: { message: 'Pool ID is required' },
    });
  }

  // Verify customer belongs to company
  const customer = await getCustomer(id, companyMember.company.id);
  if (!customer) {
    return res.status(404).json({
      error: { message: 'Customer not found' },
    });
  }

  // Verify pool belongs to customer
  const pool = await getPool(poolId, customer.id);
  if (!pool) {
    return res.status(404).json({
      error: { message: 'Pool not found' },
    });
  }

  const routes = await getRoutes(pool.id);
  res.status(200).json({ data: routes });
};

// Create a new route
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

  const {
    poolId,
    techId,
    dayOfWeek,
    frequency,
    startOn,
    stopAfter,
    skipWeeks,
    anchorDate,
    weekOffset,
    skipWeekNumbers,
    active,
  } = validateWithSchema(createRouteSchema, req.body);

  // Verify pool belongs to customer
  const pool = await getPool(poolId, customer.id);
  if (!pool) {
    return res.status(404).json({
      error: { message: 'Pool not found' },
    });
  }

  const route = await createRoute({
    dayOfWeek,
    frequency,
    startOn,
    ...(stopAfter !== undefined && { stopAfter }),
    skipWeeks,
    ...(anchorDate !== undefined && { anchorDate }),
    weekOffset,
    skipWeekNumbers,
    active,
    pool: {
      connect: {
        id: pool.id,
      },
    },
    ...(techId && {
      tech: {
        connect: {
          id: techId,
        },
      },
    }),
  } as any);

  res.status(201).json({ data: route });
};

// Delete a route
const handleDELETE = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  throwIfNotAllowed(companyMember, 'company', 'delete');
  
  const { id, poolId } = req.query;
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

  const { routeId } = validateWithSchema(
    deleteRouteSchema,
    req.query as { routeId: string }
  );

  // Verify pool belongs to customer
  const pool = await getPool(poolId as string, customer.id);
  if (!pool) {
    return res.status(404).json({
      error: { message: 'Pool not found' },
    });
  }

  await deleteRoute(routeId, pool.id);
  res.status(200).json({ data: {} });
};

// Update a route
const handlePATCH = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  throwIfNotAllowed(companyMember, 'company', 'update');
  
  const { id, poolId } = req.query;
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

  const {
    routeId,
    techId,
    dayOfWeek,
    frequency,
    startOn,
    stopAfter,
    skipWeeks,
    anchorDate,
    weekOffset,
    skipWeekNumbers,
    active,
  } = validateWithSchema(updateRouteSchema, req.body);

  // Verify pool belongs to customer
  const pool = await getPool(poolId as string, customer.id);
  if (!pool) {
    return res.status(404).json({
      error: { message: 'Pool not found' },
    });
  }

  const updatedRoute = await updateRoute(routeId, pool.id, {
    ...(techId !== undefined && { 
      tech: techId ? {
        connect: { id: techId }
      } : {
        disconnect: true
      }
    }),
    ...(dayOfWeek && { dayOfWeek }),
    ...(frequency && { frequency }),
    ...(startOn && { startOn }),
    ...(stopAfter !== undefined && { stopAfter }),
    ...(skipWeeks !== undefined && { skipWeeks }),
    ...(anchorDate !== undefined && { anchorDate }),
    ...(weekOffset !== undefined && { weekOffset }),
    ...(skipWeekNumbers !== undefined && { skipWeekNumbers }),
    ...(active !== undefined && { active }),
  });

  res.status(200).json({ data: updatedRoute });
};