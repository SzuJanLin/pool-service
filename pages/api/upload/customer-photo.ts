import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { uploadCustomerPhotoBuffer } from '@/lib/s3';
import { getCompany } from 'models/company';
import { getCustomer } from 'models/customer';
import { prisma } from '@/lib/prisma';
import formidable from 'formidable';
import fs from 'fs';

// Disable the default body parser for this API route
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get authenticated session
    const session = await getSession(req, res);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get company slug from query parameters
    const { companySlug, customerId } = req.query;
    
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

    // Handle file upload using formidable
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      filter: ({ mimetype }) => {
        // Only allow image files
        return Boolean(mimetype && mimetype.includes('image'));
      },
    });

    const [, files] = await form.parse(req);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Read the file buffer
    const fileBuffer = await fs.promises.readFile(file.filepath);
    
    // Generate the key for the upload
    const key = `company/${company.id}/customers/${customerId}/photos/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${file.originalFilename?.split('.').pop() || 'jpg'}`;
    
    // Upload the photo directly using the buffer
    const uploadResult = await uploadCustomerPhotoBuffer(
      fileBuffer,
      company.id,
      customerId,
      file.originalFilename || 'upload',
      file.mimetype || 'application/octet-stream',
      key
    );

    // Clean up the temporary file
    await fs.promises.unlink(file.filepath);

    return res.status(200).json({
      success: true,
      data: {
        key: uploadResult.key,
        url: uploadResult.url,
        size: uploadResult.size,
        contentType: uploadResult.contentType,
      },
    });

  } catch (error) {
    console.error('Photo upload error:', error);
    return res.status(500).json({ 
      error: 'Failed to upload photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
