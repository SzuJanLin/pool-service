import { PendingInvitations } from '@/components/invitation';
import { Error, Loading } from '@/components/shared';
import { Members, CompanyTab } from '@/components/company';
import env from '@/lib/env';
import useCompany from 'hooks/useCompany';
import { GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

const CompanyMembers = ({ companyFeatures }) => {
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
      <CompanyTab activeTab="members" company={company} companyFeatures={companyFeatures} />
      <div className="space-y-6">
        <Members company={company} />
        <PendingInvitations company={company} />
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

export default CompanyMembers;
