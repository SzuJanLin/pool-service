import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import useCompany from 'hooks/useCompany';
import { NextPageWithLayout } from 'types';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import CreateCustomer from '@/components/customers/CreateCustomer';

const AddCustomer: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const { isLoading, isError, company } = useCompany();
  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (isError) {
    return <div>Error: {isError.message}</div>;
  }
  if (!company) {
    return <div>Company not found</div>;
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
            {t('add-customer')}
          </span>
        </div>
      </div>
      <CreateCustomer company={company} />
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
  

export default AddCustomer;
