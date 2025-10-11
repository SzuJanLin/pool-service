import { Card, InputWithLabel } from '@/components/shared';
import { defaultHeaders } from '@/lib/common';
import { Company, CompanyMember } from '@prisma/client';
import { useFormik } from 'formik';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import React from 'react';
import { Button } from 'react-daisyui';
import toast from 'react-hot-toast';
import type { ApiResponse } from 'types';

import { AccessControl } from '../shared/AccessControl';
import { z } from 'zod';
import { updateCompanySchema } from '@/lib/zod';
import useCompanies from 'hooks/useCompanies';
import useCanAccess from 'hooks/useCanAccess';

const CompanySettings = ({ company }: { company: Company }) => {
  const router = useRouter();
  const { t } = useTranslation('common');
    const { canAccess } = useCanAccess();
  const { mutateCompanies } = useCompanies();

  const formik = useFormik<z.infer<typeof updateCompanySchema>>({
    initialValues: {
      name: company.name,
      slug: company.slug,
      domain: company.domain || '',
    },
    validateOnBlur: false,
    enableReinitialize: true,
    validate: (values) => {
      try {
        updateCompanySchema.parse(values);
      } catch (error: any) {
        return error.formErrors.fieldErrors;
      }
    },
    onSubmit: async (values) => {
      const response = await fetch(`/api/companies/${company.slug}`, {
        method: 'PUT',
        headers: defaultHeaders,
        body: JSON.stringify(values),
      });

      const json = (await response.json()) as ApiResponse<Company>;

      if (!response.ok) {
        toast.error(json.error.message);
        return;
      }

      toast.success(t('successfully-updated'));
      mutateCompanies();
      router.push(`/companies/${json.data.slug}/settings`);
    },
  });

  return (
    <>
      <form onSubmit={formik.handleSubmit}>
        <Card>
          <Card.Body>
            <Card.Header>
              <Card.Title>{t('company-settings')}</Card.Title>
              <Card.Description>{t('company-settings-config')}</Card.Description>
            </Card.Header>
            <div className="flex flex-col gap-4">
              <InputWithLabel
                name="name"
                label={t('company-name')}
                value={formik.values.name}
                onChange={formik.handleChange}
                error={formik.errors.name}
                disabled={canAccess('company', ['update']) ? false : true}
              />
            </div>
          </Card.Body>
          <AccessControl resource="company" actions={['update']}>
            <Card.Footer>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  color="primary"
                  loading={formik.isSubmitting}
                  disabled={!formik.isValid || !formik.dirty}
                  size="md"
                >
                  {t('save-changes')}
                </Button>
              </div>
            </Card.Footer>
          </AccessControl>
        </Card>
      </form>
    </>
  );
};

export default CompanySettings;
