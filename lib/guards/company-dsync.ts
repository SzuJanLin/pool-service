import { ApiError } from '../errors';
import { dsyncManager } from '@/lib/jackson/dsync/index';

type GuardOptions = {
  companyId: string;
  directoryId: string;
};

// Throw if the user is not allowed to access given Directory connection.
export const throwIfNoAccessToDirectory = async ({
  companyId,
  directoryId,
}: GuardOptions) => {
  if (!directoryId) {
    return;
  }

  const dsync = dsyncManager();

  const { data: connection } = await dsync.getConnectionById(directoryId);

  if (connection.tenant === companyId) {
    return;
  }

  throw new ApiError(
    403,
    `Forbidden. You don't have access to this directory connection.`
  );
};
