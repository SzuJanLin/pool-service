import { throwIfNoCompanyAccess } from 'models/company';
import { throwIfNotAllowed } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCustomer } from 'models/customer';
import { getServiceHistory } from 'models/serviceHistory';
import { 
  getServiceReadings,
  upsertServiceReadings 
} from 'models/serviceReadings';
import { validateWithSchema } from '@/lib/zod';
import { createReadingsSchema } from '@/lib/zod/serviceHistory';

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
      case 'PUT':
        await handlePUT(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET, POST, PUT');
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

// Get service readings
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  throwIfNotAllowed(companyMember, 'company', 'read');

  const { id, historyId } = req.query;
  if (!id || typeof id !== 'string' || !historyId || typeof historyId !== 'string') {
    return res.status(400).json({
      error: { message: 'Customer ID and History ID are required' },
    });
  }

  // Verify customer belongs to company
  const customer = await getCustomer(id, companyMember.company.id);
  if (!customer) {
    return res.status(404).json({
      error: { message: 'Customer not found' },
    });
  }

  // Verify service history exists and belongs to this customer
  const serviceHistory = await getServiceHistory(historyId, companyMember.company.id);
  if (!serviceHistory || serviceHistory.route.pool.customer.id !== customer.id) {
    return res.status(404).json({
      error: { message: 'Service history not found for this customer' },
    });
  }

  const readings = await getServiceReadings(historyId);

  res.status(200).json({ data: readings });
};

// Create or update service readings
const handlePUT = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  throwIfNotAllowed(companyMember, 'company', 'update');

  const { id, historyId } = req.query;
  if (!id || typeof id !== 'string' || !historyId || typeof historyId !== 'string') {
    return res.status(400).json({
      error: { message: 'Customer ID and History ID are required' },
    });
  }

  // Verify customer belongs to company
  const customer = await getCustomer(id, companyMember.company.id);
  if (!customer) {
    return res.status(404).json({
      error: { message: 'Customer not found' },
    });
  }

  // Verify service history exists and belongs to this customer
  const serviceHistory = await getServiceHistory(historyId, companyMember.company.id);
  if (!serviceHistory || serviceHistory.route.pool.customer.id !== customer.id) {
    return res.status(404).json({
      error: { message: 'Service history not found for this customer' },
    });
  }

  // Validate request body
  const readingsData = validateWithSchema(createReadingsSchema, req.body);

  const readings = await upsertServiceReadings(historyId, readingsData);

  res.status(200).json({ data: readings });
};
