// frontend/src/features/crew/hooks/useCrews.ts

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";

// TypeScript interfaces
interface CrewMember {
  user_id: string;
  fullname_first?: string;
  fullname_last?: string;
  email_address?: string;
  phone_number?: string;
  user_role?: string;
  user_status?: string;
  is_active?: boolean;
  profile_img_url?: string;
  notes?: string; // User table notes
  relationship_notes?: string; // Relationship table notes
  clerk_user_id?: string; // To identify current user
  date_created: string;
  date_updated: string;
}

interface UseCrewsReturn {
  crews: CrewMember[];
  isLoading: boolean;
  error: string | null;
  refetchCrews: () => void;
}

export const useCrews = (): UseCrewsReturn => {
  const { getToken } = useAuth();
  const [crews, setCrews] = useState<CrewMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCrews = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await getToken();
      const response = await fetch("/api/me/crews", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setCrews([]);
          return;
        }
        if (response.status >= 500) {
          throw new Error(`Database or server error (${response.status}). Please check if the database is running.`);
        }
        throw new Error(`Failed to fetch crew members: ${response.status}`);
      }

      const crewsData: CrewMember[] = await response.json();
      setCrews(crewsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load crew members";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  const refetchCrews = () => {
    fetchCrews();
  };

  useEffect(() => {
    fetchCrews();
  }, [fetchCrews]);

  return useMemo(() => ({
    crews,
    isLoading,
    error,
    refetchCrews,
  }), [crews, isLoading, error, refetchCrews]);
};
