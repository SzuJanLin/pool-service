import fetcher from '@/lib/fetcher';
import useSWR, { mutate } from 'swr';
import type { ApiResponse, CompanyWithMemberCount } from 'types';

const useCompanies = () => {
  const url = `/api/companies`;

  const { data, error, isLoading } = useSWR<ApiResponse<CompanyWithMemberCount[]>>(
    url,
    fetcher
  );

  const mutateCompanies = async () => {
    mutate(url);
  };

  return {
    isLoading,
    isError: error,
    companies: data?.data,
    mutateCompanies,
  };
};

export default useCompanies;
