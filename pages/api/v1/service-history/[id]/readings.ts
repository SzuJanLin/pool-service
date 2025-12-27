import { NextApiResponse } from 'next';
import { withMobileAuth, MobileAuthRequest } from '@/lib/middleware/mobile-auth';
import { prisma } from '@/lib/prisma';

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

    switch (method) {
      case 'GET':
        await handleGET(req, res, history);
        break;
      case 'PUT':
        await handlePUT(req, res, history);
        break;
      default:
        res.setHeader('Allow', 'GET, PUT');
        res.status(405).json({
          error: { message: `Method ${method} Not Allowed` },
        });
    }
  } catch (error: any) {
    console.error('Readings API Error:', error);
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;
    res.status(status).json({ error: { message } });
  }
};

const handleGET = async (req: MobileAuthRequest, res: NextApiResponse, history: any) => {
  const readings = await prisma.serviceReading.findMany({
    where: { serviceHistoryId: history.id },
    include: {
      readingDefinition: true
    }
  });

  // Convert to map keyed by reading definition name for backward compatibility
  const readingsMap: Record<string, string> = {};
  readings.forEach(reading => {
    readingsMap[reading.readingDefinition.name] = reading.value;
  });

  res.status(200).json({ data: readingsMap });
};

const handlePUT = async (req: MobileAuthRequest, res: NextApiResponse, history: any) => {
  const { readings } = req.body;

  if (!readings || typeof readings !== 'object') {
    return res.status(400).json({ error: { message: 'Invalid readings data' } });
  }

  // Readings should be in format: { readingDefinitionId: value }
  const readingsArray = Object.entries(readings).map(([readingDefinitionId, value]) => ({
    readingDefinitionId,
    value: String(value)
  }));

  // Upsert each reading
  const results = await Promise.all(
    readingsArray.map(async ({ readingDefinitionId, value }) => {
      return await prisma.serviceReading.upsert({
        where: {
          serviceHistoryId_readingDefinitionId: {
            serviceHistoryId: history.id,
            readingDefinitionId: readingDefinitionId
          }
        },
        update: {
          value: value,
          measuredAt: new Date(),
        },
        create: {
          serviceHistoryId: history.id,
          readingDefinitionId: readingDefinitionId,
          value: value,
          measuredAt: new Date(),
        }
      });
    })
  );

  res.status(200).json({ data: results });
};

export default withMobileAuth(handler);
