import { throwIfNoCompanyAccess } from 'models/company';
import { throwIfNotAllowed } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCustomer } from 'models/customer';
import { getServiceHistory } from 'models/serviceHistory';
import { 
  getChemicalDoses,
  createChemicalDose,
  deleteChemicalDose 
} from 'models/chemicalDose';
import { validateWithSchema } from '@/lib/zod';
import { createChemicalDoseSchema } from '@/lib/zod/serviceHistory';

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
      default:
        res.setHeader('Allow', 'GET, POST, DELETE');
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

// Get chemical doses for a service history
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

  const doses = await getChemicalDoses(historyId);

  res.status(200).json({ data: doses });
};

// Add a chemical dose to service history
const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  throwIfNotAllowed(companyMember, 'company', 'create');

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
  const doseData = validateWithSchema(createChemicalDoseSchema, req.body);

  const dose = await createChemicalDose(historyId, doseData);

  res.status(201).json({ data: dose });
};

// Delete a chemical dose
const handleDELETE = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  throwIfNotAllowed(companyMember, 'company', 'delete');

  const { id, historyId, doseId } = req.query;
  if (!id || typeof id !== 'string' || !historyId || typeof historyId !== 'string' || !doseId || typeof doseId !== 'string') {
    return res.status(400).json({
      error: { message: 'Customer ID, History ID, and Dose ID are required' },
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

  await deleteChemicalDose(doseId, historyId);

  res.status(200).json({ data: { message: 'Chemical dose deleted successfully' } });
};
