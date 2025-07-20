// frontend/src/hooks/useScript.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

// TypeScript interfaces
interface Script {
  scriptID: string;
  scriptName: string;
  scriptStatus: string;
  showID: string;
  startTime: string;
  dateCreated: string;
  dateUpdated: string;
  lastUsed?: string;
}

interface UseScriptReturn {
  script: Script | null;
  isLoading: boolean;
  error: string | null;
}

export const useScript = (scriptId: string | undefined): UseScriptReturn => {
    const { getToken } = useAuth();
    const [script, setScript] = useState<Script | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchScript = useCallback(async () => {
        if (!scriptId) return;
        
        setIsLoading(true);
        try {
            const token = await getToken();
            if (!token) {
                setIsLoading(false);
                return;
            }
            
            const response = await fetch(`/api/scripts/${scriptId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch script data.');
            }
            const data: Script = await response.json();
            setScript(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load script';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [scriptId, getToken]);

    useEffect(() => {
        fetchScript();
    }, [fetchScript]);

    return { script, isLoading, error };
};