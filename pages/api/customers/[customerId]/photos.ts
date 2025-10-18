import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { getCompany } from 'models/company';
import { getCustomer } from 'models/customer';
import { prisma } from '@/lib/prisma';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedDownloadUrl } from '@/lib/s3';
import env from '@/lib/env';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: env.r2.endpoint,
  credentials: {
    accessKeyId: env.r2.accessKeyId ?? '',
    secretAccessKey: env.r2.secretAccessKey ?? '',
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
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
    
    if (!companySlug || !customerId || typeof companySlug !== 'string' || typeof customerId !== 'string') {
      return res.status(400).json({ error: 'Company slug and customer ID are required' });
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

    // List photos for this customer
    const bucket = env.r2.bucket;
    if (!bucket) {
      return res.status(500).json({ error: 'R2 bucket not configured' });
    }

    const prefix = `company/${company.id}/customers/${customerId}/photos/`;
    
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);
    
    // Generate signed URLs for each photo
    const photos = await Promise.all(
      (response.Contents || []).map(async (object) => {
        if (!object.Key) return null;
        
        // Extract filename from key
        const filename = object.Key.split('/').pop() || '';
        
        // Generate signed download URL
        const downloadUrl = await getSignedDownloadUrl(bucket, object.Key, 3600 * 24 * 7); // 7 days
        
        return {
          key: object.Key,
          filename,
          size: object.Size || 0,
          lastModified: object.LastModified,
          downloadUrl,
          url: `${env.r2.publicUrl || env.r2.endpoint}/${object.Key}`,
        };
      })
    );

    // Filter out null values
    const validPhotos = photos.filter((photo) => photo !== null);

    return res.status(200).json({
      success: true,
      data: validPhotos,
    });

  } catch (error) {
    console.error('Fetch photos error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch photos',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
