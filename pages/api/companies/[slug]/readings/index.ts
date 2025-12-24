import { throwIfNoCompanyAccess } from 'models/company';
import { throwIfNotAllowed } from 'models/user';
import {
  createReadingDefinition,
  getReadingDefinitions,
} from 'models/readingDefinition';
import type { NextApiRequest, NextApiResponse } from 'next';
import { validateWithSchema, createReadingDefinitionSchema } from '@/lib/zod';

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

const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  // Allow any tech to read definitions
  throwIfNotAllowed(companyMember, 'company', 'read');

  const readings = await getReadingDefinitions(companyMember.companyId);

  res.status(200).json({ data: readings });
};

const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  // Only admins/owners can create definitions
  throwIfNotAllowed(companyMember, 'company', 'update');

  const data = validateWithSchema(createReadingDefinitionSchema, req.body);

  const reading = await createReadingDefinition({
    ...data,
    company: { connect: { id: companyMember.companyId } },
  });

  res.status(201).json({ data: reading });
};

