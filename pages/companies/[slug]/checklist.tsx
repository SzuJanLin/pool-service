import { Error, Loading } from '@/components/shared';
import { AccessControl } from '@/components/shared/AccessControl';
import { CompanyTab } from '@/components/company';
import ChecklistManager from '@/components/company/ChecklistManager';
import env from '@/lib/env';
import useCompany from 'hooks/useCompany';
import type { GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { CompanyFeature } from 'types';

const ChecklistPage = ({ companyFeatures }: { companyFeatures: CompanyFeature }) => {
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
      <CompanyTab activeTab="checklist" company={company} companyFeatures={companyFeatures} />
      <AccessControl resource="company" actions={['update']}>
        <ChecklistManager company={company} />
      </AccessControl>
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

export default ChecklistPage;

