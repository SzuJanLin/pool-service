import {
  getCurrentUserWithCompany,
  throwIfNoCompanyAccess,
} from 'models/company';
import { throwIfNotAllowed } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await throwIfNoCompanyAccess(req, res);

    switch (req.method) {
      case 'PUT':
        await handlePUT(req, res);
        break;
      case 'DELETE':
        await handleDELETE(req, res);
        break;
      default:
        res.setHeader('Allow', 'PUT, DELETE');
        res.status(405).json({
          error: { message: `Method ${req.method} Not Allowed` },
        });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}

const handlePUT = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getCurrentUserWithCompany(req, res);
  throwIfNotAllowed(user, 'company', 'update');

  const { itemId } = req.query as { itemId: string };
  const { description, descriptionWhenCompleted } = req.body;

  if (!description) {
    throw new ApiError(400, 'Description is required');
  }

  // Verify item belongs to company's active template (security check)
  const item = await prisma.checklistItemTemplate.findFirst({
    where: {
      id: itemId,
      template: {
        companyId: user.company.id,
      },
    },
  });

  if (!item) {
    throw new ApiError(404, 'Item not found');
  }

  const updatedItem = await prisma.checklistItemTemplate.update({
    where: { id: itemId },
    data: {
      description,
      descriptionWhenCompleted,
    },
  });

  res.status(200).json({ data: updatedItem });
};

const handleDELETE = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getCurrentUserWithCompany(req, res);
  throwIfNotAllowed(user, 'company', 'update');

  const { itemId } = req.query as { itemId: string };

  // Verify item belongs to company
  const item = await prisma.checklistItemTemplate.findFirst({
    where: {
      id: itemId,
      template: {
        companyId: user.company.id,
      },
    },
  });

  if (!item) {
    throw new ApiError(404, 'Item not found');
  }

  // Soft delete logic:
  // 1. Unlink from ServiceChecklistItem (set itemTemplateId = null)
  // 2. Delete the template item

  await prisma.$transaction([
    prisma.serviceChecklistItem.updateMany({
      where: { itemTemplateId: itemId },
      data: { itemTemplateId: null },
    }),
    prisma.checklistItemTemplate.delete({
      where: { id: itemId },
    }),
  ]);

  res.status(204).end();
};
