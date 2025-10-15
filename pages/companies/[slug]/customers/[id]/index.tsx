import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import useCompany from 'hooks/useCompany';
import { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import type { ApiResponse } from 'types';
import type { Customer } from '@prisma/client';
import fetcher from '@/lib/fetcher';
import Profile from '@/components/customers/details/Profile';
import { useState } from 'react';
import classNames from 'classnames';

const CustomerDetails: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { slug, id } = router.query;
  const { isLoading: companyLoading, isError: companyError, company } = useCompany();
  const [activeTab, setActiveTab] = useState('profile');
  // Fetch the specific customer
  const { data: customerData, error: customerError, isLoading: customerLoading, mutate: mutateCustomer } = useSWR<ApiResponse<Customer>>(
    company && id ? `/api/companies/${slug}/customers/${id}` : null,
    fetcher
  );

  const handleSaveSuccess = () => {
    mutateCustomer(); // Refresh the customer data
  };

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
    <div className="w-[70%]">
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
            {customerData.data.firstName} {customerData.data.lastName}
          </span>
        </div>
      </div>
      <nav className="flex flex-wrap border-b border-gray-300" aria-label="Tabs">
  <button
    onClick={() => setActiveTab('profile')}
  
        className={classNames(
            'inline-flex items-center border-b-2 py-2 md-py-4 mr-5 text-sm font-medium',
            activeTab === 'profile'
              ? 'border-gray-900 text-gray-700 dark:text-gray-100'
              : 'border-transparent text-gray-500 hover:border-gray-300  hover:text-gray-700 hover:dark:text-gray-100'
          )}
  >
    {t('profile')}
  </button>
  <button
    onClick={() => setActiveTab('route')}
    className={classNames(
      'inline-flex items-center border-b-2 py-2 md-py-4 mr-5 text-sm font-medium',
      activeTab === 'route' 
        ? 'border-gray-900 text-gray-700 dark:text-gray-100' 
        : 'border-transparent text-gray-500 hover:border-gray-300  hover:text-gray-700 hover:dark:text-gray-100'
    )}
  >
    {t('route')}
  </button>
  <button
    onClick={() => setActiveTab('pool')}
    className={classNames(
      'inline-flex items-center border-b-2 py-2 md-py-4 mr-5 text-sm font-medium',
      activeTab === 'pool' 
        ? 'border-gray-900 text-gray-700 dark:text-gray-100' 
        : 'border-transparent text-gray-500 hover:border-gray-300  hover:text-gray-700 hover:dark:text-gray-100'
    )}
  >
    {t('pool')}
  </button>
  <button
    onClick={() => setActiveTab('photos')}
    className={classNames(
      'inline-flex items-center border-b-2 py-2 md-py-4 mr-5 text-sm font-medium',
      activeTab === 'photos' 
        ? 'border-gray-900 text-gray-700 dark:text-gray-100' 
        : 'border-transparent text-gray-500 hover:border-gray-300  hover:text-gray-700 hover:dark:text-gray-100'
    )}
  >
    {t('photos')}
  </button>
</nav>

{/* Conditionally render sections based on active tab */}
{activeTab === 'profile' && (
  <Profile 
    customer={customerData.data}
    company={company}
    onSaveSuccess={handleSaveSuccess}
  />
)}
{activeTab === 'pool' && (
//   <ServicesSection customer={customerData.data} />
<div>Pool</div>
)}
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

export default CustomerDetails;
