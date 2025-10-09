import fetcher from '@/lib/fetcher';
import type { Company } from '@prisma/client';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import type { ApiResponse } from 'types';

const useCompany = (slug?: string) => {
  const { query, isReady } = useRouter();

  const companySlug = slug || (isReady ? query.slug : null);

  const { data, error, isLoading } = useSWR<ApiResponse<Company>>(
    companySlug ? `/api/companies/${companySlug}` : null,
    fetcher
  );

  return {
    isLoading,
    isError: error,
    company: data?.data,
  };
};

export default useCompany;
