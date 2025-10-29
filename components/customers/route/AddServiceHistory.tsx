import { useState } from 'react';
import { useRouter } from 'next/router';
import { PlusCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
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

  const [readings, setReadings] = useState({
    freeChlorine: '',
    totalChlorine: '',
    pH: '',
    totalAlkalinity: '',
    calciumHardness: '',
    cyanuricAcid: '',
    salt: '',
    temperatureC: '',
    method: '',
    notes: '',
  });

  const [doses, setDoses] = useState<Array<{
    chemical: string;
    amount: string;
    unit: string;
    productName: string;
    costCents: string;
    notes: string;
  }>>([]);

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
        readings: Object.keys(readings).some(key => readings[key as keyof typeof readings]) 
          ? readings 
          : undefined,
        doses: doses.filter(dose => dose.chemical && dose.amount).map(dose => ({
          ...dose,
          amount: parseFloat(dose.amount) || 0,
          costCents: dose.costCents ? Math.round(parseFloat(dose.costCents) * 100) : null,
        })),
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

  const handleAddDose = () => {
    setDoses([...doses, {
      chemical: '',
      amount: '',
      unit: 'FL_OZ',
      productName: '',
      costCents: '',
      notes: '',
    }]);
  };

  const handleRemoveDose = (index: number) => {
    setDoses(doses.filter((_, i) => i !== index));
  };

  const handleDoseChange = (index: number, field: string, value: string) => {
    const newDoses = [...doses];
    newDoses[index] = { ...newDoses[index], [field]: value };
    setDoses(newDoses);
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

        {/* Chemistry Readings Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Chemistry Readings</h3>
          
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Free Chlorine (ppm)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={readings.freeChlorine}
                onChange={(e) => setReadings({ ...readings, freeChlorine: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Chlorine (ppm)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={readings.totalChlorine}
                onChange={(e) => setReadings({ ...readings, totalChlorine: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                pH
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="14"
                value={readings.pH}
                onChange={(e) => setReadings({ ...readings, pH: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Alkalinity (ppm)
              </label>
              <input
                type="number"
                min="0"
                max="300"
                value={readings.totalAlkalinity}
                onChange={(e) => setReadings({ ...readings, totalAlkalinity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calcium Hardness (ppm)
              </label>
              <input
                type="number"
                min="0"
                max="1000"
                value={readings.calciumHardness}
                onChange={(e) => setReadings({ ...readings, calciumHardness: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cyanuric Acid (ppm)
              </label>
              <input
                type="number"
                min="0"
                max="200"
                value={readings.cyanuricAcid}
                onChange={(e) => setReadings({ ...readings, cyanuricAcid: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salt (ppm)
              </label>
              <input
                type="number"
                min="0"
                max="5000"
                value={readings.salt}
                onChange={(e) => setReadings({ ...readings, salt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                min="-10"
                max="50"
                value={readings.temperatureC}
                onChange={(e) => setReadings({ ...readings, temperatureC: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Method
              </label>
              <input
                type="text"
                value={readings.method}
                onChange={(e) => setReadings({ ...readings, method: e.target.value })}
                placeholder="e.g., Taylor Test Kit, Photometer"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reading Notes
              </label>
              <input
                type="text"
                value={readings.notes}
                onChange={(e) => setReadings({ ...readings, notes: e.target.value })}
                placeholder="Any observations about water quality"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Chemical Doses Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Chemical Doses</h3>
            <button
              type="button"
              onClick={handleAddDose}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              <PlusCircleIcon className="w-4 h-4 mr-1" />
              Add Chemical
            </button>
          </div>

          {doses.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No chemicals added yet. Click &quot;Add Chemical&quot; to record doses.
            </p>
          ) : (
            <div className="space-y-4">
              {doses.map((dose, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chemical *
                      </label>
                      <select
                        required
                        value={dose.chemical}
                        onChange={(e) => handleDoseChange(index, 'chemical', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select...</option>
                        <option value="LIQUID_CHLORINE">Liquid Chlorine</option>
                        <option value="MURIATIC_ACID">Muriatic Acid</option>
                        <option value="CHLORINE_TABLETS">Chlorine Tablets</option>
                        <option value="DICHLOR">Dichlor</option>
                        <option value="CAL_HYPO">Cal Hypo</option>
                        <option value="SODA_ASH">Soda Ash</option>
                        <option value="BAKING_SODA">Baking Soda</option>
                        <option value="STABILIZER">Stabilizer</option>
                        <option value="CALCIUM_CHLORIDE">Calcium Chloride</option>
                        <option value="ALGAECIDE">Algaecide</option>
                        <option value="CLARIFIER">Clarifier</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount *
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        required
                        value={dose.amount}
                        onChange={(e) => handleDoseChange(index, 'amount', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit *
                      </label>
                      <select
                        required
                        value={dose.unit}
                        onChange={(e) => handleDoseChange(index, 'unit', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="FL_OZ">fl oz</option>
                        <option value="GAL">gal</option>
                        <option value="ML">mL</option>
                        <option value="L">L</option>
                        <option value="OZ">oz</option>
                        <option value="LB">lb</option>
                        <option value="G">g</option>
                      </select>
                    </div>

                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product Name
                      </label>
                      <input
                        type="text"
                        value={dose.productName}
                        onChange={(e) => handleDoseChange(index, 'productName', e.target.value)}
                        placeholder="Brand/SKU"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cost ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={dose.costCents}
                        onChange={(e) => handleDoseChange(index, 'costCents', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveDose(index)}
                        className="p-2 text-red-600 hover:text-red-800 focus:outline-none"
                        title="Remove dose"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dose Notes
                    </label>
                    <input
                      type="text"
                      value={dose.notes}
                      onChange={(e) => handleDoseChange(index, 'notes', e.target.value)}
                      placeholder="Why was this chemical added?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
