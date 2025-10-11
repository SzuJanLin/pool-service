import { Error, LetterAvatar, Loading } from '@/components/shared';
import { Company, CompanyMember } from '@prisma/client';
import useCanAccess from 'hooks/useCanAccess';
import useCompanyMembers, { CompanyMemberWithUser } from 'hooks/useCompanyMembers';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { Button } from 'react-daisyui';
import toast from 'react-hot-toast';

import { InviteMember } from '@/components/invitation';
import UpdateMemberRole from './UpdateMemberRole';
import { defaultHeaders } from '@/lib/common';
import type { ApiResponse } from 'types';
import ConfirmationDialog from '../shared/ConfirmationDialog';
import { useState } from 'react';
import { Table } from '@/components/shared/table/Table';

const Members = ({ company }: { company: Company }) => {
  const { data: session } = useSession();
  const { t } = useTranslation('common');
  const { canAccess } = useCanAccess();
  const [visible, setVisible] = useState(false);
  const [selectedMember, setSelectedMember] =
    useState<CompanyMemberWithUser | null>(null);
  const [confirmationDialogVisible, setConfirmationDialogVisible] =
    useState(false);

  const { isLoading, isError, members, mutateCompanyMembers } = useCompanyMembers(
    company.slug
  );

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return <Error message={isError.message} />;
  }

  if (!members) {
    return null;
  }

  const removeCompanyMember = async (member: CompanyMember | null) => {
    if (!member) {
      return;
    }

    const sp = new URLSearchParams({ memberId: member.userId });

    const response = await fetch(
      `/api/companies/${company.slug}/members?${sp.toString()}`,
      {
        method: 'DELETE',
        headers: defaultHeaders,
      }
    );

    const json = (await response.json()) as ApiResponse;

    if (!response.ok) {
      toast.error(json.error.message);
      return;
    }

    mutateCompanyMembers();
    toast.success(t('member-deleted'));
  };

  const canUpdateRole = (member: CompanyMember) => {
    return (
      session?.user.id != member.userId && canAccess('company_member', ['update'])
    );
  };

  const canRemoveMember = (member: CompanyMember) => {
    return (
      session?.user.id != member.userId && canAccess('company_member', ['delete'])
    );
  };

  const cols = [t('name'), t('email'), t('role')];
  if (canAccess('company_member', ['delete'])) {
    cols.push(t('actions'));
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="space-y-3">
          <h2 className="text-xl font-medium leading-none tracking-tight">
            {t('members')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('members-description')}
          </p>
        </div>
        {canAccess('company_invitation', ['create']) && (
          <Button color="primary" size="md" onClick={() => setVisible(!visible)}>
            {t('add-member')}
          </Button>
        )}
      </div>

      <Table
        cols={cols}
        body={members.map((member) => {
          return {
            id: member.id,
            cells: [
              {
                wrap: true,
                element: (
                  <div className="flex items-center justify-start space-x-2">
                    <LetterAvatar name={member.user.name} />
                    <span>{member.user.name}</span>
                  </div>
                ),
                minWidth: 200,
              },
              { wrap: true, text: member.user.email, minWidth: 250 },
              {
                element: canUpdateRole(member) ? (
                  <UpdateMemberRole company={company} member={member} />
                ) : (
                  <span>{member.role}</span>
                ),
              },
              {
                buttons: canRemoveMember(member)
                  ? [
                      {
                        color: 'error',
                        text: t('remove'),
                        onClick: () => {
                          setSelectedMember(member);
                          setConfirmationDialogVisible(true);
                        },
                      },
                    ]
                  : [],
              },
            ],
          };
        })}
      ></Table>

      <ConfirmationDialog
        visible={confirmationDialogVisible}
        onCancel={() => setConfirmationDialogVisible(false)}
        onConfirm={() => removeCompanyMember(selectedMember)}
        title={t('confirm-delete-member')}
      >
        {t('delete-member-warning', {
          name: selectedMember?.user.name,
          email: selectedMember?.user.email,
        })}
      </ConfirmationDialog>
      <InviteMember visible={visible} setVisible={setVisible} company={company} />
    </div>
  );
};

export default Members;
