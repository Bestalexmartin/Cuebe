// frontend/src/useCrews.js

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

export const useCrews = () => {
    const { getToken } = useAuth();
    const [crews, setCrews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCrews = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const token = await getToken();
            const response = await fetch('/api/crew/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch crew members: ${response.status}`);
            }

            const crewsData = await response.json();
            setCrews(crewsData);
        } catch (err) {
            setError(err.message || 'Failed to load crew members');
        } finally {
            setIsLoading(false);
        }
    };

    const refetchCrews = () => {
        fetchCrews();
    };

    useEffect(() => {
        fetchCrews();
    }, []);

    return {
        crews,
        isLoading,
        error,
        refetchCrews
    };
};