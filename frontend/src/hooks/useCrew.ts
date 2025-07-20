// frontend/src/hooks/useCrew.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

// TypeScript interfaces
interface Department {
  departmentID: string;
  departmentName: string;
}

interface Crew {
  crewID: string;
  crewFirstName: string;
  crewLastName: string;
  crewEmail?: string;
  crewPhone?: string;
  crewAddress?: string;
  crewCity?: string;
  crewState?: string;
  crewZip?: string;
  crewCountry?: string;
  crewNotes?: string;
  departmentID: string;
  department?: Department;
  dateCreated: string;
  dateUpdated: string;
}

interface UseCrewReturn {
  crew: Crew | null;
  isLoading: boolean;
  error: string | null;
}

export const useCrew = (crewId: string | undefined): UseCrewReturn => {
    const { getToken } = useAuth();
    const [crew, setCrew] = useState<Crew | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCrew = useCallback(async () => {
        if (!crewId) return;
        
        setIsLoading(true);
        try {
            const token = await getToken();
            if (!token) {
                setIsLoading(false);
                return;
            }
            
            const response = await fetch(`/api/crew/${crewId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch crew data.');
            }
            const data: Crew = await response.json();
            setCrew(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load crew member';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [crewId, getToken]);

    useEffect(() => {
        fetchCrew();
    }, [fetchCrew]);

    return { crew, isLoading, error };
};