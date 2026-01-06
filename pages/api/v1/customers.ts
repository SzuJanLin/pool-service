import { NextApiResponse } from 'next';
import { withMobileAuth, MobileAuthRequest } from '@/lib/middleware/mobile-auth';
import { prisma } from '@/lib/prisma';

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

  const companyId = companyMember.companyId;

  // Fetch all customers for the company with their pools
  const customers = await prisma.customer.findMany({
    where: {
      companyId: companyId,
    },
    include: {
      pools: true,
    },
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' },
    ],
  });

  const responseData = {
    success: true,
    data: customers,
  };

  res.status(200).json(responseData);
};

export default withMobileAuth(handler);
