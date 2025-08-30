// frontend/src/features/script/hooks/useScript.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';

// TypeScript interfaces
interface Script {
  script_id: string;
  script_name: string;
  script_notes?: string;
  script_status: string;
  show_id: string;
  start_time: string;
  end_time?: string;
  date_created: string;
  date_updated: string;
  lastUsed?: string;
  is_shared: boolean;
}

interface UseScriptReturn {
  script: Script | null;
  isLoading: boolean;
  error: string | null;
  refetchScript: () => Promise<void>;
}

interface UseScriptOptions {
  onSuccess?: (script: Script) => void;
}

export const useScript = (scriptId: string | undefined, shareToken?: string, options?: UseScriptOptions): UseScriptReturn => {
    const { getToken } = useAuth();
    const [script, setScript] = useState<Script | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchScript = useCallback(async () => {
        if (!scriptId) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            let response: Response;
            
            if (shareToken) {
                // Use share token authentication
                response = await fetch(`/api/scripts/${scriptId}?share_token=${encodeURIComponent(shareToken)}`);
            } else {
                // Use bearer token authentication
                const token = await getToken();
                if (!token) {
                    setIsLoading(false);
                    return;
                }
                response = await fetch(`/api/scripts/${scriptId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
            
            if (!response.ok) {
                throw new Error('Failed to fetch script data.');
            }
            
            const data: Script = await response.json();
            console.log('📄 Script loaded:', data.script_id, data.script_name);
            
            setScript(data);
            options?.onSuccess?.(data);
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load script';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [scriptId, getToken, shareToken]);

    useEffect(() => {
        fetchScript();
    }, [fetchScript]);

    return useMemo(() => ({ 
        script, 
        isLoading, 
        error, 
        refetchScript: fetchScript 
    }), [script, isLoading, error, fetchScript]);
};
