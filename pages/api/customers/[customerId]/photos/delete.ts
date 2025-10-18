import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { deleteFromR2 } from '@/lib/s3';
import { getCompany } from 'models/company';
import { getCustomer } from 'models/customer';
import { prisma } from '@/lib/prisma';
import env from '@/lib/env';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get authenticated session
    const session = await getSession(req, res);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { customerId } = req.query;
    const { companySlug } = req.query;
    const { key } = req.body;
    
    if (!companySlug || !customerId || typeof companySlug !== 'string' || typeof customerId !== 'string') {
      return res.status(400).json({ error: 'Company slug and customer ID are required' });
    }

    if (!key) {
      return res.status(400).json({ error: 'Photo key is required' });
    }

    // Get company to verify access
    const company = await getCompany({ slug: companySlug });
    
    // Verify customer belongs to company
    const customer = await getCustomer(customerId, company.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if user has access to this company
    const userCompanyMember = await prisma.companyMember.findFirst({
      where: {
        userId: session.user.id,
        companyId: company.id,
      },
    });

    if (!userCompanyMember) {
      return res.status(403).json({ error: 'Access denied to this company' });
    }

    // Verify the key belongs to this company and customer
    const expectedPrefix = `company/${company.id}/customers/${customerId}/photos/`;
    if (!key.startsWith(expectedPrefix)) {
      return res.status(403).json({ error: 'Invalid photo key' });
    }

    const bucket = env.r2.bucket;
    if (!bucket) {
      return res.status(500).json({ error: 'R2 bucket not configured' });
    }

    await deleteFromR2(bucket, key);

    return res.status(200).json({
      success: true,
      message: 'Photo deleted successfully',
    });

  } catch (error) {
    console.error('Delete photo error:', error);
    return res.status(500).json({ 
      error: 'Failed to delete photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
