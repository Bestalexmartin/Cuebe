// frontend/src/features/shows/hooks/useShows.ts

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
  date_created: string;
  date_updated: string;
  venue?: Venue;
  scripts: Script[];
}

interface UseShowsReturn {
  shows: Show[];
  isLoading: boolean;
  error: string | null;
  refetchShows: () => Promise<void>;
}

export const useShows = (): UseShowsReturn => {
  const { getToken } = useAuth();
  const [shows, setShows] = useState<Show[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // We wrap fetchShows in useCallback so it doesn't get recreated on every render
  const fetchShows = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      const response = await fetch('/api/me/shows', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Something went wrong fetching your shows.');
      }
      const data: Show[] = await response.json();
      setShows(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load shows';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  return useMemo(() => ({ shows, isLoading, error, refetchShows: fetchShows }), [shows, isLoading, error, fetchShows]);
};
