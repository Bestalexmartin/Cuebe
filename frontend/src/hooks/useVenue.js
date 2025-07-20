// frontend/src/hooks/useVenue.js

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

export const useVenue = (venueId) => {
    const { getToken } = useAuth();
    const [venue, setVenue] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchVenue = useCallback(async () => {
        if (!venueId) return;
        
        setIsLoading(true);
        try {
            const token = await getToken();
            const response = await fetch(`/api/venues/${venueId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch venue data.');
            }
            const data = await response.json();
            setVenue(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [venueId, getToken]);

    useEffect(() => {
        fetchVenue();
    }, [fetchVenue]);

    return { venue, isLoading, error };
};