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
    console.log('🏟️ [VENUES DEBUG] Starting fetchVenues');
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      console.log('🏟️ [VENUES DEBUG] Token obtained:', !!token);
      const response = await fetch('/api/me/venues', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('🏟️ [VENUES DEBUG] Response status:', response.status, response.statusText);
      if (!response.ok) {
        if (response.status === 404) {
          console.log('🏟️ [VENUES DEBUG] 404 - treating as empty list');
          setVenues([]);
          return;
        }
        if (response.status >= 500) {
          const errorMsg = `Database or server error (${response.status}). Please check if the database is running.`;
          console.log('🏟️ [VENUES DEBUG] 500+ error:', errorMsg);
          throw new Error(errorMsg);
        }
        const errorMsg = `Failed to fetch venues: ${response.status}`;
        console.log('🏟️ [VENUES DEBUG] Other error:', errorMsg);
        throw new Error(errorMsg);
      }
      const data: Venue[] = await response.json();
      console.log('🏟️ [VENUES DEBUG] Success, venues count:', data.length);
      setVenues(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load venues';
      console.log('🏟️ [VENUES DEBUG] Catch block error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      console.log('🏟️ [VENUES DEBUG] fetchVenues complete');
    }
  }, [getToken]);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  return useMemo(() => ({ venues, isLoading, error, refetchVenues: fetchVenues }), [venues, isLoading, error, fetchVenues]);
};
