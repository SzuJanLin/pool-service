import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import useCompany from 'hooks/useCompany';
import { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import type { ApiResponse } from 'types';
import type { CustomerWithPoolsAndRoutes } from 'models/customer';
import fetcher from '@/lib/fetcher';
import CustomerTab from '@/components/customers/CustomerTab';
import PoolComponent from '@/components/customers/details/Pool';
import { useState } from 'react';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import Modal from '@/components/shared/Modal';
import AddPool from '@/components/customers/details/pool/AddPool';

const CustomerPools: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { slug, id } = router.query;
  const { isLoading: companyLoading, isError: companyError, company } = useCompany();
  const [showAddPoolModal, setShowAddPoolModal] = useState(false);
  
  // Fetch the specific customer
  const { data: customerData, error: customerError, isLoading: customerLoading, mutate: mutateCustomer } = useSWR<ApiResponse<CustomerWithPoolsAndRoutes>>(
    company && id ? `/api/companies/${slug}/customers/${id}` : null,
    fetcher
  );


  if (companyLoading || customerLoading) {
    return <div>Loading...</div>;
  }

  if (companyError || customerError) {
    return <div>Error loading data</div>;
  }

  if (!company || !customerData?.data) {
    return <div>Not found</div>;
  }

  return (
    <div className="w-[70%]">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-nowrap items-center space-x-2">
          <Link
            href={`/companies/${company.slug}/customers`}
            className="text-xl text-primary hover:underline font-medium"
          >
            {t('customers')}
          </Link>
        </div>
      </div>

      <CustomerTab 
        activeTab="pools" 
        customer={customerData.data}
        companySlug={company.slug as string}
      />

      <div className="mt-4">
        <button 
          onClick={() => setShowAddPoolModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none"
        >
          <PlusCircleIcon className="w-5 h-5 mr-2" />
          {t('add-pool')}
        </button>
      </div>

      <PoolComponent customer={customerData.data} />

      {/* Add Pool Modal */}
      <Modal open={showAddPoolModal} close={() => setShowAddPoolModal(false)}>
        <Modal.Header>{t('add-pool')}</Modal.Header>
        <Modal.Description>{t('add-new-pool-description')}</Modal.Description>
        <Modal.Body>
          <AddPool
            company={company}
            customer={customerData.data}
            onSuccess={() => {
              setShowAddPoolModal(false);
              mutateCustomer();
            }}
            onCancel={() => setShowAddPoolModal(false)}
          />
        </Modal.Body>
      </Modal>
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

export default CustomerPools;

