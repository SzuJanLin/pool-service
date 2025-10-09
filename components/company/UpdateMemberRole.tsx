import { defaultHeaders } from '@/lib/common';
import { availableRoles } from '@/lib/permissions';
import { Company, CompanyMember } from '@prisma/client';
import { useTranslation } from 'next-i18next';
import toast from 'react-hot-toast';
import type { ApiResponse } from 'types';

interface UpdateMemberRoleProps {
  company: Company;
  member: CompanyMember;
}

const UpdateMemberRole = ({ company, member }: UpdateMemberRoleProps) => {
  const { t } = useTranslation('common');

  const updateRole = async (member: CompanyMember, role: string) => {
    const response = await fetch(`/api/companies/${company.slug}/members`, {
      method: 'PATCH',
      headers: defaultHeaders,
      body: JSON.stringify({
        memberId: member.userId,
        role,
      }),
    });

    const json = (await response.json()) as ApiResponse;

    if (!response.ok) {
      toast.error(json.error.message);
      return;
    }

    toast.success(t('member-role-updated'));
  };

  return (
    <select
      className="select select-bordered select-sm rounded"
      defaultValue={member.role}
      onChange={(e) => updateRole(member, e.target.value)}
    >
      {availableRoles.map((role) => (
        <option value={role.id} key={role.id}>
          {role.id}
        </option>
      ))}
    </select>
  );
};

export default UpdateMemberRole;
