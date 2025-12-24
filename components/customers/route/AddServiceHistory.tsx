import { useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { CustomerWithPoolsAndRoutes } from 'models/customer';
import { Company } from '@prisma/client';

interface AddServiceHistoryProps {
  customer: CustomerWithPoolsAndRoutes;
  company: Company;
  routeId: string;
}

const AddServiceHistory = ({ customer, company, routeId }: AddServiceHistoryProps) => {
  const { t } = useTranslation('common');
  const router = useRouter();

  // Find the route
  const route = customer.pools
    .flatMap(pool => pool.routes)
    .find(r => r.id === routeId);

  const pool = customer.pools.find(p => p.routes.some(r => r.id === routeId));

  const [formData, setFormData] = useState({
    serviceDate: new Date().toISOString().split('T')[0],
    status: 'COMPLETED' as 'PENDING' | 'COMPLETED' | 'CANCELLED',
    technicianId: route?.techId || '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Prepare data for API
      const payload = {
        routeId,
        serviceDate: formData.serviceDate,
        status: formData.status,
        technicianId: formData.technicianId || null,
        notes: formData.notes || null,
      };

      const response = await fetch(`/api/companies/${company.slug}/customers/${customer.id}/service-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to save service history');
      }

      alert(t('service-history-saved'));
      router.back();
    } catch (error) {
      console.error('Error saving service history:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to save service history'}`);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (!route || !pool) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-semibold mb-4">Route Not Found</h2>
          <p className="text-gray-500 mb-4">The requested route could not be found.</p>
          <button
            onClick={handleCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Add Service History</h2>
        <p className="text-gray-500">
          {pool.name} - {route.dayOfWeek} • {route.frequency}
        </p>
        <p className="text-sm text-gray-400">
          Technician: {route.tech?.name || 'Unassigned'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Basic Information</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Date *
              </label>
              <input
                type="date"
                required
                value={formData.serviceDate}
                onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Technician Override
            </label>
            <input
              type="text"
              value={formData.technicianId}
              onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
              placeholder="Leave blank to use route technician"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              Default: {route.tech?.name || 'Unassigned'}
            </p>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="General notes about this service visit..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* 
          TODO: Re-implement Readings and Chemical Doses sections using new dynamic definitions
          (ReadingDefinition and DosageDefinition) instead of hardcoded fields/enums.
        */}

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none"
          >
            Save Service History
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddServiceHistory;
