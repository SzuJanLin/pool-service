import useSWR from 'swr';

interface Photo {
  key: string;
  filename: string;
  size: number;
  lastModified?: Date;
  downloadUrl: string;
  url: string;
}

interface UseCustomerPhotosResult {
  photos: Photo[];
  isLoading: boolean;
  error: any;
  mutate: () => void;
}

const fetcher = async (url: string): Promise<Photo[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch photos');
  }
  const result = await response.json();
  return result.data || [];
};

export function useCustomerPhotos(companySlug: string, customerId: string): UseCustomerPhotosResult {
  const { data, error, mutate } = useSWR(
    companySlug && customerId 
      ? `/api/customers/${customerId}/photos?companySlug=${companySlug}`
      : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  return {
    photos: data || [],
    isLoading: !error && !data,
    error,
    mutate,
  };
}
