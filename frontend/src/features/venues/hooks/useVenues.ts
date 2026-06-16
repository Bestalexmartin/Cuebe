// frontend/src/features/venues/hooks/useVenues.ts

import { useMemo } from 'react';
import { useResource } from '../../../hooks/useResource';

// TypeScript interfaces
interface Venue {
  venue_id: string;
  venue_name: string;
  venue_type?: string;
  capacity?: number;
  address?: string;
  city?: string;
  state?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  stage_width?: number;
  stage_depth?: number;
  fly_height?: number;
  equipment?: string[];
  notes?: string;
  rental_rate?: number;
  minimum_rental?: number;
  date_created: string;
  date_updated: string;
}

interface UseVenuesReturn {
  venues: Venue[];
  isLoading: boolean;
  error: string | null;
  refetchVenues: () => Promise<void>;
}

export const useVenues = (): UseVenuesReturn => {
  const { data, isLoading, error, refetch } = useResource<Venue>('/api/me/venues', {
    showErrorToast: false,
    notFoundValue: [],
    getErrorMessage: (response) => {
      if (response.status >= 500) {
        return `Database or server error (${response.status}). Please check if the database is running.`;
      }
      return `Failed to fetch venues: ${response.status}`;
    },
  });

  return useMemo(() => ({ venues: data, isLoading, error, refetchVenues: refetch }), [data, isLoading, error, refetch]);
};
