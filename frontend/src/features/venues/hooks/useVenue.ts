// frontend/src/features/venues/hooks/useVenue.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';

// TypeScript interfaces
interface Venue {
  venueID: string;
  venueName: string;
  address?: string;
  city?: string;
  state?: string;
  capacity?: number;
  venueType?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  stageWidth?: number;
  stageDepth?: number;
  flyHeight?: number;
  equipment?: string[];
  venueNotes?: string;
  rentalRate?: number;
  minimumRental?: number;
  dateCreated: string;
  dateUpdated: string;
}

interface UseVenueReturn {
  venue: Venue | null;
  isLoading: boolean;
  error: string | null;
}

export const useVenue = (venueId: string | undefined): UseVenueReturn => {
    const { getToken } = useAuth();
    const [venue, setVenue] = useState<Venue | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchVenue = useCallback(async () => {
        if (!venueId) return;
        
        setIsLoading(true);
        try {
            const token = await getToken();
            if (!token) {
                setIsLoading(false);
                return;
            }
            
            const response = await fetch(`/api/venues/${venueId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch venue data.');
            }
            const data: Venue = await response.json();
            setVenue(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load venue';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [venueId, getToken]);

    useEffect(() => {
        fetchVenue();
    }, [fetchVenue]);

    return useMemo(() => ({ venue, isLoading, error }), [venue, isLoading, error]);
};
