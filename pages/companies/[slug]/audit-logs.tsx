import { Card } from '@/components/shared';
import { Error, Loading } from '@/components/shared';
import { CompanyTab } from '@/components/company';
import env from '@/lib/env';
import { inferSSRProps } from '@/lib/inferSSRProps';
import { getViewerToken } from '@/lib/retraced';
import { getSession } from '@/lib/session';
import useCanAccess from 'hooks/useCanAccess';
import useCompany from 'hooks/useCompany';
import { getCompanyMember } from 'models/company';
import { throwIfNotAllowed } from 'models/user';
import { GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import dynamic from 'next/dynamic';
import type { NextPageWithLayout } from 'types';

interface RetracedEventsBrowserProps {
  host: string;
  auditLogToken: string;
  header: string;
}

const RetracedEventsBrowser = dynamic<RetracedEventsBrowserProps>(
  () => import('@retracedhq/logs-viewer'),
  {
    ssr: false,
  }
);

const Events: NextPageWithLayout<inferSSRProps<typeof getServerSideProps>> = ({
  auditLogToken,
  retracedHost,
  error,
  companyFeatures,
}) => {
  const { t } = useTranslation('common');
  const { canAccess } = useCanAccess();
  const { isLoading, isError, company } = useCompany();

  if (isLoading) {
    return <Loading />;
  }

  if (isError || error) {
    return <Error message={isError?.message || error?.message} />;
  }

  if (!company) {
    return <Error message={t('company-not-found')} />;
  }

  return (
    <>
      <CompanyTab activeTab="audit-logs" company={company} companyFeatures={companyFeatures} />
      <Card>
        <Card.Body>
          {canAccess('company_audit_log', ['read']) && auditLogToken && (
            <RetracedEventsBrowser
              host={`${retracedHost}/viewer/v1`}
              auditLogToken={auditLogToken}
              header={t('audit-logs')}
            />
          )}
        </Card.Body>
      </Card>
    </>
  );
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  if (!env.companyFeatures.auditLog) {
    return {
      notFound: true,
    };
  }

  const { locale, req, res, query } = context;

  const session = await getSession(req, res);
  const companyMember = await getCompanyMember(
    session?.user.id as string,
    query.slug as string
  );

  try {
    throwIfNotAllowed(companyMember, 'company_audit_log', 'read');

    const auditLogToken = await getViewerToken(
      companyMember.company.id,
      session?.user.id as string
    );

    return {
      props: {
        ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
        error: null,
        auditLogToken: auditLogToken ?? '',
        retracedHost: env.retraced.url ?? '',
        companyFeatures: env.companyFeatures,
      },
    };
  } catch (error: unknown) {
    const { message } = error as { message: string };
    return {
      props: {
        ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
        error: {
          message,
        },
        auditLogToken: null,
        retracedHost: null,
        companyFeatures: env.companyFeatures,
      },
    };
  }
}

export default Events;
