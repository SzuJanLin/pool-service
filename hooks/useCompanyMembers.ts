import fetcher from '@/lib/fetcher';
import type { CompanyMember, User } from '@prisma/client';
import useSWR, { mutate } from 'swr';
import type { ApiResponse } from 'types';

export type CompanyMemberWithUser = CompanyMember & { user: User };

const useCompanyMembers = (slug: string) => {
  const url = `/api/companies/${slug}/members`;

  const { data, error, isLoading } = useSWR<ApiResponse<CompanyMemberWithUser[]>>(
    url,
    fetcher
  );

  const mutateCompanyMembers = async () => {
    mutate(url);
  };

  return {
    isLoading,
    isError: error,
    members: data?.data,
    mutateCompanyMembers,
  };
};

export default useCompanyMembers;
