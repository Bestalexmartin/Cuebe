// frontend/src/features/shows/hooks/useShow.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApiFetch } from '../../../hooks/useApiFetch';

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
  is_shared: boolean;
}

interface CrewAssignment {
  assignment_id: string;
  show_id: string;
  user_id: string;
  department_id: string;
  show_role?: string;
  share_link_id?: string;
  share_expires_at?: string;
  is_active: boolean;
  date_assigned: string;
}

interface Show {
  show_id: string;
  show_name: string;
  show_date?: string;
  show_end?: string;
  show_notes?: string;
  deadline?: string;
  date_created: string;
  date_updated: string;
  venue?: Venue;
  scripts: Script[];
  crew?: CrewAssignment[];
}

interface UseShowReturn {
  show: Show | null;
  isLoading: boolean;
  error: string | null;
}

export const useShow = (showId: string | undefined): UseShowReturn => {
    const apiFetch = useApiFetch();
    const [show, setShow] = useState<Show | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchShow = useCallback(async () => {
        if (!showId) return;
        
        setIsLoading(true);
        try {
            const response = await apiFetch(`/api/shows/${showId}`);

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
    }, [showId, apiFetch]);

    useEffect(() => {
        fetchShow();
    }, [fetchShow]);

    return useMemo(() => ({ show, isLoading, error }), [show, isLoading, error]);
};
