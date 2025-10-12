import { Error, Loading } from '@/components/shared';
import { Table } from '@/components/shared/table/Table';
import { Company } from '@prisma/client';
import useCustomers from 'hooks/useCustomers';
import { useTranslation } from 'next-i18next';

interface CustomerPaginationProps {
  company: Company;
}

const CustomerPagination = ({ company }: CustomerPaginationProps) => {
  const { t } = useTranslation('common');
  const { isLoading, isError, customers } = useCustomers(company.slug);

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return <Error message={isError.message} />;
  }

  if (!customers || customers.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        {t('no-customers-yet')}
      </div>
    );
  }

  const cols = [
    t('name'),
    t('customer-address'),
    t('phone'),
    t('email'),
    t('actions'),
  ];

  return (
    <div className="mt-6">
      <Table
        cols={cols}
        body={customers.map((customer) => {
          // Format full name
          const fullName = `${customer.firstName} ${customer.lastName}`;

          // Format address
          const addressParts = [
            customer.addressStreet,
            customer.addressCity,
            customer.addressState,
            customer.addressZip,
          ].filter(Boolean);
          const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : '-';

          return {
            id: customer.id,
            cells: [
              {
                wrap: true,
                text: fullName,
                minWidth: 150,
              },
              {
                wrap: true,
                text: fullAddress,
                minWidth: 250,
              },
              {
                wrap: true,
                text: customer.phone || '-',
                minWidth: 120,
              },
              {
                wrap: true,
                text: customer.email || '-',
                minWidth: 200,
              },
              {
                buttons: [
                  {
                    color: 'primary',
                    text: t('edit'),
                    onClick: () => {
                      // TODO: Implement edit functionality
                      console.log('Edit customer:', customer.id);
                    },
                  },
                ],
              },
            ],
          };
        })}
      />
    </div>
  );
};

export default CustomerPagination;