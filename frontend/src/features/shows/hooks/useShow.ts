// frontend/src/features/shows/hooks/useShow.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';

// TypeScript interfaces
interface Venue {
  venue_id: string;
  venue_name: string;
}

interface Script {
  script_id: string;
  script_name: string;
  script_notes?: string;
  script_status: string;
  show_id: string;
  start_time: string;
  date_created: string;
  date_updated: string;
  lastUsed?: string;
}

interface Show {
  show_id: string;
  show_name: string;
  show_date?: string;
  show_notes?: string;
  deadline?: string;
  date_created: string;
  date_updated: string;
  venue?: Venue;
  scripts: Script[];
}

interface UseShowReturn {
  show: Show | null;
  isLoading: boolean;
  error: string | null;
}

export const useShow = (showId: string | undefined): UseShowReturn => {
    const { getToken } = useAuth();
    const [show, setShow] = useState<Show | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchShow = useCallback(async () => {
        if (!showId) return;
        
        setIsLoading(true);
        try {
            const token = await getToken();
            if (!token) {
                setIsLoading(false);
                return;
            }
            
            const response = await fetch(`/api/shows/${showId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch show data.');
            }
            const data: Show = await response.json();
            setShow(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load show';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [showId, getToken]);

    useEffect(() => {
        fetchShow();
    }, [fetchShow]);

    return useMemo(() => ({ show, isLoading, error }), [show, isLoading, error]);
};
