const { faker } = require('@faker-js/faker');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { hash } = require('bcryptjs');

// Load environment variables from .env file
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  } else {
    require('dotenv').config();
  }
} catch {
  // .env file might not exist, that's ok
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const client = new PrismaClient({ adapter });

// Configuration
const COMPANY_COUNT = 1;
const ADDITIONAL_USER_COUNT = 10; // Additional random users beyond admin/user
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin@123';
const USER_EMAIL = 'user@example.com';
const USER_PASSWORD = 'user@123';
const CUSTOMERS_PER_COMPANY = 20;
const CHECKLIST_TEMPLATES_PER_COMPANY = 2;
const CHECKLIST_ITEMS_PER_TEMPLATE = 8;
const READING_DEFINITIONS_PER_COMPANY = 6;
const DOSAGE_DEFINITIONS_PER_COMPANY = 5;

// Helper to generate slug from name
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Seed Users
async function seedUsers() {
  // Create or get admin user
  await createOrGetUser(ADMIN_EMAIL, ADMIN_PASSWORD);
  // Create or get regular user
  await createOrGetUser(USER_EMAIL, USER_PASSWORD);
  
  // Create additional random users
  for (let i = 0; i < ADDITIONAL_USER_COUNT; i++) {
    await createOrGetUser();
  }

  // Fetch all users to return
  const allUsers = await client.user.findMany();
  console.log('✓ Seeded users:', allUsers.length);
  return allUsers;

  async function createOrGetUser(
    email?,
    password?
  ) {
    try {
      const originalPassword = password || faker.internet.password();
      const userEmail = email || faker.internet.email();
      
      // Try to find existing user
      const existingUser = await client.user.findUnique({
        where: { email: userEmail },
      });
      
      if (existingUser) {
        return existingUser;
      }
      
      // Create new user
      const hashedPassword = await hash(originalPassword, 12);
      const user = await client.user.create({
        data: {
          email: userEmail,
          name: faker.person.firstName(),
          password: hashedPassword,
          emailVerified: new Date(),
        },
      });
      return user;
    } catch (ex: any) {
      console.error('Error creating user:', ex?.message || String(ex));
      return null;
    }
  }
}

// Seed Companies
async function seedCompanies() {
  // Check if companies already exist
  const existingCompanies = await client.company.findMany();
  if (existingCompanies.length >= COMPANY_COUNT) {
    console.log('✓ Companies already exist:', existingCompanies.length);
    return existingCompanies.slice(0, COMPANY_COUNT);
  }

  const newCompanies: any[] = [];
  const companiesToCreate = COMPANY_COUNT - existingCompanies.length;

  for (let i = 0; i < companiesToCreate; i++) {
    const name = faker.company.name();
    const company = await client.company.create({
      data: {
        name,
        slug: slugify(name),
      },
    });
    newCompanies.push(company);
  }

  const allCompanies = [...existingCompanies, ...newCompanies];
  console.log('✓ Seeded companies:', allCompanies.length);
  return allCompanies;
}

// Seed Company Members
async function seedCompanyMembers(companies: any[]) {
  // Fetch all users to ensure we create company members for all users
  const allUsers = await client.user.findMany();
  
  if (companies.length === 0) {
    console.log('⚠ No companies found, skipping company members');
    return [];
  }

  const company = companies[0]; // Since COMPANY_COUNT is 1, use the first company
  const newCompanyMembers: any[] = [];
  
  // Get existing company members to avoid duplicates
  const existingMembers = await client.companyMember.findMany({
    where: { companyId: company.id },
    select: { userId: true },
  });
  const existingUserIds = new Set(existingMembers.map((m: any) => m.userId));
  
  for (const user of allUsers) {
    // Skip if user is already a member of this company
    if (existingUserIds.has(user.id)) {
      continue;
    }
    
    // Determine role based on email
    let role = 'TECH';
    if (user.email === ADMIN_EMAIL) {
      role = 'OWNER';
    } else if (user.email === USER_EMAIL) {
      role = 'TECH';
    } else {
      role = faker.helpers.arrayElement(['OWNER', 'TECH']);
    }
    
    newCompanyMembers.push({
      role,
      companyId: company.id,
      userId: user.id,
    });
  }

  if (newCompanyMembers.length > 0) {
    await client.companyMember.createMany({
      data: newCompanyMembers,
      skipDuplicates: true,
    });
  }
  
  const totalMembers = await client.companyMember.count({
    where: { companyId: company.id },
  });
  console.log('✓ Seeded company members:', totalMembers);
  return newCompanyMembers;
}

// Seed Customers with Pools
async function seedCustomers(companies: any[]) {
  if (companies.length === 0) {
    console.log('⚠ No companies found, skipping customers');
    return { customers: [], pools: [] };
  }

  const allCustomers: any[] = [];
  const allPools: any[] = [];
  const company = companies[0]; // Use the first company

  // All customers in the same company share the same city/state
  const city = faker.location.city();
  const state = faker.location.state({ abbreviated: true });
  // Base coordinates for the city (all customers will be near this location)
  // Use US bounds to ensure markers appear on land (approx US center)
  const baseLat = parseFloat(faker.location.latitude({ min: 30, max: 45 }));
  const baseLng = parseFloat(faker.location.longitude({ min: -120, max: -75 }));

  for (let i = 0; i < CUSTOMERS_PER_COMPANY; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    // Generate lat/lng within a small radius of the base city coordinates
    // This keeps all customers geographically close (within ~10km radius)
    const latOffset = (Math.random() - 0.5) * 0.1; // ~10km variation
    const lngOffset = (Math.random() - 0.5) * 0.1;
    const lat = baseLat + latOffset;
    const lng = baseLng + lngOffset;

    const customer = await client.customer.create({
      data: {
        companyId: company.id,
        firstName,
        lastName,
        email: faker.datatype.boolean(0.8) ? faker.internet.email({ firstName, lastName }) : null,
        phone: faker.datatype.boolean(0.7) ? faker.phone.number() : null,
        addressStreet: faker.location.streetAddress(),
        addressCity: city,
        addressState: state,
        addressZip: faker.location.zipCode(),
        lat: lat,
        lng: lng,
        notes: faker.datatype.boolean(0.3) ? faker.lorem.sentence() : null,
        status: faker.helpers.arrayElement(['LEAD', 'ACTIVE', 'INACTIVE', 'LOST']),
      },
    });

    allCustomers.push(customer);

    // Create pools for each customer
    const poolCount = Math.floor(Math.random() * 3) + 1; // 1-3 pools per customer
    for (let j = 0; j < poolCount; j++) {
      const pool = await client.pool.create({
        data: {
          customerId: customer.id,
          name: j === 0 ? 'Main Pool' : `Pool ${j + 1}`,
          gallons: faker.datatype.boolean(0.7) ? faker.number.int({ min: 10000, max: 50000 }) : null,
          chemicalType: faker.helpers.arrayElement(['CHLORINE', 'BROMINE', 'SALT', 'OTHER']),
          baselinePressure: faker.datatype.boolean(0.6) ? parseFloat(faker.number.float({ min: 10, max: 30, fractionDigits: 1 }).toFixed(1)) : null,
          notes: faker.datatype.boolean(0.2) ? faker.lorem.sentence() : null,
        },
      });
      allPools.push(pool);
    }
  }

  console.log('✓ Seeded customers:', allCustomers.length);
  console.log('✓ Seeded pools:', allPools.length);
  return { customers: allCustomers, pools: allPools };
}

// Seed Routes
async function seedRoutes(pools: any[], company: any) {
  if (pools.length === 0) {
    console.log('⚠ No pools found, skipping routes');
    return [];
  }

  // Fetch all users that are members of this company to assign as techs
  const companyMembers = await client.companyMember.findMany({
    where: { companyId: company.id },
    select: { userId: true },
  });
  const techUserIds = companyMembers.map((cm: any) => cm.userId);

  const allRoutes: any[] = [];
  const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const frequencies = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'];

  // First pass: ensure every day of the week has at least one route
  // If we have fewer pools than days, we'll cycle through pools
  for (let dayIndex = 0; dayIndex < daysOfWeek.length; dayIndex++) {
    const dayOfWeek = daysOfWeek[dayIndex];
    // Cycle through pools if we have fewer pools than days
    const poolIndex = dayIndex % pools.length;
    const pool = pools[poolIndex];

    const startOn = faker.date.recent({ days: 30 });
    const techId = techUserIds.length > 0 && faker.datatype.boolean(0.8)
      ? techUserIds[Math.floor(Math.random() * techUserIds.length)]
      : null;

    const route = await client.route.create({
      data: {
        poolId: pool.id,
        techId: techId,
        dayOfWeek: dayOfWeek,
        frequency: faker.helpers.arrayElement(frequencies),
        startOn: startOn,
        stopAfter: faker.datatype.boolean(0.2) ? faker.date.future() : null,
        skipWeeks: faker.number.int({ min: 0, max: 4 }),
        weekOffset: faker.number.int({ min: 0, max: 3 }),
        skipWeekNumbers: faker.datatype.boolean(0.1)
          ? [faker.number.int({ min: 1, max: 52 })]
          : [],
        active: true, // Ensure routes covering all days are active
      },
    });
    allRoutes.push(route);
  }

  // Second pass: add additional routes for pools (random days)
  // This gives us more realistic distribution beyond the required daily coverage
  for (const pool of pools) {
    if (faker.datatype.boolean(0.85)) { // 85% chance to add a route
      const startOn = faker.date.recent({ days: 30 });
      const techId = techUserIds.length > 0 && faker.datatype.boolean(0.8)
        ? techUserIds[Math.floor(Math.random() * techUserIds.length)]
        : null;

      const route = await client.route.create({
        data: {
          poolId: pool.id,
          techId: techId,
          dayOfWeek: faker.helpers.arrayElement(daysOfWeek),
          frequency: faker.helpers.arrayElement(frequencies),
          startOn: startOn,
          stopAfter: faker.datatype.boolean(0.2) ? faker.date.future() : null,
          skipWeeks: faker.number.int({ min: 0, max: 4 }),
          weekOffset: faker.number.int({ min: 0, max: 3 }),
          skipWeekNumbers: faker.datatype.boolean(0.1)
            ? [faker.number.int({ min: 1, max: 52 })]
            : [],
          active: faker.datatype.boolean(0.9),
        },
      });
      allRoutes.push(route);
    }
  }

  console.log('✓ Seeded routes:', allRoutes.length);
  console.log('   (Each company has routes covering all days of the week)');
  return allRoutes;
}

// Seed Checklist Templates
async function seedChecklistTemplates(companies: any[]) {
  if (companies.length === 0) {
    console.log('⚠ No companies found, skipping checklist templates');
    return [];
  }

  const allTemplates: any[] = [];
  const company = companies[0];

  const commonChecklistItems = [
    { desc: 'Check pool water level', descCompleted: 'Water level is optimal' },
    { desc: 'Test chlorine levels', descCompleted: 'Chlorine levels tested' },
    { desc: 'Check pH balance', descCompleted: 'pH is balanced' },
    { desc: 'Inspect pool filter', descCompleted: 'Filter inspected' },
    { desc: 'Clean pool skimmer baskets', descCompleted: 'Skimmer baskets cleaned' },
    { desc: 'Check pool pump', descCompleted: 'Pump running normally' },
    { desc: 'Inspect pool equipment', descCompleted: 'Equipment inspected' },
    { desc: 'Clean pool deck area', descCompleted: 'Deck area cleaned' },
    { desc: 'Check pool heater', descCompleted: 'Heater operational' },
    { desc: 'Inspect pool lights', descCompleted: 'Lights working' },
  ];

  for (let i = 0; i < CHECKLIST_TEMPLATES_PER_COMPANY; i++) {
    const template = await client.checklistTemplate.create({
      data: {
        companyId: company.id,
        name: i === 0 ? 'Standard Service Checklist' : `Custom Checklist ${i}`,
        isActive: true,
        items: {
          create: Array.from({ length: CHECKLIST_ITEMS_PER_TEMPLATE }).map((_, idx) => {
            const item = commonChecklistItems[idx % commonChecklistItems.length];
            return {
              description: item.desc,
              descriptionWhenCompleted: faker.datatype.boolean(0.7) ? item.descCompleted : null,
              orderIndex: idx,
              required: faker.datatype.boolean(0.6), // 60% required
            };
          }),
        },
      },
      include: {
        items: true,
      },
    });
    allTemplates.push(template);
  }

  console.log('✓ Seeded checklist templates:', allTemplates.length);
  return allTemplates;
}

// Seed Reading Definitions
async function seedReadingDefinitions(companies: any[]) {
  if (companies.length === 0) {
    console.log('⚠ No companies found, skipping reading definitions');
    return [];
  }

  const allReadings: any[] = [];
  const company = companies[0];

  const commonReadings = [
    { name: 'Chlorine', unit: 'ppm', values: ['0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5'], defaultValue: '2' },
    { name: 'Free Chlorine', unit: 'ppm', values: ['0', '1', '2', '3', '4', '5'], defaultValue: '2.5' },
    { name: 'pH', unit: 'pH', values: ['6.8', '7.0', '7.2', '7.4', '7.6', '7.8', '8.0'], defaultValue: '7.4' },
    { name: 'Total Alkalinity', unit: 'ppm', values: ['60', '80', '100', '120', '140', '160', '180'], defaultValue: '120' },
    { name: 'Calcium Hardness', unit: 'ppm', values: ['150', '200', '250', '300', '350', '400'], defaultValue: '300' },
    { name: 'Cyanuric Acid', unit: 'ppm', values: ['0', '20', '30', '40', '50', '60', '70', '80'], defaultValue: '40' },
    { name: 'Salt Level', unit: 'ppm', values: ['2000', '2500', '3000', '3500', '4000', '4500'], defaultValue: '3000' },
    { name: 'Temperature', unit: '°F', values: [], defaultValue: '80' },
  ];

  const selectedReadings = faker.helpers.arrayElements(commonReadings, READING_DEFINITIONS_PER_COMPANY);

  for (let i = 0; i < selectedReadings.length; i++) {
    const reading = selectedReadings[i];
    const definition = await client.readingDefinition.create({
      data: {
        companyId: company.id,
        name: reading.name,
        unit: reading.unit,
        values: reading.values,
        defaultValue: reading.defaultValue,
        orderIndex: i,
      },
    });
    allReadings.push(definition);
  }

  console.log('✓ Seeded reading definitions:', allReadings.length);
  return allReadings;
}

// Seed Dosage Definitions
async function seedDosageDefinitions(companies: any[]) {
  if (companies.length === 0) {
    console.log('⚠ No companies found, skipping dosage definitions');
    return [];
  }

  const allDosages: any[] = [];
  const company = companies[0];

  const commonDosages = [
    { name: 'Chlorine Tablets', unit: 'tablets', dosageType: 'chlorine', cost: 2.50, values: ['1', '2', '3', '4', '5'], defaultValue: '2' },
    { name: 'Chlorine Shock', unit: 'lbs', dosageType: 'chlorine', cost: 15.00, values: ['0.5', '1', '1.5', '2', '2.5'], defaultValue: '1' },
    { name: 'pH Increaser', unit: 'lbs', dosageType: 'pH', cost: 8.00, values: ['0.5', '1', '1.5', '2'], defaultValue: '1' },
    { name: 'pH Decreaser', unit: 'lbs', dosageType: 'pH', cost: 8.00, values: ['0.5', '1', '1.5', '2'], defaultValue: '0.5' },
    { name: 'Alkalinity Increaser', unit: 'lbs', dosageType: 'alkalinity', cost: 10.00, values: ['1', '2', '3', '4', '5'], defaultValue: '2' },
    { name: 'Calcium Hardness Increaser', unit: 'lbs', dosageType: 'calcium', cost: 12.00, values: ['2', '4', '6', '8', '10'], defaultValue: '4' },
    { name: 'Stabilizer', unit: 'lbs', dosageType: 'stabilizer', cost: 20.00, values: ['1', '2', '3', '4'], defaultValue: '2' },
    { name: 'Algaecide', unit: 'oz', dosageType: 'algaecide', cost: 25.00, values: ['8', '16', '24', '32'], defaultValue: '16' },
  ];

  const selectedDosages = faker.helpers.arrayElements(commonDosages, DOSAGE_DEFINITIONS_PER_COMPANY);

  for (let i = 0; i < selectedDosages.length; i++) {
    const dosage = selectedDosages[i];
    const definition = await client.dosageDefinition.create({
      data: {
        companyId: company.id,
        name: dosage.name,
        unit: dosage.unit,
        dosageType: dosage.dosageType,
        cost: dosage.cost,
        values: dosage.values,
        defaultValue: dosage.defaultValue,
        orderIndex: i,
      },
    });
    allDosages.push(definition);
  }

  console.log('✓ Seeded dosage definitions:', allDosages.length);
  return allDosages;
}

// Main seed function
async function init() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Seed basic data
    const users = await seedUsers();
    const companies = await seedCompanies();
    
    if (companies.length === 0) {
      throw new Error('No companies were created. Cannot proceed with seeding.');
    }
    
    await seedCompanyMembers(companies);

    // Seed pool service related data
    const { customers, pools } = await seedCustomers(companies);
    const routes = await seedRoutes(pools, companies[0]);

    // Seed configuration data
    await seedChecklistTemplates(companies);
    await seedReadingDefinitions(companies);
    await seedDosageDefinitions(companies);

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Companies: ${companies.length}`);
    console.log(`   - Customers: ${customers.length}`);
    console.log(`   - Pools: ${pools.length}`);
    console.log(`   - Routes: ${routes.length}`);
    console.log('\n🔗 How to connect users:');
    console.log('   1. All users are automatically connected to the company via CompanyMember');
    console.log(`   2. Login with: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (OWNER role)`);
    console.log(`   3. Login with: ${USER_EMAIL} / ${USER_PASSWORD} (TECH role)`);
    console.log('   4. Routes are assigned to tech users from company members');
    console.log('   5. All routes are associated with the company through pools');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await client.$disconnect();
    await pool.end();
  }
}

init().catch((e) => {
  console.error(e);
  process.exit(1);
});
