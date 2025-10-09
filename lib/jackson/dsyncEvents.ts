import { DirectorySyncEvent } from '@boxyhq/saml-jackson';
import { Role } from '@prisma/client';
import { addCompanyMember, removeCompanyMember } from 'models/company';
import { deleteUser, getUser, updateUser, upsertUser } from 'models/user';
import { countCompanyMembers } from 'models/companyMember';

// Handle SCIM events
export const handleEvents = async (event: DirectorySyncEvent) => {
  const { event: action, tenant: companyId, data } = event;

  // Currently we only handle the user events
  // TODO: Handle group events
  if (!('email' in data)) {
    return;
  }

  const { email, first_name, last_name, active } = data;
  const name = `${first_name} ${last_name}`;

  // User has been added
  if (action === 'user.created') {
    const user = await upsertUser({
      where: {
        email,
      },
      update: {
        name,
      },
      create: {
        email,
        name,
      },
    });

    await addCompanyMember(companyId, user.id, Role.MEMBER);
  }

  // User has been updated
  else if (action === 'user.updated') {
    const user = await getUser({ email });

    if (!user) {
      return;
    }

    // Deactivation of user by removing them from the company
    if (active === false) {
      await removeCompanyMember(companyId, user.id);

      const otherCompaniesCount = await countCompanyMembers({
        where: {
          userId: user.id,
        },
      });

      if (otherCompaniesCount === 0) {
        await deleteUser({ email: user.email });
      }

      return;
    }

    await updateUser({
      where: {
        email,
      },
      data: {
        name,
      },
    });

    // Reactivation of user by adding them back to the company
    await addCompanyMember(companyId, user.id, Role.MEMBER);
  }

  // User has been removed
  else if (action === 'user.deleted') {
    const user = await getUser({ email });

    if (!user) {
      return;
    }

    await removeCompanyMember(companyId, user.id);

    const otherCompaniesCount = await countCompanyMembers({
      where: {
        userId: user.id,
      },
    });

    if (otherCompaniesCount === 0) {
      await deleteUser({ email: user.email });
    }
  }
};
