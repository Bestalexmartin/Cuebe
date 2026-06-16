// frontend/src/features/shows/hooks/useShows.ts

import { useMemo } from "react";
import { useResource } from "../../../hooks/useResource";

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
  const { data, isLoading, error, refetch } = useResource<Show>("/api/me/shows", {
    showErrorToast: false,
    getErrorMessage: (response) => {
      if (response.status >= 500) {
        return `Database or server error (${response.status}). Please check if the database is running.`;
      }
      return `Failed to fetch shows: ${response.status}`;
    },
  });

  return useMemo(
    () => ({ shows: data, isLoading, error, refetchShows: refetch }),
    [data, isLoading, error, refetch],
  );
};
