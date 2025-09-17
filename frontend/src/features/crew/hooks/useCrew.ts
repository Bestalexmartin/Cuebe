// frontend/src/features/crew/hooks/useCrew.ts

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { getApiUrl } from '../../../config/api';


// TypeScript interfaces
interface UserDepartmentAssignment {
  assignment_id: string;
  show_id: string;
  show_name: string;
  department_id: string;
  department_name: string;
  department_color?: string;
  department_initials?: string;
  venue_name?: string;
  venue_city?: string;
  venue_state?: string;
  show_date?: string;
  role?: string;
}

interface Crew {
  user_id: string;
  clerk_user_id?: string;
  email_address: string;
  fullname_first: string;
  fullname_last: string;
  user_name?: string;
  profile_img_url?: string;
  phone_number?: string;
  user_status: string;
  user_role: string;
  created_by?: string;
  is_active: boolean;
  date_created: string;
  date_updated: string;
  relationship_notes?: string; // Notes from the relationship, not user notes
  department_assignments?: UserDepartmentAssignment[];
}

interface UseCrewReturn {
  crew: Crew | null;
  isLoading: boolean;
  error: string | null;
  fetchCrew: () => Promise<void>;
  refetchCrew: () => Promise<void>;
}

export const useCrew = (crewId: string | undefined, autoFetch: boolean = true): UseCrewReturn => {
  const { getToken } = useAuth();
  const [crew, setCrew] = useState<Crew | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchCrew = useCallback(async () => {
    if (!crewId) return;

    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(getApiUrl(`/api/crew/${crewId}/assignments`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch crew data.");
      }
      const data: Crew = await response.json();
      setCrew(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load crew member";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [crewId, getToken]);

  useEffect(() => {
    if (autoFetch) {
      fetchCrew();
    }
  }, [fetchCrew, autoFetch]);

  const refetchCrew = useCallback(async () => {
    await fetchCrew();
  }, [fetchCrew]);

  return useMemo(() => ({ crew, isLoading, error, fetchCrew, refetchCrew }), [crew, isLoading, error, fetchCrew, refetchCrew]);
};
