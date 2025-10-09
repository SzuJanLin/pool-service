import { Error, Loading } from '@/components/shared';
import { AccessControl } from '@/components/shared/AccessControl';
import { RemoveCompany, CompanySettings, CompanyTab } from '@/components/company';
import env from '@/lib/env';
import useCompany from 'hooks/useCompany';
import type { GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { CompanyFeature } from 'types';

const Settings = ({ companyFeatures }: { companyFeatures: CompanyFeature }) => {
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
      <CompanyTab activeTab="settings" company={company} companyFeatures={companyFeatures} />
      <div className="space-y-6">
        <CompanySettings company={company} />
        <AccessControl resource="company" actions={['delete']}>
          <RemoveCompany company={company} allowDelete={companyFeatures.deleteCompany} />
        </AccessControl>
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

export default Settings;
