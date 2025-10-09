import { defaultHeaders, maxLengthPolicies } from '@/lib/common';
import type { Company } from '@prisma/client';
import { useFormik } from 'formik';
import useCompanies from 'hooks/useCompanies';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import React from 'react';
import { Button } from 'react-daisyui';
import toast from 'react-hot-toast';
import type { ApiResponse } from 'types';
import * as Yup from 'yup';
import Modal from '../shared/Modal';
import { InputWithLabel } from '../shared';

interface CreateCompanyProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

const CreateCompany = ({ visible, setVisible }: CreateCompanyProps) => {
  const { t } = useTranslation('common');
  const { mutateCompanies } = useCompanies();
  const router = useRouter();

  const formik = useFormik({
    initialValues: {
      name: '',
    },
    validationSchema: Yup.object().shape({
      name: Yup.string().required().max(maxLengthPolicies.company),
    }),
    onSubmit: async (values) => {
      const response = await fetch('/api/companies/', {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify(values),
      });

      const json = (await response.json()) as ApiResponse<Company>;

      if (!response.ok) {
        toast.error(json.error.message);
        return;
      }

      formik.resetForm();
      mutateCompanies();
      setVisible(false);
      toast.success(t('company-created'));
      router.push(`/companies/${json.data.slug}/settings`);
    },
  });

  const onClose = () => {
    setVisible(false);
    router.push(`/companies`);
  };

  return (
    <Modal open={visible} close={onClose}>
      <form onSubmit={formik.handleSubmit} method="POST">
        <Modal.Header>{t('create-company')}</Modal.Header>
        <Modal.Description>{t('members-of-a-company')}</Modal.Description>
        <Modal.Body>
          <InputWithLabel
            label={t('name')}
            name="name"
            onChange={formik.handleChange}
            value={formik.values.name}
            placeholder={t('company-name')}
            required
          />
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline" onClick={onClose} size="md">
            {t('close')}
          </Button>
          <Button
            type="submit"
            color="primary"
            loading={formik.isSubmitting}
            size="md"
            disabled={!formik.dirty || !formik.isValid}
          >
            {t('create-company')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

export default CreateCompany;
