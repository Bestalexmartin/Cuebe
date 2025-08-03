// frontend/src/features/venues/hooks/useVenue.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';

// TypeScript interfaces
interface Venue {
  venue_id: string;
  venue_name: string;
  address?: string;
  city?: string;
  state?: string;
  capacity?: number;
  venue_type?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  stage_width?: number;
  stage_depth?: number;
  fly_height?: number;
  equipment?: string[];
  venue_notes?: string;
  rental_rate?: number;
  minimum_rental?: number;
  date_created: string;
  date_updated: string;
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
