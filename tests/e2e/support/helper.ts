import { prisma } from '@/lib/prisma';

export const user = {
  name: 'Jackson',
  email: 'jackson@example.com',
  password: 'password',
} as const;

export const company = {
  name: 'Example',
  slug: 'example',
} as const;

export const secondCompany = {
  name: 'BoxyHQ',
  slug: 'boxyhq',
} as const;

export async function cleanup() {
  await prisma.companyMember.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
  await prisma.session.deleteMany();
  await prisma.$disconnect();
}
