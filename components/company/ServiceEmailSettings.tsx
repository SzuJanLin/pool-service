import React, { useEffect } from 'react';
import { useFormik } from 'formik';
import { useTranslation } from 'next-i18next';
import { Button, Input } from 'react-daisyui';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Card, InputWithLabel } from '@/components/shared';
import { defaultHeaders } from '@/lib/common';
import type { ApiResponse } from 'types';
import { serviceEmailSettingsSchema } from '@/lib/zod';
import { Company } from '@prisma/client';

interface ServiceEmailSettingsProps {
  company: Company;
}

const ServiceEmailSettings = ({ company }: ServiceEmailSettingsProps) => {
  const { t } = useTranslation('common');

  const formik = useFormik<z.infer<typeof serviceEmailSettingsSchema>>({
    initialValues: {
      fromName: '',
      fromEmail: '',
      bcc: '',
      companyName: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      email: '',
      website: '',
      logoUrl: '',
      enabled: false,
      subject: '',
      header: '',
      message: '',
      footer: '',
      includeReadings: true,
      includeDosages: true,
      includeChecklist: true,
      includeTechName: false,
      requirePhoto: false,
    },
    validateOnBlur: false,
    validate: (values) => {
      try {
        serviceEmailSettingsSchema.parse(values);
      } catch (error: any) {
        return error.formErrors.fieldErrors;
      }
    },
    onSubmit: async (values) => {
      const response = await fetch(`/api/companies/${company.slug}/service-emails`, {
        method: 'PUT',
        headers: defaultHeaders,
        body: JSON.stringify(values),
      });

      const json = (await response.json()) as ApiResponse<any>;

      if (!response.ok) {
        toast.error(json.error.message);
        return;
      }

      toast.success(t('successfully-updated'));
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const response = await fetch(`/api/companies/${company.slug}/service-emails`, {
        method: 'GET',
        headers: defaultHeaders,
      });

      if (response.ok) {
        const json = await response.json();
        if (json.data) {
          formik.setValues({
            ...formik.initialValues,
            ...json.data,
          });
        }
      }
    };

    fetchSettings();
  }, [company.slug]);

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6">
      {/* Contact Information Section */}
      <Card>
        <Card.Body>
          <Card.Header>
            <Card.Title>{t('contact-information')}</Card.Title>
          </Card.Header>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputWithLabel
              label={t('from-name')}
              name="fromName"
              value={formik.values.fromName || ''}
              onChange={formik.handleChange}
              error={formik.errors.fromName}
              placeholder="Pool Care"
            />
            <InputWithLabel
              label={t('from-email')}
              name="fromEmail"
              value={formik.values.fromEmail || ''}
              onChange={formik.handleChange}
              error={formik.errors.fromEmail}
              placeholder="reliablehomeandpool@gmail.com"
            />
            <InputWithLabel
              label={t('company')}
              name="companyName"
              value={formik.values.companyName || ''}
              onChange={formik.handleChange}
              error={formik.errors.companyName}
              placeholder="Pool Care"
            />
            <InputWithLabel
              label={t('bcc')}
              name="bcc"
              value={formik.values.bcc || ''}
              onChange={formik.handleChange}
              error={formik.errors.bcc}
              placeholder="comma-separated list"
            />
            <div className="col-span-1 md:col-span-2">
              <InputWithLabel
                label={t('address')}
                name="address"
                value={formik.values.address || ''}
                onChange={formik.handleChange}
                error={formik.errors.address}
              />
            </div>
            <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-4">
              <InputWithLabel
                label={t('city')}
                name="city"
                value={formik.values.city || ''}
                onChange={formik.handleChange}
                error={formik.errors.city}
              />
              <InputWithLabel
                label={t('state')}
                name="state"
                value={formik.values.state || ''}
                onChange={formik.handleChange}
                error={formik.errors.state}
              />
              <InputWithLabel
                label={t('zip')}
                name="zip"
                value={formik.values.zip || ''}
                onChange={formik.handleChange}
                error={formik.errors.zip}
              />
            </div>
            <InputWithLabel
              label={t('phone')}
              name="phone"
              value={formik.values.phone || ''}
              onChange={formik.handleChange}
              error={formik.errors.phone}
            />
            <InputWithLabel
              label={t('email')}
              name="email"
              value={formik.values.email || ''}
              onChange={formik.handleChange}
              error={formik.errors.email}
            />
            <div className="col-span-1 md:col-span-2">
              <InputWithLabel
                label={t('website')}
                name="website"
                value={formik.values.website || ''}
                onChange={formik.handleChange}
                error={formik.errors.website}
              />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">{t('company-logo')}</h3>
            {formik.values.logoUrl && (
              <img
                src={formik.values.logoUrl}
                alt="Company Logo"
                className="w-24 h-24 object-contain mb-2"
              />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                color="error"
                onClick={() => formik.setFieldValue('logoUrl', '')}
              >
                {t('delete-logo')}
              </Button>
              <Button type="button" size="sm" variant="outline">
                {t('choose-logo')}
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Service Emails Configuration Section */}
      <Card>
        <Card.Body>
          <div className="border-b border-gray-200 pb-4 mb-4">
            <div className="flex gap-4">
              <button
                type="button"
                className="text-blue-600 border-b-2 border-blue-600 pb-2 font-medium"
              >
                {t('service-emails')}
              </button>
              <button type="button" className="text-gray-500 pb-2 font-medium">
                {t('skipped-stops-emails')}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <label className="font-medium">
              {t('email-customer-automatically')}
            </label>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={formik.values.enabled}
              onChange={(e) => formik.setFieldValue('enabled', e.target.checked)}
            />
          </div>

          <div className="space-y-4">
            <InputWithLabel
              label={t('subject-with-date-placeholder')}
              name="subject"
              value={formik.values.subject || ''}
              onChange={formik.handleChange}
              error={formik.errors.subject}
              placeholder="Another Successful Pool Service :)"
            />
            <InputWithLabel
              label={t('header')}
              name="header"
              value={formik.values.header || ''}
              onChange={formik.handleChange}
              error={formik.errors.header}
              placeholder="We just serviced your pool:"
            />
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium">{t('default-message')}</label>
                <a href="#" className="text-sm text-blue-600">
                  {t('service-email-messages')}
                </a>
              </div>
              <textarea
                name="message"
                className="textarea textarea-bordered w-full h-24"
                value={formik.values.message || ''}
                onChange={formik.handleChange}
                placeholder="Thanks for choosing us for your pool care! You can see the breakdown of your chemical readings, what we added, and pictures of your pool."
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm"
                  checked={formik.values.includeReadings}
                  onChange={(e) =>
                    formik.setFieldValue('includeReadings', e.target.checked)
                  }
                />
                <span className="font-medium">{t('include-chemical-readings')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm"
                  checked={formik.values.includeDosages}
                  onChange={(e) =>
                    formik.setFieldValue('includeDosages', e.target.checked)
                  }
                />
                <span className="font-medium">{t('include-chemical-dosages')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm"
                  checked={formik.values.includeChecklist}
                  onChange={(e) =>
                    formik.setFieldValue('includeChecklist', e.target.checked)
                  }
                />
                <span className="font-medium">{t('include-completed-checklist-items')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm"
                  checked={formik.values.includeTechName}
                  onChange={(e) =>
                    formik.setFieldValue('includeTechName', e.target.checked)
                  }
                />
                <span className="font-medium">{t('include-name-of-tech')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm"
                  checked={formik.values.requirePhoto}
                  onChange={(e) =>
                    formik.setFieldValue('requirePhoto', e.target.checked)
                  }
                />
                <span className="font-medium">{t('require-a-photo-with-each-stop')}</span>
              </label>
            </div>

            <InputWithLabel
              label={t('footer')}
              name="footer"
              value={formik.values.footer || ''}
              onChange={formik.handleChange}
              error={formik.errors.footer}
              placeholder="Have a great day!"
            />

            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-medium mb-4">{t('try-it-out')}</h3>
              <div className="flex justify-end">
                <Button type="button" size="sm" variant="outline" color="primary">
                  {t('email-preview')}
                </Button>
              </div>
            </div>
          </div>
        </Card.Body>
        <Card.Footer>
          <div className="flex justify-end">
            <Button
              type="submit"
              color="primary"
              loading={formik.isSubmitting}
              disabled={!formik.isValid}
            >
              {t('save-email-settings')}
            </Button>
          </div>
        </Card.Footer>
      </Card>
    </form>
  );
};

export default ServiceEmailSettings;


