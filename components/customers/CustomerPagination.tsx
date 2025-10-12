import { Error, Loading } from '@/components/shared';
import { Table } from '@/components/shared/table/Table';
import { Company, Customer } from '@prisma/client';
import useCustomers from 'hooks/useCustomers';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import React from 'react';
import { Button } from 'react-daisyui';
import AddCustomer from './AddCustomer';

interface CustomerPaginationProps {
  company: Company;
}

const CustomerPagination = ({ company }: CustomerPaginationProps) => {
  const { t } = useTranslation('common');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(13);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const { isLoading, isError, customers, pagination } = useCustomers(
    company.slug,
    currentPage,
    pageSize,
    debouncedSearch
  );
  const [editCustomerVisible, setEditCustomerVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditCustomerVisible(true);
  };

  const handleCloseEditModal = () => {
    setEditCustomerVisible(false);
    setSelectedCustomer(null);
  };

  const hasSearchQuery = debouncedSearch.length > 0;

  const cols = [
    t('name'),
    t('customer-address'),
    t('phone'),
    t('email'),
    t('actions'),
  ];

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const { page, totalPages, totalCount } = pagination;
    const startItem = (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, totalCount);

    return (
      <div className="flex items-center justify-between mt-4 px-4 py-3 border-t">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>
            {t('showing')} {startItem} {t('to')} {endItem} {t('of')} {totalCount} {t('results')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
          >
            {t('previous')}
          </Button>
          
          {/* Page numbers */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
            // Show first, last, current, and pages around current
            if (
              pageNum === 1 ||
              pageNum === totalPages ||
              (pageNum >= page - 1 && pageNum <= page + 1)
            ) {
              return (
                <Button
                  key={pageNum}
                  size="sm"
                  variant="outline"
                  color={pageNum === page ? 'primary' : undefined}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            } else if (pageNum === page - 2 || pageNum === page + 2) {
              return <span key={pageNum} className="px-2">...</span>;
            }
            return null;
          })}

          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
          >
            {t('next')}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="w-full sm:w-96">
          <input
            type="text"
            placeholder={t('search-customers')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-bordered w-full"
          />
        </div>
      </div>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <Error message={isError.message} />
      ) : !customers || customers.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {hasSearchQuery ? t('no-search-results') : t('no-customers-yet')}
        </div>
      ) : (
        <>
          <div className="w-full">
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
                    onClick: () => handleEditCustomer(customer),
                  },
                ],
              },
            ],
          };
              })}
            />
            {renderPagination()}
          </div>
        </>
      )}
      
      <AddCustomer
        visible={editCustomerVisible}
        setVisible={handleCloseEditModal}
        company={company}
        customer={selectedCustomer}
      />
    </div>
  );
};

export default CustomerPagination;