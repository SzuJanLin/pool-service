import { NextApiResponse } from 'next';
import { withMobileAuth, MobileAuthRequest } from '@/lib/middleware/mobile-auth';
import { validateWithSchema, mobileLogoutSchema } from '@/lib/zod/mobile-auth';
import { recordMetric } from '@/lib/metrics';

const handler = async (req: MobileAuthRequest, res: NextApiResponse) => {
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
};

const handlePOST = async (req: MobileAuthRequest, res: NextApiResponse) => {
  // Validate request body
  validateWithSchema(
    mobileLogoutSchema,
    req.body
  );

  // Record logout metric
  recordMetric('mobile.logout.success');

  // In a production app, you might want to:
  // 1. Add the token to a blacklist
  // 2. Log the logout event
  // 3. Clear any device-specific data

  res.status(200).json({
    success: true,
    message: 'Successfully logged out',
  });
};

// Export the handler wrapped with mobile authentication
export default withMobileAuth(handler);
