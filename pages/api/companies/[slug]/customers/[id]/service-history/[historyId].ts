import { throwIfNoCompanyAccess } from 'models/company';
import { throwIfNotAllowed } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCustomer } from 'models/customer';
import { 
  getServiceHistory,
  updateServiceHistory,
  deleteServiceHistory 
} from 'models/serviceHistory';
import { validateWithSchema } from '@/lib/zod';
import { updateServiceHistorySchema } from '@/lib/zod/serviceHistory';

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
      case 'PATCH':
        await handlePATCH(req, res);
        break;
      case 'DELETE':
        await handleDELETE(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET, PATCH, DELETE');
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

// Get a single service history entry
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

  const serviceHistory = await getServiceHistory(historyId, companyMember.company.id);
  if (!serviceHistory) {
    return res.status(404).json({
      error: { message: 'Service history not found' },
    });
  }

  // Verify the service history belongs to this customer
  if (serviceHistory.route.pool.customer.id !== customer.id) {
    return res.status(404).json({
      error: { message: 'Service history not found for this customer' },
    });
  }

  res.status(200).json({ data: serviceHistory });
};

// Update a service history entry
const handlePATCH = async (req: NextApiRequest, res: NextApiResponse) => {
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
  const existingHistory = await getServiceHistory(historyId, companyMember.company.id);
  if (!existingHistory || existingHistory.route.pool.customer.id !== customer.id) {
    return res.status(404).json({
      error: { message: 'Service history not found for this customer' },
    });
  }

  // Validate request body
  const updateData = validateWithSchema(updateServiceHistorySchema, req.body);

  const updatedHistory = await updateServiceHistory(
    historyId,
    companyMember.company.id,
    {
      ...updateData,
      updatedById: companyMember.userId,
    }
  );

  // Fetch the complete updated service history
  const completeHistory = await getServiceHistory(historyId, companyMember.company.id);

  res.status(200).json({ data: completeHistory });
};

// Delete a service history entry
const handleDELETE = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  throwIfNotAllowed(companyMember, 'company', 'delete');

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
  const existingHistory = await getServiceHistory(historyId, companyMember.company.id);
  if (!existingHistory || existingHistory.route.pool.customer.id !== customer.id) {
    return res.status(404).json({
      error: { message: 'Service history not found for this customer' },
    });
  }

  await deleteServiceHistory(historyId, companyMember.company.id);

  res.status(200).json({ data: { message: 'Service history deleted successfully' } });
};
