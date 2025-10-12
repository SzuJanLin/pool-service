import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { NextPageWithLayout } from 'types';
import { useTranslation } from 'next-i18next';
import CustomerPagination from '@/components/customers/CustomerPagination';
import AddCustomer from '@/components/customers/AddCustomer';
import useCompany from 'hooks/useCompany';
import { Error, Loading } from '@/components/shared';
import { Button } from 'react-daisyui';
import { useState } from 'react';

const Customers: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const { isLoading, isError, company } = useCompany();
  const [addCustomerVisible, setAddCustomerVisible] = useState(false);

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
        <Button color="primary" size="md" onClick={() => setAddCustomerVisible(true)}>
          {t('add-customer')}
        </Button>
      </div>

      <CustomerPagination company={company} />
      
      <AddCustomer 
        visible={addCustomerVisible} 
        setVisible={setAddCustomerVisible} 
        company={company} 
      />
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
