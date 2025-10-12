import { ApiError } from '@/lib/errors';
import { sendAudit } from '@/lib/retraced';
import { sendEvent } from '@/lib/svix';
import { throwIfNoCompanyAccess } from 'models/company';
import { throwIfNotAllowed } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { recordMetric } from '@/lib/metrics';
import {
  createCustomer,
  getCustomers,
  deleteCustomer,
  updateCustomer,
} from 'models/customer';
import {
  createCustomerSchema,
  updateCustomerSchema,
  deleteCustomerSchema,
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

// Get customers of a company
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  throwIfNotAllowed(companyMember, 'company', 'read');

  const customers = await getCustomers(companyMember.company.id);

  recordMetric('customer.fetched');

  res.status(200).json({ data: customers });
};

// Create a new customer
const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  throwIfNotAllowed(companyMember, 'company', 'create');

  const {
    firstName,
    lastName,
    email,
    phone,
    addressStreet,
    addressCity,
    addressState,
    addressZip,
    notes,
    status,
  } = validateWithSchema(createCustomerSchema, req.body);

  const customer = await createCustomer({
    firstName,
    lastName,
    email: email || null,
    phone: phone || null,
    addressStreet: addressStreet || null,
    addressCity: addressCity || null,
    addressState: addressState || null,
    addressZip: addressZip || null,
    notes: notes || null,
    status,
    company: {
      connect: {
        id: companyMember.company.id,
      },
    },
  });

  await sendEvent(companyMember.companyId, 'customer.created', customer);

  sendAudit({
    action: 'customer.create',
    crud: 'c',
    user: companyMember.user,
    company: companyMember.company,
  });

  recordMetric('customer.created');

  res.status(201).json({ data: customer });
};

// Delete a customer
const handleDELETE = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  throwIfNotAllowed(companyMember, 'company', 'delete');

  const { customerId } = validateWithSchema(
    deleteCustomerSchema,
    req.query as { customerId: string }
  );

  const deletedCustomer = await deleteCustomer(
    customerId,
    companyMember.company.id
  );

  await sendEvent(companyMember.companyId, 'customer.deleted', deletedCustomer);

  sendAudit({
    action: 'customer.delete',
    crud: 'd',
    user: companyMember.user,
    company: companyMember.company,
  });

  recordMetric('customer.deleted');

  res.status(200).json({ data: {} });
};

// Update a customer
const handlePATCH = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  throwIfNotAllowed(companyMember, 'company', 'update');

  const {
    customerId,
    firstName,
    lastName,
    email,
    phone,
    addressStreet,
    addressCity,
    addressState,
    addressZip,
    notes,
    status,
  } = validateWithSchema(updateCustomerSchema, req.body);

  const updatedCustomer = await updateCustomer(
    customerId,
    companyMember.company.id,
    {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(email !== undefined && { email: email || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(addressStreet !== undefined && { addressStreet: addressStreet || null }),
      ...(addressCity !== undefined && { addressCity: addressCity || null }),
      ...(addressState !== undefined && { addressState: addressState || null }),
      ...(addressZip !== undefined && { addressZip: addressZip || null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(status && { status }),
    }
  );

  await sendEvent(companyMember.companyId, 'customer.updated', updatedCustomer);

  sendAudit({
    action: 'customer.update',
    crud: 'u',
    user: companyMember.user,
    company: companyMember.company,
  });

  recordMetric('customer.updated');

  res.status(200).json({ data: updatedCustomer });
};

