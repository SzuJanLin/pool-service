import fetcher from '@/lib/fetcher';
import type { Customer } from '@prisma/client';
import useSWR, { mutate } from 'swr';

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface CustomersResponse {
  data?: Customer[];
  pagination?: PaginationInfo;
}

const useCustomers = (
  slug: string,
  page: number = 1,
  pageSize: number = 10,
  search: string = ''
) => {
  const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
  const url = `/api/companies/${slug}/customers?page=${page}&pageSize=${pageSize}${searchParam}`;

  const { data, error, isLoading } = useSWR<CustomersResponse>(
    url,
    fetcher
  );

  const mutateCustomers = async () => {
    // Mutate all customer pages
    mutate((key) => typeof key === 'string' && key.startsWith(`/api/companies/${slug}/customers`));
  };

  return {
    isLoading,
    isError: error,
    customers: data?.data,
    pagination: data?.pagination,
    mutateCustomers,
  };
};

export default useCustomers;

