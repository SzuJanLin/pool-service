import { ApiError } from '@/lib/errors';
import { throwIfNoCompanyAccess } from 'models/company';
import { throwIfNotAllowed } from 'models/user';
import {
  deleteDosageDefinition,
  getDosageDefinition,
  updateDosageDefinition,
} from 'models/dosageDefinition';
import type { NextApiRequest, NextApiResponse } from 'next';
import { validateWithSchema, updateDosageDefinitionSchema } from '@/lib/zod';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  try {
    switch (method) {
      case 'PUT':
        await handlePUT(req, res);
        break;
      case 'DELETE':
        await handleDELETE(req, res);
        break;
      default:
        res.setHeader('Allow', 'PUT, DELETE');
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

const handlePUT = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  throwIfNotAllowed(companyMember, 'company', 'update');

  const { id } = req.query as { id: string };
  const data = validateWithSchema(updateDosageDefinitionSchema, req.body);

  const existing = await getDosageDefinition(id);
  if (!existing || existing.companyId !== companyMember.companyId) {
    throw new ApiError(404, 'Dosage definition not found');
  }

  const dosage = await updateDosageDefinition(id, data);

  res.status(200).json({ data: dosage });
};

const handleDELETE = async (req: NextApiRequest, res: NextApiResponse) => {
  const companyMember = await throwIfNoCompanyAccess(req, res);
  throwIfNotAllowed(companyMember, 'company', 'update');

  const { id } = req.query as { id: string };

  const existing = await getDosageDefinition(id);
  if (!existing || existing.companyId !== companyMember.companyId) {
    throw new ApiError(404, 'Dosage definition not found');
  }

  await deleteDosageDefinition(id);

  res.status(200).json({ data: {} });
};
