import { CustomerWithPoolsAndRoutes } from 'models/customer';
import { useRouter } from 'next/router';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'next-i18next';
import { useServiceHistory } from 'hooks/useServiceHistory';

interface ServiceHistoryComponentProps {
  customer: CustomerWithPoolsAndRoutes;
}

const ServiceHistoryComponent = ({ customer }: ServiceHistoryComponentProps) => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { slug, id } = router.query;
  
  // Fetch service history data
  const { serviceHistories, isLoading } = useServiceHistory({
    companySlug: slug as string,
    customerId: id as string,
  });

  // Flatten all routes from all pools
  const allRoutes = customer.pools.flatMap(pool => 
    pool.routes.map(route => ({
      ...route,
      poolName: pool.name,
      poolId: pool.id,
    }))
  );

  const handleAddServiceHistory = (routeId: string) => {
    router.push(`/companies/${slug}/customers/${id}/routes/${routeId}/service-history/new`);
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">{t('service-history')}</h2>
      </div>

      {allRoutes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No routes available. Create a route to start tracking service history.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {allRoutes.map((route) => (
            <div key={route.id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium">
                    {route.poolName} - {route.dayOfWeek}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {route.frequency} • Tech: {route.tech?.name || 'Unassigned'}
                  </p>
                </div>
                <button
                  onClick={() => handleAddServiceHistory(route.id)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none"
                >
                  <PlusCircleIcon className="w-5 h-5 mr-2" />
                  {t('add-service-record')}
                </button>
              </div>

              {/* Service history entries or placeholder */}
              {isLoading ? (
                <div className="text-center py-4 text-gray-400 text-sm">
                  Loading service records...
                </div>
              ) : serviceHistories.length > 0 ? (
                <div className="space-y-2">
                  {serviceHistories
                    .filter(history => history.route.id === route.id)
                    .map((history) => (
                      <div key={history.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div>
                          <span className="text-sm font-medium">
                            {new Date(history.serviceDate).toLocaleDateString()}
                          </span>
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                            history.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            history.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {t(`service-status-${history.status.toLowerCase()}`)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {history.technician?.name || 'Unassigned'}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">
                  {t('no-service-records-yet')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServiceHistoryComponent;

