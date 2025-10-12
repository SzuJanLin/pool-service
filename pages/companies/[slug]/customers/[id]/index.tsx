import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import useCompany from 'hooks/useCompany';
import { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import CreateCustomer from '@/components/customers/CreateCustomer';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import type { ApiResponse } from 'types';
import type { Customer } from '@prisma/client';
import fetcher from '@/lib/fetcher';

const EditCustomer: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { slug, id } = router.query;
  const { isLoading: companyLoading, isError: companyError, company } = useCompany();

  // Fetch the specific customer
  const { data: customerData, error: customerError, isLoading: customerLoading } = useSWR<ApiResponse<Customer>>(
    company && id ? `/api/companies/${slug}/customers/${id}` : null,
    fetcher
  );

  if (companyLoading || customerLoading) {
    return <div>Loading...</div>;
  }

  if (companyError) {
    return <div>Error: {companyError.message}</div>;
  }

  if (customerError) {
    return <div>Error: {customerError.message}</div>;
  }

  if (!company) {
    return <div>Company not found</div>;
  }

  if (!customerData?.data) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-nowrap items-center space-x-2">
          <Link
            href={`/companies/${company.slug}/customers`}
            className="text-xl text-primary hover:underline font-medium"
          >
            {t('customers')}
          </Link>
          <span className="text-gray-500">/</span>
          <span className="text-xl font-medium leading-none tracking-tight">
            {t('edit-customer')}
          </span>
        </div>
      </div>
      <CreateCustomer company={company} customer={customerData.data} />
    </div>
  );
};

export async function getServerSideProps({
  locale,
}: GetServerSidePropsContext) {
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
}

export default EditCustomer;
