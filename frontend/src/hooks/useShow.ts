// frontend/src/hooks/useShow.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

// TypeScript interfaces
interface Venue {
  venueID: string;
  venueName: string;
}

interface Script {
  scriptID: string;
  scriptName: string;
  scriptNotes?: string;
  scriptStatus: string;
  showID: string;
  startTime: string;
  dateCreated: string;
  dateUpdated: string;
  lastUsed?: string;
}

interface Show {
  showID: string;
  showName: string;
  showDate?: string;
  showNotes?: string;
  deadline?: string;
  dateCreated: string;
  dateUpdated: string;
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

    return { show, isLoading, error };
};