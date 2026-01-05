import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import { serviceEmailSettingsSchema } from '@/lib/zod';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);

  if (!session) {
    return res.status(401).json({
      error: {
        message: 'Unauthorized',
      },
    });
  }

  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({
      error: {
        message: 'Invalid company slug',
      },
    });
  }

  const company = await prisma.company.findUnique({
    where: { slug },
  });

  if (!company) {
    return res.status(404).json({
      error: {
        message: 'Company not found',
      },
    });
  }

  // Check if user has access to company settings
  const member = await prisma.companyMember.findUnique({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: session.user.id,
      },
    },
  });

  if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
    return res.status(403).json({
      error: {
        message: 'Forbidden',
      },
    });
  }

  if (req.method === 'GET') {
    const settings = await prisma.serviceEmailSettings.findUnique({
      where: { companyId: company.id },
    });

    return res.status(200).json({ data: settings || {} });
  }

  if (req.method === 'PUT') {
    try {
      const result = serviceEmailSettingsSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          error: {
            message: 'Validation error',
            details: result.error.flatten(),
          },
        });
      }

      const settings = await prisma.serviceEmailSettings.upsert({
        where: { companyId: company.id },
        create: {
          companyId: company.id,
          ...result.data,
        },
        update: {
          ...result.data,
        },
      });

      return res.status(200).json({ data: settings });
    } catch (error: any) {
      return res.status(500).json({
        error: {
          message: error.message,
        },
      });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  res.status(405).json({
    error: { message: `Method ${req.method} Not Allowed` },
  });
}


