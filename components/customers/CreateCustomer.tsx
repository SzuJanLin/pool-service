import { defaultHeaders, maxLengthPolicies } from '@/lib/common';
import type { Company, Customer } from '@prisma/client';
import { useFormik } from 'formik';
import useCustomers from 'hooks/useCustomers';
import { useTranslation } from 'next-i18next';
import React, { useEffect } from 'react';
import { Button, Select } from 'react-daisyui';
import toast from 'react-hot-toast';
import type { ApiResponse } from 'types';
import * as Yup from 'yup';
import { InputWithLabel } from '../shared';
import { useRouter } from 'next/router';

interface AddCustomerProps {
  company: Company;
  customer?: Customer | null; // Optional: if provided, we're editing
  onSaveSuccess?: () => void; // Optional: callback to execute after successful save
  onCancel?: () => void; // Optional: callback to execute when canceling
}

const customerStatuses = ['LEAD', 'ACTIVE', 'INACTIVE', 'LOST'] as const;

const CreateCustomer = ({ company, customer = null, onSaveSuccess, onCancel }: AddCustomerProps) => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { mutateCustomers } = useCustomers(company.slug);
  const isEditMode = !!customer;

  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      addressStreet: '',
      addressCity: '',
      addressState: '',
      addressZip: '',
      notes: '',
      status: 'LEAD' as typeof customerStatuses[number],
    },
    validationSchema: Yup.object().shape({
      firstName: Yup.string().required().max(maxLengthPolicies.company),
      lastName: Yup.string().required().max(maxLengthPolicies.company),
      email: Yup.string().email(),
      phone: Yup.string(),
      addressStreet: Yup.string(),
      addressCity: Yup.string(),
      addressState: Yup.string(),
      addressZip: Yup.string(),
      notes: Yup.string(),
      status: Yup.string().oneOf(customerStatuses).required(),
    }),
    onSubmit: async (values) => {
      const url = `/api/companies/${company.slug}/customers`;
      const method = isEditMode ? 'PATCH' : 'POST';
      const body = isEditMode 
        ? JSON.stringify({ customerId: customer?.id, ...values })
        : JSON.stringify(values);

      const response = await fetch(url, {
        method,
        headers: defaultHeaders,
        body,
      });

      const json = (await response.json()) as ApiResponse<Customer>;

      if (!response.ok) {
        toast.error(json.error.message);
        return;
      }

      formik.resetForm();
      mutateCustomers();
      toast.success(t(isEditMode ? 'customer-updated' : 'customer-created'));
      
      // Use custom callback if provided, otherwise default redirect
      if (onSaveSuccess) {
        onSaveSuccess();
      } else {
        router.push(`/companies/${company.slug}/customers`);
      }
    },
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (customer && isEditMode) {
      formik.setValues({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email || '',
        phone: customer.phone || '',
        addressStreet: customer.addressStreet || '',
        addressCity: customer.addressCity || '',
        addressState: customer.addressState || '',
        addressZip: customer.addressZip || '',
        notes: customer.notes || '',
        status: customer.status as typeof customerStatuses[number],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, isEditMode]);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push(`/companies/${company.slug}/customers`);
    }
  };

  return (
    <div className="w-full max-w-4xl">
      <form onSubmit={formik.handleSubmit} method="POST" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold">{t(isEditMode ? 'edit-customer' : 'add-customer')}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {t(isEditMode ? 'edit-customer-description' : 'add-new-customer-description')}
          </p>
        </div>
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            {/* Personal Information */}
            <div className="grid grid-cols-2 gap-4">
              <InputWithLabel
                label={t('customer-first-name')}
                name="firstName"
                onChange={formik.handleChange}
                value={formik.values.firstName}
                placeholder={t('customer-first-name')}
                required
              />
              <InputWithLabel
                label={t('customer-last-name')}
                name="lastName"
                onChange={formik.handleChange}
                value={formik.values.lastName}
                placeholder={t('customer-last-name')}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InputWithLabel
                label={t('email')}
                name="email"
                type="email"
                onChange={formik.handleChange}
                value={formik.values.email}
                placeholder={t('customer-email')}
              />
              <InputWithLabel
                label={t('phone')}
                name="phone"
                type="tel"
                onChange={formik.handleChange}
                value={formik.values.phone}
                placeholder={t('customer-phone')}
              />
            </div>

            {/* Address Information */}
            <InputWithLabel
              label={t('customer-address-street')}
              name="addressStreet"
              onChange={formik.handleChange}
              value={formik.values.addressStreet}
              placeholder={t('customer-address-street')}
            />

            <div className="grid grid-cols-3 gap-4">
              <InputWithLabel
                label={t('customer-address-city')}
                name="addressCity"
                onChange={formik.handleChange}
                value={formik.values.addressCity}
                placeholder={t('customer-address-city')}
              />
              <InputWithLabel
                label={t('customer-address-state')}
                name="addressState"
                onChange={formik.handleChange}
                value={formik.values.addressState}
                placeholder={t('customer-address-state')}
              />
              <InputWithLabel
                label={t('customer-address-zip')}
                name="addressZip"
                onChange={formik.handleChange}
                value={formik.values.addressZip}
                placeholder={t('customer-address-zip')}
              />
            </div>

            {/* Status */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">{t('status')}</span>
              </label>
              <Select
                name="status"
                value={formik.values.status}
                onChange={formik.handleChange}
                className="w-full"
              >
                {customerStatuses.map((status) => (
                  <option key={status} value={status}>
                    {t(`customer-status-${status.toLowerCase()}`)}
                  </option>
                ))}
              </Select>
            </div>

            {/* Notes */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">{t('customer-notes')}</span>
              </label>
              <textarea
                name="notes"
                className="textarea textarea-bordered h-24"
                placeholder={t('customer-notes-placeholder')}
                onChange={formik.handleChange}
                value={formik.values.notes}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
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
            {t(isEditMode ? 'save-changes' : 'add-customer')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateCustomer;