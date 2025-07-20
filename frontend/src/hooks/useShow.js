// frontend/src/hooks/useShow.js

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

export const useShow = (showId) => {
    const { getToken } = useAuth();
    const [show, setShow] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchShow = useCallback(async () => {
        if (!showId) return;
        
        setIsLoading(true);
        try {
            const token = await getToken();
            const response = await fetch(`/api/shows/${showId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch show data.');
            }
            const data = await response.json();
            setShow(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [showId, getToken]);

    useEffect(() => {
        fetchShow();
    }, [fetchShow]);

    return { show, isLoading, error };
};