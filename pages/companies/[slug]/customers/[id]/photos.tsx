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
import PhotosComponent from '@/components/customers/photos/PhotosComponent';

const CustomerPhotos: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { slug, id } = router.query;
  const { isLoading: companyLoading, isError: companyError, company } = useCompany();
  
  // Fetch the specific customer
  const { data: customerData, error: customerError, isLoading: customerLoading } = useSWR<ApiResponse<CustomerWithPoolsAndRoutes>>(
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
        activeTab="photos" 
        customer={customerData.data}
        companySlug={company.slug as string}
      />

      <PhotosComponent 
        companySlug={company.slug as string} 
        customerId={customerData.data.id as string} 
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

export default CustomerPhotos;

