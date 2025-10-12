import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { NextPageWithLayout } from 'types';
import { useTranslation } from 'next-i18next';
import CustomerPagination from '@/components/customers/CustomerPagination';
import useCompany from 'hooks/useCompany';
import { Error, Loading } from '@/components/shared';

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
    <div>
      <div className="flex justify-between items-center">
        <div className="space-y-3">
          <h2 className="text-xl font-medium leading-none tracking-tight">
            {t('customers')}
          </h2>
        </div>
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
