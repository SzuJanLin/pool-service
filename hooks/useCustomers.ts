import fetcher from '@/lib/fetcher';
import type { Customer } from '@prisma/client';
import useSWR, { mutate } from 'swr';
import type { ApiResponse } from 'types';

const useCustomers = (slug: string) => {
  const url = `/api/companies/${slug}/customers`;

  const { data, error, isLoading } = useSWR<ApiResponse<Customer[]>>(
    url,
    fetcher
  );

  const mutateCustomers = async () => {
    mutate(url);
  };

  return {
    isLoading,
    isError: error,
    customers: data?.data,
    mutateCustomers,
  };
};

export default useCustomers;

