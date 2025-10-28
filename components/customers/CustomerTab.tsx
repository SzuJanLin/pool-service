import {
  IdentificationIcon,
  MapIcon,
  PhotoIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline';
import type { CustomerWithPoolsAndRoutes } from 'models/customer';
import classNames from 'classnames';
import Link from 'next/link';

interface CustomerTabProps {
  activeTab: string;
  customer: CustomerWithPoolsAndRoutes;
  companySlug: string;
}

const CustomerTab = ({ activeTab, customer, companySlug }: CustomerTabProps) => {
  const customerId = customer.id;
  const customerName = `${customer.firstName} ${customer.lastName}`;

  const navigations = [
    {
      name: 'Profile',
      href: `/companies/${companySlug}/customers/${customerId}`,
      active: activeTab === 'profile' || activeTab === 'index',
      icon: IdentificationIcon,
    },
    {
      name: 'Routes',
      href: `/companies/${companySlug}/customers/${customerId}/routes`,
      active: activeTab === 'routes',
      icon: MapIcon,
    },
    {
      name: 'Photos',
      href: `/companies/${companySlug}/customers/${customerId}/photos`,
      active: activeTab === 'photos',
      icon: PhotoIcon,
    },
    {
      name: 'Pools',
      href: `/companies/${companySlug}/customers/${customerId}/pools`,
      active: activeTab === 'pools',
      icon: BuildingLibraryIcon,
    },
  ];

  return (
    <div className="flex flex-col pb-6">
      <h2 className="text-xl font-semibold mb-2">
        {customerName}
      </h2>
      <nav
        className="flex flex-wrap border-b border-gray-300"
        aria-label="Tabs"
      >
        {navigations.map((menu) => {
          const Icon = menu.icon;
          return (
            <Link
              href={menu.href}
              key={menu.href}
              className={classNames(
                'inline-flex items-center border-b-2 py-2 md-py-4 mr-5 text-sm font-medium',
                menu.active
                  ? 'border-gray-900 text-gray-700 dark:text-gray-100'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:dark:text-gray-100'
              )}
            >
              <Icon className="w-5 h-5 mr-1" />
              {menu.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default CustomerTab;

