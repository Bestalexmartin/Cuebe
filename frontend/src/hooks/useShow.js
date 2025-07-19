// frontend/src/useShow.js

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

export const useShow = (showId) => {
    const { getToken } = useAuth();
    const [show, setShow] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!showId) return;
        const fetchShow = async () => {
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
        };

        fetchShow();
    }, [showId, getToken]);

    return { show, isLoading, error };
};