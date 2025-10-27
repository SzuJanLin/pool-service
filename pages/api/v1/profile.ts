import { NextApiResponse } from 'next';
import { withMobileAuth, MobileAuthRequest } from '@/lib/middleware/mobile-auth';
import { recordMetric } from '@/lib/metrics';

const handler = async (req: MobileAuthRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        await handleGET(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET');
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

const handleGET = async (req: MobileAuthRequest, res: NextApiResponse) => {
  // Record API usage metric
  recordMetric('mobile.profile.get');

  // Return user profile data
  res.status(200).json({
    success: true,
    data: {
      user: req.mobileUser,
    },
  });
};

// Export the handler wrapped with mobile authentication
export default withMobileAuth(handler);
