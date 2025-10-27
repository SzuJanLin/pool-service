import { NextApiRequest, NextApiResponse } from 'next';
import { getUser } from 'models/user';
import { verifyPassword } from '@/lib/auth';
import { validateWithSchema, mobileLoginSchema } from '@/lib/zod/mobile-auth';
import { ApiError } from '@/lib/errors';
import { 
  clearLoginAttempts, 
  exceededLoginAttemptsThreshold, 
  incrementLoginAttempts 
} from '@/lib/accountLock';
import env from '@/lib/env';
import { recordMetric } from '@/lib/metrics';
import { AppEvent } from 'types/base';

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
  const { email, password, deviceInfo } = validateWithSchema(
    mobileLoginSchema,
    req.body
  );

  // Validate reCAPTCHA if enabled, disabled for now
  // if (env.recaptcha.siteKey && env.recaptcha.secretKey) {
  //   await validateRecaptcha(recaptchaToken as string);
  // }

  // Find user by email
  const user = await getUser({ email });

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Check if account is locked
  if (exceededLoginAttemptsThreshold(user)) {
    throw new ApiError(423, 'Account temporarily locked due to too many failed login attempts');
  }

  // Check if email verification is required
  if (env.confirmEmail && !user.emailVerified) {
    throw new ApiError(403, 'Please verify your email address before logging in');
  }

  // Verify password
  const hasValidPassword = await verifyPassword(password, user.password as string);

  if (!hasValidPassword) {
    // Increment failed login attempts
    const updatedUser = await incrementLoginAttempts(user);
    
    if (exceededLoginAttemptsThreshold(updatedUser)) {
      throw new ApiError(423, 'Account temporarily locked due to too many failed login attempts');
    }

    throw new ApiError(401, 'Invalid credentials');
  }

  // Clear login attempts on successful login
  await clearLoginAttempts(user);

  // Generate JWT token for mobile app
  const token = await generateMobileJWT(user, deviceInfo);

  // Record successful login metric
  recordMetric('user.signup' as AppEvent);

  // Return success response with token
  res.status(200).json({
    success: true,
    data: {
      token,
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
    secret: env.nextAuth.secret as string | Buffer,
  });
}
