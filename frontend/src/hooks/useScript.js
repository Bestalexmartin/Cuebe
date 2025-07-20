// frontend/src/hooks/useScript.js

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

export const useScript = (scriptId) => {
    const { getToken } = useAuth();
    const [script, setScript] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchScript = useCallback(async () => {
        if (!scriptId) return;
        
        setIsLoading(true);
        try {
            const token = await getToken();
            const response = await fetch(`/api/scripts/${scriptId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch script data.');
            }
            const data = await response.json();
            setScript(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [scriptId, getToken]);

    useEffect(() => {
        fetchScript();
    }, [fetchScript]);

    return { script, isLoading, error };
};