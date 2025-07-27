// frontend/src/hooks/useShows.ts

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
  dateCreated: string;
  dateUpdated: string;
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

  return { shows, isLoading, error, refetchShows: fetchShows };
};