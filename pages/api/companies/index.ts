import { slugify } from '@/lib/server-common';
import { ApiError } from '@/lib/errors';
import { createCompany, getCompanies, isCompanyExists } from 'models/company';
import type { NextApiRequest, NextApiResponse } from 'next';
import { recordMetric } from '@/lib/metrics';
import { createCompanySchema, validateWithSchema } from '@/lib/zod';
import { getCurrentUser } from 'models/user';

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

// Get companies
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getCurrentUser(req, res);
  const companies = await getCompanies(user.id);

  recordMetric('company.fetched');

  res.status(200).json({ data: companies });
};

// Create a company
const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const { name } = validateWithSchema(createCompanySchema, req.body);

  const user = await getCurrentUser(req, res);
  const slug = slugify(name);

  if (await isCompanyExists(slug)) {
    throw new ApiError(400, 'A company with the slug already exists.');
  }

  const company = await createCompany({
    userId: user.id,
    name,
    slug,
  });

  recordMetric('company.created');

  res.status(200).json({ data: company });
};
