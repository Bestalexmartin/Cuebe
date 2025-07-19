// frontend/src/hooks/useCrew.js
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

export const useCrew = (crewId) => {
    const { getToken } = useAuth();
    const [crew, setCrew] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!crewId) return;

        const fetchCrew = async () => {
            setIsLoading(true);
            try {
                const token = await getToken();
                const response = await fetch(`/api/crew/${crewId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch crew data.');
                }
                const data = await response.json();
                setCrew(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCrew();
    }, [crewId, getToken]);

    return { crew, isLoading, error };
};