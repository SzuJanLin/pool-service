import { defaultHeaders } from '@/lib/common';
import type { Company, User } from '@prisma/client';
import { useFormik } from 'formik';
import React, { useState } from 'react';
import { Button } from 'react-daisyui';
import toast from 'react-hot-toast';
import type { ApiResponse } from 'types';
import * as Yup from 'yup';
import { InputWithLabel } from '../../shared';
import type { CustomerWithPoolsAndRoutes } from 'models/customer';

interface AddRouteProps {
  company: Company;
  customer: CustomerWithPoolsAndRoutes;
  technicians: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const dayOfWeekOptions = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

const frequencyOptions = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'CUSTOM', label: 'Custom' },
];

const AddRoute = ({ company, customer, technicians, onSuccess, onCancel }: AddRouteProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formik = useFormik({
    initialValues: {
      poolId: '',
      techId: '',
      dayOfWeek: 'MONDAY',
      frequency: 'WEEKLY',
      startOn: '',
      stopAfter: '',
      skipWeeks: 0,
      anchorDate: '',
      weekOffset: 0,
      skipWeekNumbers: '',
      active: true,
    },
    validationSchema: Yup.object().shape({
      poolId: Yup.string().required('Pool is required'),
      techId: Yup.string(),
      dayOfWeek: Yup.string().required('Day of week is required'),
      frequency: Yup.string().required('Frequency is required'),
      startOn: Yup.date().required('Start date is required'),
      stopAfter: Yup.date().nullable(),
      skipWeeks: Yup.number().min(0, 'Skip weeks must be 0 or greater'),
      anchorDate: Yup.date().nullable(),
      weekOffset: Yup.number().min(0, 'Week offset must be 0 or greater'),
      skipWeekNumbers: Yup.string(),
      active: Yup.boolean(),
    }),
    onSubmit: async (values) => {
      setIsSubmitting(true);
      
      try {
        const url = `/api/companies/${company.slug}/customers/${customer.id}/routes`;
        
        // Format the data
        const body = JSON.stringify({
          poolId: values.poolId,
          techId: values.techId && values.techId !== '' ? values.techId : null,
          dayOfWeek: values.dayOfWeek,
          frequency: values.frequency,
          startOn: new Date(values.startOn).toISOString(),
          stopAfter: values.stopAfter ? new Date(values.stopAfter).toISOString() : null,
          skipWeeks: parseInt(values.skipWeeks.toString()),
          anchorDate: values.anchorDate ? new Date(values.anchorDate).toISOString() : null,
          weekOffset: parseInt(values.weekOffset.toString()),
          skipWeekNumbers: values.skipWeekNumbers 
            ? values.skipWeekNumbers.split(',').map(num => parseInt(num.trim())).filter(num => !isNaN(num))
            : [],
          active: values.active,
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
        toast.success('Route created successfully');
        
        if (onSuccess) {
          onSuccess();
        }
      } catch (error) {
        toast.error('Failed to create route');
        console.error('Error creating route:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handleCancel = () => {
    formik.resetForm();
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Pool Selection */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pool *
          </label>
          <select
            value={formik.values.poolId}
            onChange={(e) => formik.setFieldValue('poolId', e.target.value)}
            className="select select-bordered w-full"
            disabled={customer.pools.length === 0}
          >
            <option value="">
              {customer.pools.length === 0 
                ? 'No pools available' 
                : 'Select a pool'
              }
            </option>
            {customer.pools.map((pool) => (
              <option key={pool.id} value={pool.id}>
                {pool.name}
              </option>
            ))}
          </select>
          {formik.errors.poolId && formik.touched.poolId && (
            <p className="mt-1 text-sm text-red-600">{formik.errors.poolId}</p>
          )}
          {customer.pools.length === 0 && (
            <p className="mt-1 text-sm text-gray-500">
              Please add a pool first before creating routes.
            </p>
          )}
        </div>

        {/* Technician Selection */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Technician
          </label>
          <select
            value={formik.values.techId}
            onChange={(e) => formik.setFieldValue('techId', e.target.value)}
            className="select select-bordered w-full"
          >
            <option value="">Unassigned</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.userId}>
                {tech.user.name}
              </option>
            ))}
          </select>
        </div>

        {/* Day of Week */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Day of Week *
          </label>
          <select
            value={formik.values.dayOfWeek}
            onChange={(e) => formik.setFieldValue('dayOfWeek', e.target.value)}
            className="select select-bordered w-full"
          >
            {dayOfWeekOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {formik.errors.dayOfWeek && formik.touched.dayOfWeek && (
            <p className="mt-1 text-sm text-red-600">{formik.errors.dayOfWeek}</p>
          )}
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Frequency *
          </label>
          <select
            value={formik.values.frequency}
            onChange={(e) => formik.setFieldValue('frequency', e.target.value)}
            className="select select-bordered w-full"
          >
            {frequencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {formik.errors.frequency && formik.touched.frequency && (
            <p className="mt-1 text-sm text-red-600">{formik.errors.frequency}</p>
          )}
        </div>

        {/* Start Date */}
        <div>
          <InputWithLabel
            label="Start Date *"
            type="date"
            name="startOn"
            value={formik.values.startOn}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.startOn && formik.touched.startOn ? formik.errors.startOn : undefined}
          />
        </div>

        {/* End Date */}
        <div>
          <InputWithLabel
            label="End Date"
            type="date"
            name="stopAfter"
            value={formik.values.stopAfter}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.stopAfter && formik.touched.stopAfter ? formik.errors.stopAfter : undefined}
          />
        </div>

        {/* Skip Weeks */}
        <div>
          <InputWithLabel
            label="Skip Weeks"
            type="number"
            name="skipWeeks"
            value={formik.values.skipWeeks}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            min="0"
            error={formik.errors.skipWeeks && formik.touched.skipWeeks ? formik.errors.skipWeeks : undefined}
          />
        </div>

        {/* Week Offset */}
        <div>
          <InputWithLabel
            label="Week Offset"
            type="number"
            name="weekOffset"
            value={formik.values.weekOffset}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            min="0"
            error={formik.errors.weekOffset && formik.touched.weekOffset ? formik.errors.weekOffset : undefined}
          />
        </div>

        {/* Anchor Date */}
        <div>
          <InputWithLabel
            label="Anchor Date"
            type="date"
            name="anchorDate"
            value={formik.values.anchorDate}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.anchorDate && formik.touched.anchorDate ? formik.errors.anchorDate : undefined}
          />
        </div>

        {/* Skip Week Numbers */}
        <div>
          <InputWithLabel
            label="Skip Week Numbers"
            type="text"
            name="skipWeekNumbers"
            value={formik.values.skipWeekNumbers}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="e.g., 1,3,5"
            error={formik.errors.skipWeekNumbers && formik.touched.skipWeekNumbers ? formik.errors.skipWeekNumbers : undefined}
          />
          <p className="mt-1 text-sm text-gray-500">Comma-separated week numbers to skip</p>
        </div>

        {/* Active Status */}
        <div className="sm:col-span-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              name="active"
              checked={formik.values.active}
              onChange={formik.handleChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
              Active Route
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          color="primary"
          onClick={() => formik.handleSubmit()}
          disabled={isSubmitting || !formik.isValid || customer.pools.length === 0}
          loading={isSubmitting}
        >
          Create Route
        </Button>
      </div>
    </div>
  );
};

export default AddRoute;
