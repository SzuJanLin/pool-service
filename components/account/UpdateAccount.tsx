import type { User } from '@prisma/client';
import UploadAvatar from './UploadAvatar';
import UpdateName from './UpdateName';
import UpdateEmail from './UpdateEmail';
import UpdateTheme from './UpdateTheme';
import env from '@/lib/env';
import UpdatePassword from './UpdatePassword';

interface UpdateAccountProps {
  user: Partial<User>;
  allowEmailChange: boolean;
}

const UpdateAccount = ({ user, allowEmailChange }: UpdateAccountProps) => {
  return (
    <div className="flex gap-6 flex-col">
      <UpdateName user={user} />
      <UpdateEmail user={user} allowEmailChange={allowEmailChange} />
      <UploadAvatar user={user} />
      {env.darkModeEnabled && <UpdateTheme />}
      <UpdatePassword />
    </div>
  );
};

export default UpdateAccount;
