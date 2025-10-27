import { NextApiRequest, NextApiResponse } from 'next';
import { decode } from 'next-auth/jwt';
import env from '@/lib/env';
import { ApiError } from '@/lib/errors';

export interface MobileAuthRequest extends NextApiRequest {
  mobileUser?: {
    id: string;
    email: string;
    name: string;
    deviceInfo?: any;
  };
}

/**
 * Middleware to authenticate mobile JWT tokens
 */
export const authenticateMobileToken = async (
  req: MobileAuthRequest,
  res: NextApiResponse
): Promise<boolean> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authorization header missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new ApiError(401, 'Token not provided');
    }

    // Decode and verify JWT token
    const decoded = await decode({
      token,
      secret: env.nextAuth.secret as string | Buffer,
    });

    if (!decoded) {
      throw new ApiError(401, 'Invalid or expired token');
    }

    // Check if token is for mobile app
    if (decoded.type !== 'mobile') {
      throw new ApiError(401, 'Invalid token type');
    }

    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    const exp = typeof decoded.exp === 'number' ? decoded.exp : undefined;
    if (exp !== undefined && exp < now) {
      throw new ApiError(401, 'Token has expired');
    }

    // Attach user info to request
    req.mobileUser = {
      id: decoded.sub as string,
      email: decoded.email as string,
      name: decoded.name as string,
      deviceInfo: decoded.deviceInfo,
    };

    return true;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, 'Authentication failed');
  }
};

/**
 * Higher-order function to wrap API handlers with mobile authentication
 */
export const withMobileAuth = (
  handler: (req: MobileAuthRequest, res: NextApiResponse) => Promise<void>
) => {
  return async (req: MobileAuthRequest, res: NextApiResponse) => {
    try {
      await authenticateMobileToken(req, res);
      return handler(req, res);
    } catch (error: any) {
      const message = error.message || 'Authentication failed';
      const status = error.status || 401;

      res.status(status).json({ error: { message } });
    }
  };
};
