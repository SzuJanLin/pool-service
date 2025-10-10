import { Loading } from '@/components/shared';
import useCompanies from 'hooks/useCompanies';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import type { NextPageWithLayout } from 'types';

const Dashboard: NextPageWithLayout = () => {
  const router = useRouter();
  const { companies, isLoading } = useCompanies();

  useEffect(() => {
    if (isLoading || !companies) {
      return;
    }

    if (companies.length > 0) {
      router.push(`/companies/${companies[0].slug}/products`);
    } else {
      router.push('companies?newCompany=true');
    }
  }, [isLoading, router, companies]);

  return <Loading />;
};

export async function getStaticProps({ locale }: GetServerSidePropsContext) {
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
}

export default Dashboard;
