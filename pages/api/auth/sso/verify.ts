import env from '@/lib/env';
import { ssoManager } from '@/lib/jackson/sso';
import { ssoVerifySchema, validateWithSchema } from '@/lib/zod';
import { Company } from '@prisma/client';
import { getCompany, getCompanies } from 'models/company';
import { getUser } from 'models/user';
import { NextApiRequest, NextApiResponse } from 'next';

const sso = ssoManager();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        await handlePOST(req, res);
        break;
      default:
        res.setHeader('Allow', 'POST');
        res.status(405).json({
          error: { message: `Method ${method} Not Allowed` },
        });
    }
  } catch (err: any) {
    res.status(400).json({
      error: { message: err.message },
    });
  }
}

const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const { slug, email } = validateWithSchema(
    ssoVerifySchema,
    JSON.parse(req.body) as { slug: string }
  );

  if (!slug && !email) {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  // If slug is provided, verify SSO connections for the company
  if (slug) {
    const company = await getCompany({ slug });

    if (!company) {
      throw new Error('Company not found.');
    }

    const data = await handleCompanySSOVerification(company.id);
    return res.json({ data });
  }

  // If email is provided, verify SSO connections for the user
  if (email) {
    const companies = await getCompaniesFromEmail(email);

    if (companies.length === 1) {
      const data = await handleCompanySSOVerification(companies[0].id);
      return res.json({ data });
    }

    const { companyId, useSlug } = await processCompaniesForSSOVerification(companies);

    // Multiple companies with SSO connections found
    // Ask user to provide company slug
    if (useSlug) {
      return res.json({
        data: {
          useSlug,
        },
      });
    }

    // No companies with SSO connections found
    if (!companyId) {
      throw new Error('No SSO connections found for any company.');
    } else {
      // Only one company with SSO connections found
      return res.json({
        data: {
          companyId,
        },
      });
    }
  }
};

/**
 * Handle SSO verification for given company id
 */
async function handleCompanySSOVerification(companyId: string) {
  const exists = await companySSOExists(companyId);

  if (!exists) {
    throw new Error('No SSO connections found for this company.');
  }

  return { companyId };
}

/**
 * Get list of companies for a user from email
 */
async function getCompaniesFromEmail(email: string): Promise<Company[]> {
  const user = await getUser({ email });
  if (!user) {
    throw new Error('User not found.');
  }
  const companies = await getCompanies(user.id);
  if (!companies.length) {
    throw new Error('User does not belong to any company.');
  }
  return companies;
}

/**
 * Check if SSO connections exist for a company
 */
async function companySSOExists(companyId: string): Promise<boolean> {
  const connections = await sso.getConnections({
    tenant: companyId,
    product: env.jackson.productId,
  });

  if (connections && connections.length > 0) {
    return true;
  }

  return false;
}

/**
 * Process companies to find the company with SSO connections
 * If multiple companies with SSO connections are found, return useSlug as true
 * If no companies with SSO connections are found, return companyId as empty string
 * If only one company with SSO connections is found, return companyId
 */
async function processCompaniesForSSOVerification(companies: Company[]): Promise<{
  companyId: string;
  useSlug: boolean;
}> {
  let companyId = '';
  for (const company of companies) {
    const exists = await companySSOExists(company.id);

    if (exists) {
      if (companyId) {
        // Multiple companies with SSO connections found
        return {
          companyId: '',
          useSlug: true,
        };
      } else {
        // First company with SSO connections found
        companyId = company.id;
      }
    }
  }
  return {
    companyId,
    useSlug: false,
  };
}
