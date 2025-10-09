import useSWR from 'swr';
import { useTranslation } from 'next-i18next';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import env from '@/lib/env';
import useCompany from 'hooks/useCompany';
import fetcher from '@/lib/fetcher';
import useCanAccess from 'hooks/useCanAccess';
import { CompanyTab } from '@/components/company';
import Help from '@/components/billing/Help';
import { Error, Loading } from '@/components/shared';
import LinkToPortal from '@/components/billing/LinkToPortal';
import Subscriptions from '@/components/billing/Subscriptions';
import ProductPricing from '@/components/billing/ProductPricing';

const Payments = ({ companyFeatures }) => {
  const { t } = useTranslation('common');
  const { canAccess } = useCanAccess();
  const { isLoading, isError, company } = useCompany();
  const { data } = useSWR(
    company?.slug ? `/api/companies/${company?.slug}/payments/products` : null,
    fetcher
  );

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return <Error message={isError.message} />;
  }

  if (!company) {
    return <Error message={t('company-not-found')} />;
  }

  const plans = data?.data?.products || [];
  const subscriptions = data?.data?.subscriptions || [];

  return (
    <>
      {canAccess('company_payments', ['read']) && (
        <>
          <CompanyTab
            activeTab="payments"
            company={company}
            companyFeatures={companyFeatures}
          />

          <div className="flex gap-6 flex-col md:flex-row">
            <LinkToPortal company={company} />
            <Help />
          </div>

          <div className="py-6">
            <Subscriptions subscriptions={subscriptions} />
          </div>

          <ProductPricing plans={plans} subscriptions={subscriptions} />
        </>
      )}
    </>
  );
};

export async function getServerSideProps({
  locale,
}: GetServerSidePropsContext) {
  if (!env.companyFeatures.payments) {
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

export default Payments;
