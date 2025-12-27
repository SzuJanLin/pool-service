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
      case 'POST':
        await handlePOST(req, res, history);
        break;
      default:
        res.setHeader('Allow', 'GET, POST');
        res.status(405).json({
          error: { message: `Method ${method} Not Allowed` },
        });
    }
  } catch (error: any) {
    console.error('Dosages API Error:', error);
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;
    res.status(status).json({ error: { message } });
  }
};

const handleGET = async (req: MobileAuthRequest, res: NextApiResponse, history: any) => {
  const dosages = await prisma.serviceDosage.findMany({
    where: { serviceHistoryId: history.id },
    include: {
      dosageDefinition: true
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({ data: dosages });
};

const handlePOST = async (req: MobileAuthRequest, res: NextApiResponse, history: any) => {
  const { dosageDefinitionId, value, productName, notes } = req.body;

  if (!dosageDefinitionId || value === undefined || value === null) {
    return res.status(400).json({ error: { message: 'Missing dosageDefinitionId or value' } });
  }

  // Get dosage definition to verify it exists and belongs to company
  const definition = await prisma.dosageDefinition.findFirst({
    where: { 
      id: dosageDefinitionId,
      companyId: history.companyId || undefined
    }
  });

  if (!definition) {
    return res.status(404).json({ error: { message: 'Dosage definition not found' } });
  }

  // Store value as string to preserve exact format
  const valueString = String(value);

  // Check if a dosage of this definition already exists for this service history
  const existingDose = await prisma.serviceDosage.findFirst({
    where: {
      serviceHistoryId: history.id,
      dosageDefinitionId: dosageDefinitionId
    },
    orderBy: { createdAt: 'desc' }
  });

  if (existingDose) {
    const dose = await prisma.serviceDosage.update({
      where: { id: existingDose.id },
      data: {
        value: valueString,
        productName: productName || null,
        notes: notes || null,
      },
      include: {
        dosageDefinition: true
      }
    });
    return res.status(200).json({ data: dose });
  }

  const dose = await prisma.serviceDosage.create({
    data: {
      serviceHistoryId: history.id,
      dosageDefinitionId: dosageDefinitionId,
      value: valueString,
      productName: productName || null,
      notes: notes || null,
    },
    include: {
      dosageDefinition: true
    }
  });

  res.status(201).json({ data: dose });
};

export default withMobileAuth(handler);
