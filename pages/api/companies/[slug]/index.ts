import { sendAudit } from '@/lib/retraced';
import {
  deleteCompany,
  getCurrentUserWithCompany,
  getCompany,
  throwIfNoCompanyAccess,
  updateCompany,
} from 'models/company';
import { throwIfNotAllowed } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { recordMetric } from '@/lib/metrics';
import { ApiError } from '@/lib/errors';
import env from '@/lib/env';
import { updateCompanySchema, validateWithSchema } from '@/lib/zod';
import { Prisma, Company } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await throwIfNoCompanyAccess(req, res);

    switch (req.method) {
      case 'GET':
        await handleGET(req, res);
        break;
      case 'PUT':
        await handlePUT(req, res);
        break;
      case 'DELETE':
        await handleDELETE(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET, PUT, DELETE');
        res.status(405).json({
          error: { message: `Method ${req.method} Not Allowed` },
        });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}

// Get a company by slug
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getCurrentUserWithCompany(req, res);

  throwIfNotAllowed(user, 'company', 'read');

  const company = await getCompany({ id: user.company.id });

  recordMetric('company.fetched');

  res.status(200).json({ data: company });
};

// Update a company
const handlePUT = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getCurrentUserWithCompany(req, res);

  throwIfNotAllowed(user, 'company', 'update');

  const { name, slug, domain } = validateWithSchema(updateCompanySchema, req.body);

  let updatedCompany: Company | null = null;

  try {
    updatedCompany = await updateCompany(user.company.slug, {
      name,
      slug,
      domain,
    });
  } catch (error: any) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      error.meta?.target
    ) {
      const target = error.meta.target as string[];

      if (target.includes('slug')) {
        throw new ApiError(409, 'This slug is already taken for a company.');
      }

      if (target.includes('domain')) {
        throw new ApiError(
          409,
          'This domain is already associated with a company.'
        );
      }
    }

    throw error;
  }

  sendAudit({
    action: 'company.update',
    crud: 'u',
    user,
    company: user.company,
  });

  recordMetric('company.updated');

  res.status(200).json({ data: updatedCompany });
};

// Delete a company
const handleDELETE = async (req: NextApiRequest, res: NextApiResponse) => {
  if (!env.companyFeatures.deleteCompany) {
    throw new ApiError(404, 'Not Found');
  }

  const user = await getCurrentUserWithCompany(req, res);

  throwIfNotAllowed(user, 'company', 'delete');

  await deleteCompany({ id: user.company.id });

  sendAudit({
    action: 'company.delete',
    crud: 'd',
    user,
    company: user.company,
  });

  recordMetric('company.removed');

  res.status(204).end();
};
