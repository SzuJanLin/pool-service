import useSWR from 'swr';
import { useState } from 'react';
import fetcher from '@/lib/fetcher';
import type { ApiResponse } from 'types';

export interface ServiceHistoryWithRelations {
  id: string;
  routeId: string;
  serviceDate: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  technicianId?: string | null;
  companyId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  route: {
    id: string;
    dayOfWeek: string;
    frequency: string;
    pool: {
      id: string;
      name: string;
      customer: {
        id: string;
        firstName: string;
        lastName: string;
      };
    };
  };
  technician?: {
    id: string;
    name: string;
    email: string;
  } | null;
  readings: {
    id: string;
    readingDefinitionId: string;
    value: string;
    measuredAt: string;
    readingDefinition: {
      id: string;
      name: string;
      unit?: string | null;
    };
  }[];
  dosages: {
    id: string;
    dosageDefinitionId: string;
    value: string;
    productName?: string | null;
    notes?: string | null;
    createdAt: string;
    dosageDefinition: {
      id: string;
      name: string;
      unit?: string | null;
    };
  }[];
}

interface UseServiceHistoryOptions {
  companySlug: string;
  customerId: string;
  routeId?: string;
  status?: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  dateFrom?: string;
  dateTo?: string;
  technicianId?: string;
  page?: number;
  pageSize?: number;
}

export const useServiceHistory = (options: UseServiceHistoryOptions) => {
  const { companySlug, customerId, ...filters } = options;
  
  // Build query string from filters
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  });
  
  const queryString = queryParams.toString();
  const url = `/api/companies/${companySlug}/customers/${customerId}/service-history${queryString ? `?${queryString}` : ''}`;

  const {
    data,
    error,
    isLoading,
    mutate
  } = useSWR<ApiResponse<ServiceHistoryWithRelations[]> & { totalCount: number }>(
    companySlug && customerId ? url : null,
    fetcher
  );

  return {
    serviceHistories: data?.data || [],
    totalCount: data?.totalCount || 0,
    isLoading,
    error,
    mutate,
  };
};

export const useServiceHistoryItem = (companySlug: string, customerId: string, historyId?: string) => {
  const {
    data,
    error,
    isLoading,
    mutate
  } = useSWR<ApiResponse<ServiceHistoryWithRelations>>(
    companySlug && customerId && historyId 
      ? `/api/companies/${companySlug}/customers/${customerId}/service-history/${historyId}`
      : null,
    fetcher
  );

  return {
    serviceHistory: data?.data,
    isLoading,
    error,
    mutate,
  };
};

export const useServiceHistoryMutations = (companySlug: string, customerId: string) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const createServiceHistory = async (data: any) => {
    setIsCreating(true);
    try {
      const response = await fetch(`/api/companies/${companySlug}/customers/${customerId}/service-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to create service history');
      }

      return result.data;
    } finally {
      setIsCreating(false);
    }
  };

  const updateServiceHistory = async (historyId: string, data: any) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/companies/${companySlug}/customers/${customerId}/service-history/${historyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to update service history');
      }

      return result.data;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteServiceHistory = async (historyId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/companies/${companySlug}/customers/${customerId}/service-history/${historyId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to delete service history');
      }

      return result.data;
    } finally {
      setIsDeleting(false);
    }
  };

  const updateReadings = async (historyId: string, readings: any) => {
    const response = await fetch(`/api/companies/${companySlug}/customers/${customerId}/service-history/${historyId}/readings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(readings),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to update readings');
    }

    return result.data;
  };

  const addDosage = async (historyId: string, dose: { dosageDefinitionId: string; value: string; productName?: string; notes?: string }) => {
    const response = await fetch(`/api/companies/${companySlug}/customers/${customerId}/service-history/${historyId}/doses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dose),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to add dosage');
    }

    return result.data;
  };

  const deleteDosage = async (historyId: string, doseId: string) => {
    const response = await fetch(`/api/companies/${companySlug}/customers/${customerId}/service-history/${historyId}/doses/${doseId}`, {
      method: 'DELETE',
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to delete dosage');
    }

    return result.data;
  };

  return {
    createServiceHistory,
    updateServiceHistory,
    deleteServiceHistory,
    updateReadings,
    addDosage,
    deleteDosage,
    isCreating,
    isUpdating,
    isDeleting,
  };
};
