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
      case 'POST':
        await handlePOST(req, res);
        break;
      default:
        res.setHeader('Allow', 'POST');
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

const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getCurrentUserWithCompany(req, res);
  throwIfNotAllowed(user, 'company', 'update');

  const { description, descriptionWhenCompleted } = req.body;

  if (!description) {
    throw new ApiError(400, 'Description is required');
  }

  // Get active template
  const template = await prisma.checklistTemplate.findFirst({
    where: {
      companyId: user.company.id,
      isActive: true,
    },
    include: {
        items: true
    }
  });

  if (!template) {
    throw new ApiError(404, 'Checklist template not found');
  }

  // Calculate orderIndex
  const maxOrder = template.items.reduce((max, item) => Math.max(max, item.orderIndex), -1);

  const item = await prisma.checklistItemTemplate.create({
    data: {
      checklistTemplateId: template.id,
      description,
      descriptionWhenCompleted,
      orderIndex: maxOrder + 1,
      required: false,
    },
  });

  res.status(201).json({ data: item });
};
