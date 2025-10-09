import { prisma } from '@/lib/prisma';

export const countCompanyMembers = async ({ where }) => {
  return await prisma.companyMember.count({
    where,
  });
};

export const updateCompanyMember = async ({ where, data }) => {
  return await prisma.companyMember.update({
    where,
    data,
  });
};
