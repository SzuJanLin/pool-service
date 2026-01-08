import { NextApiResponse } from 'next';
import { withMobileAuth, MobileAuthRequest } from '@/lib/middleware/mobile-auth';
import { prisma } from '@/lib/prisma';
import { uploadToR2, getSignedDownloadUrl } from '@/lib/s3';
import formidable from 'formidable';
import fs from 'fs';
import env from '@/lib/env';

export const config = {
  api: {
    bodyParser: false,
  },
};

// #endregion

const handler = async (req: MobileAuthRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const user = req.mobileUser;
  if (!user) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }

  // Get companyId for the user
  const companyMember = await prisma.companyMember.findFirst({
    where: {
      userId: user.id,
    },
  });

  if (!companyMember) {
    return res.status(403).json({ error: { message: 'User is not a member of any company' } });
  }

  const form = formidable({
    maxFileSize: 10 * 1024 * 1024, // 10MB
    filter: ({ mimetype }) => {
      // Allow image files and generic binary streams (often sent by mobile/curl)
      return Boolean(mimetype && (mimetype.includes('image') || mimetype === 'application/octet-stream'));
    },
  });

  try {
    const [fields, files] = await form.parse(req);
    
    // Parse serviceHistoryId from query or fields
    let serviceHistoryId = req.query.serviceHistoryId as string;
    
    // Fallback to fields if not in query (though standard is usually query for simple params or multipart fields)
    if (!serviceHistoryId && fields.serviceHistoryId) {
       serviceHistoryId = Array.isArray(fields.serviceHistoryId) ? fields.serviceHistoryId[0] : fields.serviceHistoryId;
    }

    if (!serviceHistoryId) {
      return res.status(400).json({ error: { message: 'Service History ID is required' } });
    }

    // Verify service history exists and belongs to company
    const serviceHistory = await prisma.serviceHistory.findFirst({
      where: {
        id: serviceHistoryId,
        route: {
          pool: {
            customer: {
              companyId: companyMember.companyId
            }
          }
        }
      },
      include: {
        route: {
          include: {
            pool: {
              include: {
                customer: {
                  select: {
                    id: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!serviceHistory) {
      return res.status(404).json({ error: { message: 'Service history not found or access denied' } });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!file) {
      return res.status(400).json({ error: { message: 'No file provided' } });
    }

    // Read the file buffer
    const fileBuffer = await fs.promises.readFile(file.filepath);
    
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = file.originalFilename?.split('.').pop()?.toLowerCase() || 'jpg';
    
    // Determine content type
    let contentType = file.mimetype || 'application/octet-stream';
    if (contentType === 'application/octet-stream') {
        const extMap: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'heic': 'image/heic'
        };
        if (extMap[extension]) {
            contentType = extMap[extension];
        }
    }

    const customerId = serviceHistory.route.pool.customer.id;
    
    // Generate the key for the upload
    // Structure: company/{companyId}/customers/{customerId}/services/{serviceHistoryId}/{timestamp}-{random}.{ext}
    const key = `company/${companyMember.companyId}/customers/${customerId}/services/${serviceHistoryId}/${timestamp}-${randomString}.${extension}`;
    const bucket = env.r2.bucket;
    
    if (!bucket) {
        throw new Error('R2 bucket not configured');
    }

    // Upload to R2
    await uploadToR2(bucket, key, fileBuffer, contentType);

    // Create ServicePhoto record
    // If we have a public URL configured, use it. Otherwise, we'll store the direct endpoint
    // but the API response should return a signed URL for immediate display if needed.
    const publicUrlBase = env.r2.publicUrl;
    const directUrl = publicUrlBase ? `${publicUrlBase}/${key}` : `${env.r2.endpoint}/${key}`;
    
    const servicePhoto = await prisma.servicePhoto.create({
      data: {
        serviceHistoryId: serviceHistoryId,
        bucket: bucket,
        objectKey: key,
        provider: 'R2', // or S3 based on enum
        fileSize: file.size,
        contentType: contentType,
        uploadedById: user.id,
        publicUrl: publicUrlBase ? directUrl : undefined, 
      },
    });

    // Clean up temporary file
    await fs.promises.unlink(file.filepath);
    
    // Generate a signed URL for immediate display if no public URL is configured
    let displayUrl = directUrl;
    if (!publicUrlBase) {
        displayUrl = await getSignedDownloadUrl(bucket, key, 3600); // 1 hour validity
    }

    return res.status(200).json({
      success: true,
      data: {
        ...servicePhoto,
        url: displayUrl // Override the stored URL with the signed one for the response
      },
    });

  } catch (error: any) {
    console.error('Photo upload error:', error);
    return res.status(500).json({ 
      error: { message: error.message || 'Failed to upload photo' }
    });
  }
};

export default withMobileAuth(handler);
