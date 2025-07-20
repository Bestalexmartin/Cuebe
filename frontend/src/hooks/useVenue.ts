// frontend/src/hooks/useVenue.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

// TypeScript interfaces
interface Venue {
  venueID: string;
  venueName: string;
  venueAddress?: string;
  venueCity?: string;
  venueState?: string;
  venueZip?: string;
  venueCountry?: string;
  venuePhone?: string;
  venueEmail?: string;
  venueWebsite?: string;
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

    return { venue, isLoading, error };
};