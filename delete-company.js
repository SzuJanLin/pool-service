const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jackson = require('@boxyhq/saml-jackson');
const readline = require('readline');
const { Svix } = require('svix');

const svix = process.env.SVIX_API_KEY
  ? new Svix(`${process.env.SVIX_API_KEY}`)
  : undefined;

const product = process.env.JACKSON_PRODUCT_ID || 'boxyhq';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const jacksonOpts = {
  externalUrl: `${process.env.APP_URL}`,
  samlPath: '/api/oauth/saml',
  oidcPath: '/api/oauth/oidc',
  samlAudience: 'https://saml.boxyhq.com',
  db: {
    engine: 'sql',
    type: 'postgres',
    url: `${process.env.DATABASE_URL}`,
  },
  idpDiscoveryPath: '/auth/sso/idp-select',
  idpEnabled: true,
  openid: {},
};

const jacksonOptions = {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.JACKSON_API_KEY}`,
  },
};

const useHostedJackson = process.env.JACKSON_URL ? true : false;

let jacksonInstance;

let dryRun = true;

init();

async function init() {
  if (process.argv.length < 3) {
    console.log(
      `
      Usage: 
        node delete-company.js [options] <companyId> [companyId]
        npm run delete-company -- [options] <companyId> [companyId]
        
      Options:
        --apply: Run the script to apply changes
        `
    );
    console.log(
      `
      Example: 
        node delete-company.js --apply 01850e43-d1e0-4b92-abe5-271b159ff99b
        npm run delete-company -- --apply 01850e43-d1e0-4b92-abe5-271b159ff99b
        `
    );
    process.exit(1);
  } else {
    if (!useHostedJackson) {
      console.log('Using embedded Jackson');
      jacksonInstance = await jackson.default(jacksonOpts);
    }
    let i = 2;
    if (process.argv.map((a) => a.toLowerCase()).includes('--apply')) {
      console.log('Running in apply mode');
      dryRun = false;
      i++;
    } else {
      console.log('Running in dry-run mode');
      dryRun = true;
    }
    for (i; i < process.argv.length; i++) {
      const companyId = process.argv[i];
      try {
        await displayDeletionArtifacts(companyId);

        if (!dryRun) {
          const confirmed = await askForConfirmation(companyId);
          if (confirmed) {
            await handleCompanyDeletion(companyId);
          }
        }
      } catch (error) {
        console.log('Error deleting company:', error?.message);
      }
    }
    await prisma.$disconnect();
    console.log('\nDisconnected from database');
    process.exit(0);
  }
}

async function displayDeletionArtifacts(companyId) {
  // Company Details
  const company = await getCompanyById(companyId);
  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }
  console.log('\nCompany Details:');
  printTable([company], ['id', 'name', 'billingId']);

  // SSO Connections
  const ssoConnections = await getSSOConnections({
    tenant: company.id,
    product,
  });
  if (ssoConnections.length > 0) {
    console.log('\nSSO Connections:');
    printTable(ssoConnections, ['product', 'tenant', 'clientID']);
  } else {
    console.log('\nNo SSO connections found');
  }

  // DSync Connections
  const dsyncConnections = await getConnections(company.id);
  if (dsyncConnections.length > 0) {
    console.log('\nDSync Connections:');
    printTable(dsyncConnections, ['id', 'type', 'name', 'product']);
  } else {
    console.log('\nNo DSync connections found');
  }

  if (company?.billingId) {
    // Active Subscriptions
    const activeSubscriptions = await getActiveSubscriptions(company);
    if (activeSubscriptions.length > 0) {
      console.log('\nActive Subscriptions:');
      printTable(activeSubscriptions, ['id', 'startDate', 'endDate']);
    } else {
      console.log('\nNo active subscriptions found');
    }

    // All subscriptions
    const subscriptions = await prisma.subscription.findMany({
      where: {
        customerId: company?.billingId,
      },
    });
    if (subscriptions.length > 0) {
      console.log('\nAll Subscriptions:');
      printTable(subscriptions, ['id', 'startDate', 'endDate', 'active']);
    } else {
      console.log('\nNo subscriptions found');
    }
  } else {
    console.log('\nNo billingId found');
  }

  // Company Members
  const companyMembers = await prisma.user.findMany({
    where: {
      companyMembers: {
        some: {
          companyId: company.id,
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
  for (let i = 0; i < companyMembers.length; i++) {
    const user = companyMembers[i];
    const userCompanies = await prisma.companyMember.findMany({
      where: {
        userId: user.id,
      },
    });
    companyMembers[i].companies = userCompanies.length;
    companyMembers[i].action = userCompanies.length > 1 ? 'Remove' : 'Delete';
  }
  console.log('\nCompany Members:');
  printTable(companyMembers, ['id', 'email', 'name', 'companies', 'action']);

  const apiKeys = await prisma.apiKey.findMany({ where: { companyId: company.id } });
  if (apiKeys.length > 0) {
    console.log('\nAPI Keys:');
    printTable(apiKeys, ['id', 'name']);
  } else {
    console.log('\nNo API keys found');
  }

  const invitations = await prisma.invitation.findMany({
    where: { companyId: company.id },
  });
  if (invitations.length > 0) {
    console.log('\nInvitations:');
    printTable(invitations, ['id', 'email', 'role']);
  } else {
    console.log('\nNo invitations found');
  }

  if (svix) {
    console.log('\nChecking Svix application');
    const application = await getSvixApplication(company.id);
    if (!application) {
      console.log('No Svix application found');
    } else {
      printTable([application], ['id', 'name', 'uid']);
      const webhooks = await svix.endpoint.list(application.id);
      if (webhooks?.data?.length) {
        console.log('\nSvix Webhooks:');
        printTable(webhooks.data, ['id', 'filterTypes', 'url']);
      } else {
        console.log('\nNo webhooks found');
      }
    }
  }
}

async function handleCompanyDeletion(companyId) {
  console.log(`\nChecking company: ${companyId}`);
  let company = await getCompanyById(companyId);
  if (!company) {
    console.log(`Company not found: ${companyId}`);
    return;
  } else {
    console.log('Company found:', company.name);
    if (company?.billingId) {
      console.log('\nChecking active company subscriptions');
      const activeSubscriptions = await getActiveSubscriptions(company);
      if (activeSubscriptions.length > 0) {
        console.log(
          `${activeSubscriptions.length} Active subscriptions found. Please cancel them before deleting the company.`
        );
        printTable(activeSubscriptions, ['id', 'startDate', 'endDate']);
        return;
      } else {
        console.log('No active subscriptions found');
      }
    }
    await removeDSyncConnections(company);
    await removeSSOConnections(company);
    await removeCompanySubscriptions(company);
    await removeCompanyMembers(company);

    await removeSvixApplication(company.id);

    await removeCompany(company);
  }
}

async function getCompanyById(companyId) {
  return await prisma.company.findUnique({
    where: {
      id: companyId,
    },
  });
}

async function removeCompany(company) {
  console.log('\nDeleting company:', company.id);
  await prisma.company.delete({
    where: {
      id: company.id,
    },
  });
  console.log('Company deleted:', company.name);
}

async function removeSSOConnections(company) {
  const params = {
    tenant: company.id,
    product,
  };
  if (useHostedJackson) {
    const ssoUrl = `${process.env.JACKSON_URL}/api/v1/sso`;
    const query = new URLSearchParams(params);

    const response = await fetch(`${ssoUrl}?${query}`, {
      ...jacksonOptions,
      method: 'DELETE',
    });
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error.message);
    }
  } else {
    const { apiController } = jacksonInstance;

    await apiController.deleteConnections(params);
  }
}

async function getSSOConnections(params) {
  if (useHostedJackson) {
    const ssoUrl = `${process.env.JACKSON_URL}/api/v1/sso`;
    const query = new URLSearchParams(params);

    const response = await fetch(`${ssoUrl}?${query}`, {
      ...jacksonOptions,
    });
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error.message);
    }
    const data = await response.json();
    return data;
  } else {
    const { apiController } = jacksonInstance;

    return await apiController.getConnections(params);
  }
}

async function removeDSyncConnections(company) {
  console.log(`\nChecking company DSync connections`);
  const connections = await getConnections(company.id);
  console.log(`Found ${connections.length} DSync connections`);
  for (const connection of connections) {
    console.log('\nDeleting DSync connection:', connection.id);
    await deleteConnection(connection.id);
    console.log('DSync connection deleted:', connection.id);
  }
  console.log(`\nDone removing company DSync connections`);
}

async function removeCompanySubscriptions(company) {
  console.log('\nDeleting company subscriptions');
  if (company?.billingId) {
    await prisma.subscription.deleteMany({
      where: {
        customerId: company?.billingId,
      },
    });
  }
  console.log('Company subscriptions deleted');
}

async function getActiveSubscriptions(company) {
  return await prisma.subscription.findMany({
    where: {
      customerId: company?.billingId,
      active: true,
      endDate: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      customerId: true,
      startDate: true,
      endDate: true,
      priceId: true,
    },
  });
}

async function removeCompanyMembers(company) {
  console.log('\nChecking company members');

  const companyMembers = await prisma.user.findMany({
    where: {
      companyMembers: {
        some: {
          companyId: company.id,
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
  console.log(`Found ${companyMembers.length} company members`);
  printTable(companyMembers);

  for (const user of companyMembers) {
    await checkAndRemoveUser(user, company);
  }
}

async function checkAndRemoveUser(user, company) {
  console.log('\nChecking user:', user.id);
  const userCompanies = await prisma.companyMember.findMany({
    where: {
      userId: user.id,
    },
  });
  console.log(`User belongs to ${userCompanies.length} companies`);
  if (userCompanies.length === 1) {
    console.log('Deleting user:', user.email);
    await prisma.user.delete({
      where: {
        id: user.id,
      },
    });
    console.log('User deleted:', user.email);
  } else {
    console.log('Removing user from company:', company.name);
    await prisma.companyMember.deleteMany({
      where: {
        userId: user.id,
        companyId: company.id,
      },
    });
    console.log('User removed from company:', company.name);
  }
}

async function getConnections(tenant) {
  if (useHostedJackson) {
    const searchParams = new URLSearchParams({
      tenant: tenant,
      product,
    });

    const response = await fetch(
      `${process.env.JACKSON_URL}/api/v1/dsync?${searchParams}`,
      {
        ...jacksonOptions,
      }
    );

    const { data, error } = await response.json();

    if (!response.ok) {
      throw new Error(error.message);
    }

    return data;
  } else {
    const { directorySyncController } = jacksonInstance;

    const { data, error } =
      await directorySyncController.directories.getByTenantAndProduct(
        tenant,
        product
      );

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}

async function deleteConnection(directoryId) {
  if (useHostedJackson) {
    const response = await fetch(
      `${process.env.JACKSON_URL}/api/v1/dsync/${directoryId}`,
      {
        ...jacksonOptions,
        method: 'DELETE',
      }
    );

    const { data, error } = await response.json();

    if (!response.ok) {
      throw new Error(error.message);
    }

    return { data };
  } else {
    const { directorySyncController } = jacksonInstance;

    const { data, error } =
      await directorySyncController.directories.delete(directoryId);

    if (error) {
      throw new Error(error.message);
    }

    return { data };
  }
}

async function getSvixApplication(companyId) {
  try {
    const application = await svix.application.get(companyId);
    return application;
  } catch (ex) {
    console.log(
      'Error getting application:',
      ex?.code === 404 ? 'Not found' : ex
    );
  }
}

async function removeSvixApplication(companyId) {
  if (!svix) {
    return;
  }
  console.log('\nDeleting Svix application:', companyId);
  try {
    await svix.application.delete(companyId);
  } catch (ex) {
    console.log(
      'Error deleting application:',
      ex?.code === 404 ? 'Not found' : ex
    );
  }
  console.log('Svix application deleted:', companyId);
}

async function askForConfirmation(companyId) {
  return new Promise((resolve) => {
    rl.question(
      `Are you sure you want to delete company ${companyId}? (yes/no): `,
      (answer) => {
        if (answer.toLowerCase() === 'yes') {
          resolve(true);
        } else {
          console.log('Deletion canceled.');
          resolve(false);
        }
        rl.close();
      }
    );
  });
}

function printTable(data, columns) {
  const final = {};
  data.forEach((ele, index) => {
    final[index + 1] = ele;
  });
  console.table(final, columns);
}

// handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
