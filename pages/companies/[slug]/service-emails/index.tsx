import { Error, Loading } from '@/components/shared';
import { CompanyTab, ServiceEmailSettings } from '@/components/company';
import env from '@/lib/env';
import useCompany from 'hooks/useCompany';
import type { GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { CompanyFeature } from 'types';

const ServiceEmailsPage = ({ companyFeatures }: { companyFeatures: CompanyFeature }) => {
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
    <>
      <CompanyTab activeTab="service-emails" company={company} companyFeatures={companyFeatures} />
      <div className="max-w-4xl mx-auto">
        <ServiceEmailSettings company={company} />
      </div>
    </>
  );
};

export async function getServerSideProps({
  locale,
}: GetServerSidePropsContext) {
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      companyFeatures: env.companyFeatures,
    },
  };
}

export default ServiceEmailsPage;




