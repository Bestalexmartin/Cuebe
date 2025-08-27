// frontend/src/features/shows/hooks/useShows.ts

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";

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
  last_used?: string;
  is_shared: boolean;
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
    console.log('🎭 [SHOWS DEBUG] Starting fetchShows');
    setIsLoading(true);
    try {
      const token = await getToken();
      console.log('🎭 [SHOWS DEBUG] Token obtained:', !!token);
      if (!token) {
        console.log('🎭 [SHOWS DEBUG] No token, returning early');
        setIsLoading(false);
        return;
      }
      const response = await fetch("/api/me/shows", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('🎭 [SHOWS DEBUG] Response status:', response.status, response.statusText);
      if (!response.ok) {
        if (response.status >= 500) {
          const errorMsg = `Database or server error (${response.status}). Please check if the database is running.`;
          console.log('🎭 [SHOWS DEBUG] 500+ error:', errorMsg);
          throw new Error(errorMsg);
        }
        const errorMsg = `Failed to fetch shows: ${response.status}`;
        console.log('🎭 [SHOWS DEBUG] Other error:', errorMsg);
        throw new Error(errorMsg);
      }
      const data: Show[] = await response.json();
      console.log('🎭 [SHOWS DEBUG] Success, shows count:', data.length);
      setShows(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load shows";
      console.log('🎭 [SHOWS DEBUG] Catch block error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      console.log('🎭 [SHOWS DEBUG] fetchShows complete');
    }
  }, [getToken]);

  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  return useMemo(
    () => ({ shows, isLoading, error, refetchShows: fetchShows }),
    [shows, isLoading, error, fetchShows],
  );
};
