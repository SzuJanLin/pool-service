import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { NextPageWithLayout } from 'types';
import { useTranslation } from 'next-i18next';
import CustomerPagination from '@/components/customers/CustomerPagination';
import useCompany from 'hooks/useCompany';
import { Error, Loading } from '@/components/shared';
import { Button } from 'react-daisyui';
import Link from 'next/link';

const Customers: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const { isLoading, isError, company } = useCompany();

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return <Error message={isError.message} />;
  }

  if (!company) {
    return <Error message={t('company-not-found')} />;
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-3">
          <h2 className="text-xl font-medium leading-none tracking-tight">
            {t('customers')}
          </h2>
        </div>
        <Link href={`/companies/${company.slug}/customers/add`}>
          <Button color="primary" size="md">
            {t('add-customer')}
          </Button>
        </Link>
      </div>

      <CustomerPagination company={company} />
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

export default Customers;
