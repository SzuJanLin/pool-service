import { NextApiRequest, NextApiResponse } from 'next';
import { getUser } from 'models/user';
import { validateWithSchema, mobileRefreshSchema } from '@/lib/zod/mobile-auth';
import { ApiError } from '@/lib/errors';
import { recordMetric } from '@/lib/metrics';
import { AppEvent } from 'types';

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
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}

const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  // Validate request body
  const { refreshToken, deviceInfo } = validateWithSchema(
    mobileRefreshSchema,
    req.body
  );

  try {
    // Decode the refresh token to get user info
    const { decode } = await import('next-auth/jwt');
    const decoded = await decode({
      token: refreshToken,
      secret: process.env.NEXTAUTH_SECRET!,
    });

    if (!decoded || decoded.type !== 'mobile') {
      throw new ApiError(401, 'Invalid refresh token');
    }

    // Get fresh user data
    const user = await getUser({ id: decoded.sub as string });
    
    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    // Generate new access token
    const newToken = await generateMobileJWT(user, deviceInfo);

    // Record token refresh metric
    recordMetric('mobile.token.refresh' as AppEvent);

    res.status(200).json({
      success: true,
      data: {
        token: newToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, 'Invalid refresh token');
  }
};

/**
 * Generate JWT token for mobile authentication
 */
async function generateMobileJWT(user: any, deviceInfo?: any) {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
    type: 'mobile',
    deviceInfo,
  };

  // Use NextAuth JWT encoding
  const { encode } = await import('next-auth/jwt');
  return encode({
    token: payload,
    secret: process.env.NEXTAUTH_SECRET!,
  });
}
