import { NextApiResponse } from 'next';
import { withMobileAuth, MobileAuthRequest } from '@/lib/middleware/mobile-auth';
import { prisma } from '@/lib/prisma';
import env from '@/lib/env';
import { getSignedDownloadUrl } from '@/lib/s3';

const handler = async (req: MobileAuthRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const user = req.mobileUser;
  if (!user) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }

  const serviceHistoryId = req.query.id as string;
  if (!serviceHistoryId) {
    return res.status(400).json({ error: { message: 'Service History ID is required' } });
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

  // Verify access
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
  });

  if (!serviceHistory) {
    return res.status(404).json({ error: { message: 'Service history not found or access denied' } });
  }

  try {
    const photos = await prisma.servicePhoto.findMany({
      where: {
        serviceHistoryId: serviceHistoryId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Ensure URLs are complete if publicUrl is used
    const processedPhotos = await Promise.all(photos.map(async (photo) => {
        // photo does not have .url property from Prisma, so we remove photo.url access
        let displayUrl = photo.publicUrl || (photo.objectKey && env.r2.publicUrl ? `${env.r2.publicUrl}/${photo.objectKey}` : null);
        
        // If we don't have a public URL and the URL we have looks like a private endpoint or is just missing, generate a signed URL
        if (!env.r2.publicUrl || !displayUrl) {
            try {
                displayUrl = await getSignedDownloadUrl(photo.bucket, photo.objectKey, 3600);
            } catch (e) {
                console.warn('Failed to generate signed URL for photo', photo.id, e);
            }
        }
        
        return {
            ...photo,
            url: displayUrl
        };
    }));

    return res.status(200).json({
      success: true,
      data: processedPhotos,
    });
  } catch (error: any) {
    console.error('Fetch photos error:', error);
    return res.status(500).json({ 
      error: { message: 'Failed to fetch photos' }
    });
  }
};

export default withMobileAuth(handler);
