// frontend/src/hooks/useVenues.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

// TypeScript interfaces
interface Venue {
  venueID: string;
  venueName: string;
  venueType?: string;
  capacity?: number;
  address?: string;
  city?: string;
  state?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  stageWidth?: number;
  stageDepth?: number;
  flyHeight?: number;
  equipment?: string[];
  notes?: string;
  rentalRate?: number;
  minimumRental?: number;
  dateCreated: string;
  dateUpdated: string;
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

  return { venues, isLoading, error, refetchVenues: fetchVenues };
};