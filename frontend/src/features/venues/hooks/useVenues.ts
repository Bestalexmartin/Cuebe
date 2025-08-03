// frontend/src/features/venues/hooks/useVenues.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';

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
  const { getToken } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVenues = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch('/api/me/venues', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch venues.');
      const data: Venue[] = await response.json();
      setVenues(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load venues';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  return useMemo(() => ({ venues, isLoading, error, refetchVenues: fetchVenues }), [venues, isLoading, error, fetchVenues]);
};
