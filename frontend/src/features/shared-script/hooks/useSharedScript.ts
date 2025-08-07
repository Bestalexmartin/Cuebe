// frontend/src/features/shared-script/hooks/useSharedScript.ts

import { useState, useEffect, useCallback } from 'react';
import { SharedScriptData, SharedScriptError } from '../types/sharedScript';

interface UseSharedScriptReturn {
    scriptData: SharedScriptData | null;
    isLoading: boolean;
    error: string | null;
    isExpired: boolean;
    refetch: () => Promise<void>;
}

export const useSharedScript = (token: string): UseSharedScriptReturn => {
    const [scriptData, setScriptData] = useState<SharedScriptData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isExpired, setIsExpired] = useState(false);

    const fetchScriptData = useCallback(async () => {
        if (!token) {
            setError('No sharing token provided');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // First validate the token
            const validateResponse = await fetch(`/api/shared-scripts/${token}/validate`);
            
            if (!validateResponse.ok) {
                throw new Error('Invalid or expired sharing token');
            }

            const validation = await validateResponse.json();
            
            if (!validation.is_valid) {
                if (validation.error_message?.includes('expired')) {
                    setIsExpired(true);
                    setError('This sharing link has expired');
                } else {
                    setError(validation.error_message || 'Invalid sharing token');
                }
                setIsLoading(false);
                return;
            }

            // If validation passes, fetch the actual script data
            const scriptResponse = await fetch(`/api/shared-scripts/${token}`);

            if (!scriptResponse.ok) {
                if (scriptResponse.status === 410) {
                    setIsExpired(true);
                    setError('This sharing link has expired');
                } else if (scriptResponse.status === 404) {
                    setError('Shared script not found');
                } else if (scriptResponse.status === 403) {
                    setError('Access denied to this shared script');
                } else {
                    throw new Error(`Failed to fetch script: ${scriptResponse.status}`);
                }
                setIsLoading(false);
                return;
            }

            const data = await scriptResponse.json();
            
            // Check if the script is expired based on the data
            if (data.expires_at) {
                const expiresAt = new Date(data.expires_at);
                const now = new Date();
                if (expiresAt <= now) {
                    setIsExpired(true);
                    setError('This sharing link has expired');
                    setIsLoading(false);
                    return;
                }
            }

            setScriptData(data);
            setIsExpired(false);
            
        } catch (err) {
            console.error('Error fetching shared script:', err);
            setError(err instanceof Error ? err.message : 'Failed to load shared script');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    // Refetch function for manual refresh
    const refetch = useCallback(async () => {
        await fetchScriptData();
    }, [fetchScriptData]);

    // Initial fetch
    useEffect(() => {
        fetchScriptData();
    }, [fetchScriptData]);

    // Set up auto-refresh interval for live updates (every 30 seconds)
    useEffect(() => {
        if (scriptData && !isExpired && !error) {
            const interval = setInterval(() => {
                fetchScriptData();
            }, 30000); // 30 seconds

            return () => clearInterval(interval);
        }
    }, [scriptData, isExpired, error, fetchScriptData]);

    return {
        scriptData,
        isLoading,
        error,
        isExpired,
        refetch
    };
};