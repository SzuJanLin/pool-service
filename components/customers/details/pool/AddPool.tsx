import { defaultHeaders } from '@/lib/common';
import type { Company, Customer } from '@prisma/client';
import { useFormik } from 'formik';
import { useTranslation } from 'next-i18next';
import React, { useState } from 'react';
import { Button } from 'react-daisyui';
import toast from 'react-hot-toast';
import type { ApiResponse } from 'types';
import * as Yup from 'yup';
import { InputWithLabel } from '../../../shared';

interface AddPoolProps {
  company: Company;
  customer: Customer;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const poolPresets = ['Pool', 'SPA', 'Water Feature', 'Other'] as const;

const AddPool = ({ company, customer, onSuccess, onCancel }: AddPoolProps) => {
  const { t } = useTranslation('common');
  const [selectedPreset, setSelectedPreset] = useState<string>('Pool');

  const formik = useFormik({
    initialValues: {
      name: 'Pool',
      gallons: '',
      baselinePressure: '',
      notes: '',
    },
    validationSchema: Yup.object().shape({
      name: Yup.string().required('Pool name is required'),
      gallons: Yup.string().test(
        'is-positive-number',
        'Must be a positive number',
        (value) => !value || value === '' || (Number(value) > 0 && !isNaN(Number(value)))
      ),
      baselinePressure: Yup.string().test(
        'is-positive-number',
        'Must be a positive number',
        (value) => !value || value === '' || (Number(value) > 0 && !isNaN(Number(value)))
      ),
      notes: Yup.string(),
    }),
    onSubmit: async (values) => {
      const url = `/api/companies/${company.slug}/customers/${customer.id}/pools`;
      
      // Format the data, converting empty strings to null for optional fields
      const body = JSON.stringify({
        name: values.name,
        gallons: values.gallons && values.gallons !== '' ? parseInt(values.gallons, 10) : null,
        baselinePressure: values.baselinePressure && values.baselinePressure !== '' ? parseFloat(values.baselinePressure) : null,
        notes: values.notes && values.notes !== '' ? values.notes : null,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: defaultHeaders,
        body,
      });

      const json = (await response.json()) as ApiResponse<any>;

      if (!response.ok) {
        toast.error(json.error.message);
        return;
      }

      formik.resetForm();
      toast.success(t('pool-created'));
      
      if (onSuccess) {
        onSuccess();
      }
    },
  });

  const handleCancel = () => {
    formik.resetForm();
    setSelectedPreset('Pool');
    if (onCancel) {
      onCancel();
    }
  };

  const handlePresetClick = (preset: string) => {
    setSelectedPreset(preset);
    if (preset !== 'Other') {
      formik.setFieldValue('name', preset);
    } else {
      formik.setFieldValue('name', '');
    }
  };

  return (
    <form onSubmit={formik.handleSubmit} method="POST" className="space-y-6">
      <div className="space-y-4">
        {/* Pool Name - Required */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">{t('pool-name')} <span className="text-error">*</span></span>
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {poolPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className={`btn btn-sm ${
                  selectedPreset === preset
                    ? 'btn-primary'
                    : 'btn-outline'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          {selectedPreset === 'Other' && (
            <input
              type="text"
              name="name"
              onChange={formik.handleChange}
              value={formik.values.name}
              placeholder={t('pool-name')}
              className="input input-bordered w-full"
              required
            />
          )}
        </div>

        {/* Gallons - Optional */}
        <InputWithLabel
          label={t('pool-gallons')}
          name="gallons"
          type="number"
          onChange={formik.handleChange}
          value={formik.values.gallons}
          placeholder={t('pool-gallons')}
        />

        {/* Baseline Pressure - Optional */}
        <InputWithLabel
          label={t('pool-baseline-pressure')}
          name="baselinePressure"
          type="number"
          step="0.1"
          onChange={formik.handleChange}
          value={formik.values.baselinePressure}
          placeholder={t('pool-baseline-pressure')}
        />

        {/* Notes - Optional */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">{t('pool-notes')}</span>
          </label>
          <textarea
            name="notes"
            className="textarea textarea-bordered h-24"
            placeholder={t('pool-notes-placeholder')}
            onChange={formik.handleChange}
            value={formik.values.notes}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={handleCancel} size="md">
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          color="primary"
          loading={formik.isSubmitting}
          size="md"
          disabled={!formik.dirty || !formik.isValid}
        >
          {t('add-pool')}
        </Button>
      </div>
    </form>
  );
};

export default AddPool;
