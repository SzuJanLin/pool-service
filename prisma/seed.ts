const { faker } = require('@faker-js/faker');
const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient();
const { hash } = require('bcryptjs');
const { randomUUID } = require('crypto');

let USER_COUNT = 10;
const COMPANY_COUNT = 5;
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin@123';
const USER_EMAIL = 'user@example.com';
const USER_PASSWORD = 'user@123';
async function seedUsers() {
  const newUsers: any[] = [];
  await createRandomUser(ADMIN_EMAIL, ADMIN_PASSWORD);
  await createRandomUser(USER_EMAIL, USER_PASSWORD);
  await Promise.all(
    Array(USER_COUNT)
      .fill(0)
      .map(() => createRandomUser())
  );

  console.log('Seeded users', newUsers.length);

  return newUsers;

  async function createRandomUser(
    email: string | undefined = undefined,
    password: string | undefined = undefined
  ) {
    try {
      const originalPassword = password || faker.internet.password();
      email = email || faker.internet.email();
      password = await hash(originalPassword, 12);
      const user = await client.user.create({
        data: {
          email,
          name: faker.person.firstName(),
          password,
          emailVerified: new Date(),
        },
      });
      newUsers.push({
        ...user,
        password: originalPassword,
      });
      USER_COUNT--;
    } catch (ex: any) {
      if (ex.message.indexOf('Unique constraint failed') > -1) {
        console.error('Duplicate email', email);
      } else {
        console.log(ex);
      }
    }
  }
}

async function seedCompanies() {
  const newCompanies: any[] = [];

  await Promise.all(
    Array(COMPANY_COUNT)
      .fill(0)
      .map(() => createRandomCompany())
  );
  console.log('Seeded companies', newCompanies.length);
  return newCompanies;

  async function createRandomCompany() {
    const name = faker.company.name();
    const company = await client.company.create({
      data: {
        name,
        slug: name
          .toString()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]+/g, '')
          .replace(/--+/g, '-')
          .replace(/^-+/, '')
          .replace(/-+$/, ''),
      },
    });
    newCompanies.push(company);
  }
}

async function seedCompanyMembers(users: any[], companies: any[]) {
  const newCompanyMembers: any[] = [];
  const roles = ['OWNER', 'MEMBER'];
  for (const user of users) {
    const count = Math.floor(Math.random() * (COMPANY_COUNT - 1)) + 2;
    const companyUsed = new Set();
    for (let j = 0; j < count; j++) {
      try {
        let companyId;
        do {
          companyId = companies[Math.floor(Math.random() * COMPANY_COUNT)].id;
        } while (companyUsed.has(companyId));
        companyUsed.add(companyId);
        newCompanyMembers.push({
          role:
            user.email === ADMIN_EMAIL
              ? 'OWNER'
              : user.email === USER_EMAIL
                ? 'MEMBER'
                : roles[Math.floor(Math.random() * 2)],
          companyId,
          userId: user.id,
        });
      } catch (ex) {
        console.log(ex);
      }
    }
  }

  await client.companyMember.createMany({
    data: newCompanyMembers,
  });
  console.log('Seeded company members', newCompanyMembers.length);
}

async function seedInvitations(companies: any[], users: any[]) {
  const newInvitations: any[] = [];
  for (const company of companies) {
    const count = Math.floor(Math.random() * users.length) + 2;
    for (let j = 0; j < count; j++) {
      try {
        const invitation = await client.invitation.create({
          data: {
            companyId: company.id,
            invitedBy: users[Math.floor(Math.random() * users.length)].id,
            email: faker.internet.email(),
            role: 'MEMBER',
            sentViaEmail: true,
            token: randomUUID(),
            allowedDomains: [],
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
        newInvitations.push(invitation);
      } catch (ex) {
        console.log(ex);
      }
    }
  }

  console.log('Seeded invitations', newInvitations.length);

  return newInvitations;
}

async function init() {
  const users = await seedUsers();
  const companies = await seedCompanies();
  await seedCompanyMembers(users, companies);
  await seedInvitations(companies, users);
}

init();
