// frontend/src/hooks/useVenue.js
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

export const useVenue = (venueId) => {
    const { getToken } = useAuth();
    const [venue, setVenue] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!venueId) return;

        const fetchVenue = async () => {
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
        };

        fetchVenue();
    }, [venueId, getToken]);

    return { venue, isLoading, error };
};