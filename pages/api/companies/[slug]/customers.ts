import { throwIfNoCompanyAccess } from 'models/company';
import { throwIfNotAllowed } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createCustomer,
  getCustomers,
  deleteCustomer,
  updateCustomer,
  getCustomer,
} from 'models/customer';
import {
  createCustomerSchema,
  updateCustomerSchema,
  deleteCustomerSchema,
  validateWithSchema,
} from '@/lib/zod';
import { geocodeAddress } from '@/lib/geocoding';

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

  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 10;
  const search = req.query.search ? (req.query.search as string) : '';

  const { customers, totalCount } = await getCustomers(companyMember.company.id, {
    page,
    pageSize,
    search,
  });

  // recordMetric('customer.fetched');

  res.status(200).json({
    data: customers,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  });
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

  // Geocode address
  const fullAddress = [addressStreet, addressCity, addressState, addressZip]
    .filter(Boolean)
    .join(', ');
  
  let lat = null;
  let lng = null;

  if (fullAddress) {
    const coords = await geocodeAddress(fullAddress);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
  }

  const customer = await createCustomer({
    firstName,
    lastName,
    email: email || null,
    phone: phone || null,
    addressStreet: addressStreet || null,
    addressCity: addressCity || null,
    addressState: addressState || null,
    addressZip: addressZip || null,
    lat,
    lng,
    notes: notes || null,
    status,
    company: {
      connect: {
        id: companyMember.company.id,
      },
    },
  } as any);

  // recordMetric('customer.created');

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

  await deleteCustomer(
    customerId,
    companyMember.company.id
  );

  // recordMetric('customer.deleted');

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

  let lat: number | null | undefined = undefined;
  let lng: number | null | undefined = undefined;

  // Check if address is being updated
  const isUpdatingAddress = 
    addressStreet !== undefined || 
    addressCity !== undefined || 
    addressState !== undefined || 
    addressZip !== undefined;

  if (isUpdatingAddress) {
    const currentCustomer = await getCustomer(customerId, companyMember.company.id);
    if (currentCustomer) {
      const newStreet = addressStreet !== undefined ? addressStreet : currentCustomer.addressStreet;
      const newCity = addressCity !== undefined ? addressCity : currentCustomer.addressCity;
      const newState = addressState !== undefined ? addressState : currentCustomer.addressState;
      const newZip = addressZip !== undefined ? addressZip : currentCustomer.addressZip;

      const fullAddress = [newStreet, newCity, newState, newZip].filter(Boolean).join(', ');
      
      if (fullAddress) {
        const coords = await geocodeAddress(fullAddress);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        } else {
          // Address updated but geocoding failed/not found, explicitly clear coords?
          // Or keep old ones? Usually if address changes, old coords are invalid.
          lat = null;
          lng = null;
        }
      } else {
        // Address cleared
        lat = null;
        lng = null;
      }
    }
  }

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
      ...(lat !== undefined && { lat }),
      ...(lng !== undefined && { lng }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(status && { status }),
    }
  );

  // recordMetric('customer.updated');

  res.status(200).json({ data: updatedCustomer });
};

