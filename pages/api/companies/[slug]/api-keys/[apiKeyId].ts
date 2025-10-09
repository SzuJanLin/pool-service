import { deleteApiKey } from 'models/apiKey';
import { getCurrentUserWithCompany, throwIfNoCompanyAccess } from 'models/company';
import { throwIfNotAllowed } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { recordMetric } from '@/lib/metrics';
import env from '@/lib/env';
import { ApiError } from '@/lib/errors';
import { deleteApiKeySchema, validateWithSchema } from '@/lib/zod';
import { throwIfNoAccessToApiKey } from '@/lib/guards/company-api-key';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (!env.companyFeatures.apiKey) {
      throw new ApiError(404, 'Not Found');
    }

    await throwIfNoCompanyAccess(req, res);

    switch (req.method) {
      case 'DELETE':
        await handleDELETE(req, res);
        break;
      default:
        res.setHeader('Allow', 'DELETE');
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

// Delete an API key
const handleDELETE = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getCurrentUserWithCompany(req, res);

  throwIfNotAllowed(user, 'company_api_key', 'delete');

  const { apiKeyId } = validateWithSchema(deleteApiKeySchema, req.query);

  await throwIfNoAccessToApiKey(apiKeyId, user.company.id);

  await deleteApiKey(apiKeyId);

  recordMetric('apikey.removed');

  res.status(204).end();
};
