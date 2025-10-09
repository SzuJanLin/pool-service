import { LetterAvatar } from '@/components/shared';
import { defaultHeaders } from '@/lib/common';
import { Company } from '@prisma/client';
import useCompanies from 'hooks/useCompanies';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from 'react-daisyui';
import toast from 'react-hot-toast';
import type { ApiResponse } from 'types';
import { useRouter } from 'next/router';
import ConfirmationDialog from '../shared/ConfirmationDialog';
import { WithLoadingAndError } from '@/components/shared';
import { CreateCompany } from '@/components/company';
import { Table } from '@/components/shared/table/Table';

const Companies = () => {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [company, setCompany] = useState<Company | null>(null);
  const { isLoading, isError, companies, mutateCompanies } = useCompanies();
  const [askConfirmation, setAskConfirmation] = useState(false);
  const [createCompanyVisible, setCreateCompanyVisible] = useState(false);

  const { newCompany } = router.query as { newCompany: string };

  useEffect(() => {
    if (newCompany) {
      setCreateCompanyVisible(true);
    }
  }, [newCompany]);

  const leaveCompany = async (company: Company) => {
    const response = await fetch(`/api/companies/${company.slug}/members`, {
      method: 'PUT',
      headers: defaultHeaders,
    });

    const json = (await response.json()) as ApiResponse;

    if (!response.ok) {
      toast.error(json.error.message);
      return;
    }

    toast.success(t('leave-company-success'));
    mutateCompanies();
  };

  return (
    <WithLoadingAndError isLoading={isLoading} error={isError}>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="space-y-3">
            <h2 className="text-xl font-medium leading-none tracking-tight">
              {t('all-companies')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('company-listed')}
            </p>
          </div>
          <Button
            color="primary"
            size="md"
            onClick={() => setCreateCompanyVisible(!createCompanyVisible)}
          >
            {t('create-company')}
          </Button>
        </div>

        <Table
          cols={[t('name'), t('members'), t('created-at'), t('actions')]}
          body={
            companies
              ? companies.map((company) => {
                  return {
                    id: company.id,
                    cells: [
                      {
                        wrap: true,
                        element: (
                          <Link href={`/companies/${company.slug}/members`}>
                            <div className="flex items-center justify-start space-x-2">
                              <LetterAvatar name={company.name} />
                              <span className="underline">{company.name}</span>
                            </div>
                          </Link>
                        ),
                      },
                      { wrap: true, text: '' + company._count.members },
                      {
                        wrap: true,
                        text: new Date(company.createdAt).toDateString(),
                      },
                      {
                        buttons: [
                          {
                            color: 'error',
                            text: t('leave-company'),
                            onClick: () => {
                              setCompany(company);
                              setAskConfirmation(true);
                            },
                          },
                        ],
                      },
                    ],
                  };
                })
              : []
          }
        ></Table>

        <ConfirmationDialog
          visible={askConfirmation}
          title={`${t('leave-company')} ${company?.name}`}
          onCancel={() => setAskConfirmation(false)}
          onConfirm={() => {
            if (company) {
              leaveCompany(company);
            }
          }}
          confirmText={t('leave-company')}
        >
          {t('leave-company-confirmation')}
        </ConfirmationDialog>
        <CreateCompany
          visible={createCompanyVisible}
          setVisible={setCreateCompanyVisible}
        />
      </div>
    </WithLoadingAndError>
  );
};

export default Companies;
