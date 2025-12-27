import { NextApiResponse } from 'next';
import { withMobileAuth, MobileAuthRequest } from '@/lib/middleware/mobile-auth';
import { prisma } from '@/lib/prisma';
import { getReadingDefinitions } from 'models/readingDefinition';

const handler = async (req: MobileAuthRequest, res: NextApiResponse) => {
  const { method } = req;
  const { id: historyId } = req.query;

  if (!historyId || typeof historyId !== 'string') {
    return res.status(400).json({ error: { message: 'Missing history ID' } });
  }

  try {
    // Verify access
    const user = req.mobileUser;
    if (!user) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const history = await prisma.serviceHistory.findFirst({
      where: { 
        id: historyId,
        technicianId: user.id
      }
    });

    if (!history) {
      return res.status(404).json({ error: { message: 'Service history not found' } });
    }

    if (!history.companyId) {
      return res.status(400).json({ error: { message: 'Service history missing company ID' } });
    }

    switch (method) {
      case 'GET':
        await handleGET(req, res, history.companyId);
        break;
      default:
        res.setHeader('Allow', 'GET');
        res.status(405).json({
          error: { message: `Method ${method} Not Allowed` },
        });
    }
  } catch (error: any) {
    console.error('Reading Definitions API Error:', error);
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;
    res.status(status).json({ error: { message } });
  }
};

const handleGET = async (req: MobileAuthRequest, res: NextApiResponse, companyId: string) => {
  const definitions = await getReadingDefinitions(companyId);
  
  res.status(200).json({ data: definitions });
};

export default withMobileAuth(handler);


