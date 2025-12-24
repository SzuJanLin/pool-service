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
        },
        include: {
            checklistTemplate: true
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
    console.error('Checklist API Error:', error);
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;
    res.status(status).json({ error: { message } });
  }
};

const handleGET = async (req: MobileAuthRequest, res: NextApiResponse, history: any) => {
    // 1. Check for existing items
    const existingItems = await prisma.serviceChecklistItem.findMany({
        where: { serviceHistoryId: history.id },
        orderBy: { orderIndex: 'asc' }
    });

    if (existingItems.length > 0) {
        return res.status(200).json({ data: existingItems });
    }

    // 2. If no items, try to create from template
    let templateId = history.checklistTemplateId;

    if (!templateId) {
        // Find default template for company
        // We need companyId. If history doesn't have it (legacy), try to find it.
        // Assuming history.companyId is populated now.
        if (history.companyId) {
            const defaultTemplate = await prisma.checklistTemplate.findFirst({
                where: { 
                    companyId: history.companyId,
                    isActive: true
                },
                orderBy: { createdAt: 'desc' } // Just pick most recent active for now
            });
            
            if (defaultTemplate) {
                templateId = defaultTemplate.id;
                // Update history to link to this template
                await prisma.serviceHistory.update({
                    where: { id: history.id },
                    data: { checklistTemplateId: templateId }
                });
            }
        }
    }

    if (templateId) {
        // Fetch template items
        const templateItems = await prisma.checklistItemTemplate.findMany({
            where: { checklistTemplateId: templateId },
            orderBy: { orderIndex: 'asc' }
        });

        if (templateItems.length > 0) {
            // Create service items
            // Using transaction to ensure all or nothing
            const createdItems = await prisma.$transaction(
                templateItems.map(tmplItem => 
                    prisma.serviceChecklistItem.create({
                        data: {
                            serviceHistoryId: history.id,
                            itemTemplateId: tmplItem.id,
                            label: tmplItem.label,
                            type: tmplItem.type,
                            orderIndex: tmplItem.orderIndex,
                            completed: false,
                        }
                    })
                )
            );
            return res.status(200).json({ data: createdItems });
        }
    }

    // Fallback: Return empty list if no template found
    return res.status(200).json({ data: [] });
};

const handlePOST = async (req: MobileAuthRequest, res: NextApiResponse, history: any) => {
    // Update an item
    const { itemId, completed, notedIssue, textValue, numericValue } = req.body;

    if (!itemId) {
        return res.status(400).json({ error: { message: 'Missing itemId' } });
    }

    // Verify item belongs to this history
    const item = await prisma.serviceChecklistItem.findFirst({
        where: { id: itemId, serviceHistoryId: history.id }
    });

    if (!item) {
        return res.status(404).json({ error: { message: 'Item not found in this service history' } });
    }

    const updatedItem = await prisma.serviceChecklistItem.update({
        where: { id: itemId },
        data: {
            completed: completed !== undefined ? completed : item.completed,
            notedIssue: notedIssue !== undefined ? notedIssue : item.notedIssue,
            textValue: textValue !== undefined ? textValue : item.textValue,
            numericValue: numericValue !== undefined ? numericValue : item.numericValue,
        }
    });

    res.status(200).json({ data: updatedItem });
};

export default withMobileAuth(handler);

