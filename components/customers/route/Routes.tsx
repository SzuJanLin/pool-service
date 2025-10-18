import { User } from "@prisma/client";
import { useState } from 'react';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import Modal from '../../shared/Modal';
import AddRoute from './AddRoute';
import { defaultHeaders } from '@/lib/common';
import toast from 'react-hot-toast';
import type { CustomerWithPoolsAndRoutes } from 'models/customer';

interface RoutesProps {
  customer: CustomerWithPoolsAndRoutes;
  technicians: User[];
  company: any; // Company type
  onRouteAdded?: () => void;
}

const RoutesComponent = ({ customer, technicians, company, onRouteAdded }: RoutesProps) => {
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);

  // Flatten all routes from all pools
  const allRoutes = customer.pools.flatMap(pool => 
    pool.routes.map(route => ({
      ...route,
      poolName: pool.name,
      poolId: pool.id,
    }))
  );

  const [editingRoute, setEditingRoute] = useState<any | null>(null);

  const handleEdit = (route: any) => {
    setEditingRoute(route);
    setShowAddRouteModal(true);
  };

  const handleDelete = async (route: any) => {
    if (!confirm('Are you sure you want to delete this route?')) return;
    try {
      const url = `/api/companies/${company.slug}/customers/${customer.id}/routes?poolId=${encodeURIComponent(
        route.poolId
      )}&routeId=${encodeURIComponent(route.id)}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: defaultHeaders,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message || 'Failed to delete route');
        return;
      }
      toast.success('Route deleted');
      if (onRouteAdded) onRouteAdded();
    } catch (err) {
      console.error('delete route error', err);
      toast.error('Failed to delete route');
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  const formatDayOfWeek = (day: string) => {
    return day.charAt(0) + day.slice(1).toLowerCase();
  };

  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case 'WEEKLY':
        return 'Weekly';
      case 'BIWEEKLY':
        return 'Bi-weekly';
      case 'MONTHLY':
        return 'Monthly';
      case 'CUSTOM':
        return 'Custom';
      default:
        return frequency;
    }
  };

  if (allRoutes.length === 0) {
    return (
      <div className="mt-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Service Routes
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  All service routes for {customer.firstName} {customer.lastName}&apos;s pools
                </p>
              </div>
              <button
                onClick={() => setShowAddRouteModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusCircleIcon className="w-4 h-4 mr-2" />
                Add Route
              </button>
            </div>
          </div>
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-2">No routes found</div>
            <div className="text-gray-400 text-sm">
              Routes will appear here once they are created for this customer&apos;s pools.
            </div>
          </div>
        </div>
        
        {/* Add Route Modal */}
          <Modal open={showAddRouteModal} close={() => { setShowAddRouteModal(false); setEditingRoute(null); }}>
          <Modal.Header>Add Route</Modal.Header>
          <Modal.Description>Create a new service route for this customer&apos;s pools.</Modal.Description>
          <Modal.Body>
            <AddRoute
              company={company}
              customer={customer}
              technicians={technicians}
              onSuccess={() => {
                setShowAddRouteModal(false);
                if (onRouteAdded) {
                  onRouteAdded();
                }
              }}
              onCancel={() => setShowAddRouteModal(false)}
            />
          </Modal.Body>
        </Modal>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Service Routes
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                All service routes for {customer.firstName} {customer.lastName}&apos;s pools
              </p>
            </div>
            <button
              onClick={() => setShowAddRouteModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusCircleIcon className="w-4 h-4 mr-2" />
              Add Route
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pool
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Technician
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Day
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frequency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  End Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allRoutes.map((route) => (
                <tr key={route.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {route.poolName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {route.tech ? route.tech.name : 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDayOfWeek(route.dayOfWeek)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatFrequency(route.frequency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(route.startOn)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {route.stopAfter ? formatDate(route.stopAfter) : 'Ongoing'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      route.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {route.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleEdit(route)} className="text-indigo-600 hover:text-indigo-900 mr-3">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(route)} className="text-red-600 hover:text-red-900">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Add Route Modal */}
      <Modal open={showAddRouteModal} close={() => setShowAddRouteModal(false)}>
        <Modal.Header>Add Route</Modal.Header>
        <Modal.Description>Create a new service route for this customer&apos;s pools.</Modal.Description>
        <Modal.Body>
          <AddRoute
            company={company}
            customer={customer}
            technicians={technicians}
            route={editingRoute}
            onSuccess={() => {
              setShowAddRouteModal(false);
              setEditingRoute(null);
              if (onRouteAdded) {
                onRouteAdded();
              }
            }}
            onCancel={() => { setShowAddRouteModal(false); setEditingRoute(null); }}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default RoutesComponent;
