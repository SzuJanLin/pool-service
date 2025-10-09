import { Error, Loading } from '@/components/shared';
import { CompanyTab } from '@/components/company';
import useCompany from 'hooks/useCompany';
import { GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { toast } from 'react-hot-toast';
import env from '@/lib/env';
import { DirectoriesWrapper } from '@boxyhq/react-ui/dsync';
import { BOXYHQ_UI_CSS } from '@/components/styles';

const DirectorySync = ({ companyFeatures }) => {
  const { isLoading, isError, company } = useCompany();
  const { t } = useTranslation('common');

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
      <CompanyTab
        activeTab="directory-sync"
        company={company}
        companyFeatures={companyFeatures}
      />
      <DirectoriesWrapper
        classNames={BOXYHQ_UI_CSS}
        componentProps={{
          directoryList: {
            cols: ['name', 'type', 'status', 'actions'],
            hideViewAction: true,
          },
          createDirectory: {
            excludeFields: [
              'product',
              'tenant',
              'webhook_secret',
              'webhook_url',
              'log_webhook_events',
            ],
            disableGoogleProvider: true,
          },
          editDirectory: {
            excludeFields: [
              'webhook_url',
              'webhook_secret',
              'log_webhook_events',
            ],
          },
        }}
        urls={{
          get: `/api/companies/${company.slug}/dsync`,
          post: `/api/companies/${company.slug}/dsync`,
          patch: `/api/companies/${company.slug}/dsync`,
          delete: `/api/companies/${company.slug}/dsync`,
        }}
        successCallback={({ operation }) => {
          if (operation === 'CREATE') {
            toast.success(`Connection created successfully.`);
          } else if (operation === 'UPDATE') {
            toast.success(`Connection updated successfully.`);
          } else if (operation === 'DELETE') {
            toast.success(`Connection deleted successfully.`);
          } else if (operation === 'COPY') {
            toast.success(`Contents copied to clipboard`);
          }
        }}
        errorCallback={(errMessage) => toast.error(errMessage)}
      />
    </>
  );
};

export async function getServerSideProps({
  locale,
}: GetServerSidePropsContext) {
  if (!env.companyFeatures.dsync) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      companyFeatures: env.companyFeatures,
    },
  };
}

export default DirectorySync;
