import { Card } from '@/components/shared';
import { Company } from '@prisma/client';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { Button } from 'react-daisyui';
import toast from 'react-hot-toast';

import ConfirmationDialog from '../shared/ConfirmationDialog';
import { defaultHeaders } from '@/lib/common';
import type { ApiResponse } from 'types';

interface RemoveCompanyProps {
  company: Company;
  allowDelete: boolean;
}

const RemoveCompany = ({ company, allowDelete }: RemoveCompanyProps) => {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [askConfirmation, setAskConfirmation] = useState(false);

  const removeCompany = async () => {
    setLoading(true);

    const response = await fetch(`/api/companies/${company.slug}`, {
      method: 'DELETE',
      headers: defaultHeaders,
    });

    setLoading(false);

    if (!response.ok) {
      const json = (await response.json()) as ApiResponse;
      toast.error(json.error.message);
      return;
    }

    toast.success(t('company-removed-successfully'));
    router.push('/companies');
  };

  return (
    <>
      <Card>
        <Card.Body>
          <Card.Header>
            <Card.Title>{t('remove-company')}</Card.Title>
            <Card.Description>
              {allowDelete
                ? t('remove-company-warning')
                : t('remove-company-restricted')}
            </Card.Description>
          </Card.Header>
        </Card.Body>
        {allowDelete && (
          <Card.Footer>
            <Button
              color="error"
              onClick={() => setAskConfirmation(true)}
              loading={loading}
              variant="outline"
              size="md"
            >
              {t('remove-company')}
            </Button>
          </Card.Footer>
        )}
      </Card>
      {allowDelete && (
        <ConfirmationDialog
          visible={askConfirmation}
          title={t('remove-company')}
          onCancel={() => setAskConfirmation(false)}
          onConfirm={removeCompany}
        >
          {t('remove-company-confirmation')}
        </ConfirmationDialog>
      )}
    </>
  );
};

export default RemoveCompany;
