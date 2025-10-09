import { Error, Loading } from '@/components/shared';
import { CompanyTab } from '@/components/company';
import useCompany from 'hooks/useCompany';
import { useTranslation } from 'next-i18next';
import APIKeys from './APIKeys';
import { CompanyFeature } from 'types';

const APIKeysContainer = ({ companyFeatures }: { companyFeatures: CompanyFeature }) => {
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
      <CompanyTab activeTab="api-keys" company={company} companyFeatures={companyFeatures} />
      <APIKeys company={company} />
    </>
  );
};

export default APIKeysContainer;
