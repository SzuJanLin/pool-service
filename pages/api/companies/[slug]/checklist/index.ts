import {
  getCurrentUserWithCompany,
  throwIfNoCompanyAccess,
} from 'models/company';
import { throwIfNotAllowed } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await throwIfNoCompanyAccess(req, res);

    switch (req.method) {
      case 'GET':
        await handleGET(req, res);
        break;
      case 'POST':
        await handlePOST(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET, POST');
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

// Get the active checklist template
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getCurrentUserWithCompany(req, res);
  throwIfNotAllowed(user, 'company', 'read');

  const template = await prisma.checklistTemplate.findFirst({
    where: {
      companyId: user.company.id,
      isActive: true,
    },
    include: {
      items: {
        orderBy: {
          orderIndex: 'asc',
        },
      },
    },
  });

  res.status(200).json({ data: template });
};

// Create or get active checklist template
const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getCurrentUserWithCompany(req, res);
  throwIfNotAllowed(user, 'company', 'update');

  // Check if one exists
  let template = await prisma.checklistTemplate.findFirst({
    where: {
      companyId: user.company.id,
      isActive: true,
    },
    include: {
        items: {
            orderBy: {
                orderIndex: 'asc'
            }
        }
    }
  });

  if (!template) {
    template = await prisma.checklistTemplate.create({
      data: {
        companyId: user.company.id,
        name: 'Default Checklist',
        isActive: true,
      },
      include: {
        items: true,
      }
    });
  }

  res.status(200).json({ data: template });
};


