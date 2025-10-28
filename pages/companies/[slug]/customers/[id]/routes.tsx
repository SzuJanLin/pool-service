import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import useCompany from 'hooks/useCompany';
import { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import type { ApiResponse } from 'types';
import type { User } from '@prisma/client';
import type { CustomerWithPoolsAndRoutes } from 'models/customer';
import fetcher from '@/lib/fetcher';
import CustomerTab from '@/components/customers/CustomerTab';
import RoutesComponent from '@/components/customers/route/Routes';

const CustomerRoutes: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { slug, id } = router.query;
  const { isLoading: companyLoading, isError: companyError, company } = useCompany();
  
  // Fetch technicians for the company
  const { data: techniciansData } = useSWR<ApiResponse<User[]>>(
    company ? `/api/companies/${slug}/members` : null,
    fetcher
  );
  
  // Fetch the specific customer
  const { data: customerData, error: customerError, isLoading: customerLoading, mutate: mutateCustomer } = useSWR<ApiResponse<CustomerWithPoolsAndRoutes>>(
    company && id ? `/api/companies/${slug}/customers/${id}` : null,
    fetcher
  );

  const handleSaveSuccess = () => {
    mutateCustomer();
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
        activeTab="routes" 
        customer={customerData.data}
        companySlug={company.slug as string}
      />

      <RoutesComponent 
        customer={customerData.data} 
        technicians={techniciansData?.data || []}
        company={company}
        onRouteAdded={handleSaveSuccess}
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

export default CustomerRoutes;

