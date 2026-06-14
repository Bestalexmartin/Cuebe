// frontend/src/features/shows/hooks/useShowCrew.ts

import { useState, useEffect, useCallback } from 'react';
import { useApiFetch } from '../../../hooks/useApiFetch';

export interface CrewMember {
    assignment_id: string;
    user_id: string;
    department_id: string;
    show_role?: string;
    is_active: boolean;
    date_assigned: string;
    
    // User info
    fullname_first: string;
    fullname_last: string;
    email_address: string;
    user_status: 'GUEST' | 'VERIFIED';
    
    // Department info
    department_name: string;
    department_color?: string;
    department_initials?: string;
}

interface UseShowCrewReturn {
    crewMembers: CrewMember[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export const useShowCrew = (showId: string): UseShowCrewReturn => {
    const apiFetch = useApiFetch();
    const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchShowCrew = useCallback(async () => {
        if (!showId) return;

        try {
            setIsLoading(true);
            setError(null);

            const response = await apiFetch(`/api/shows/${showId}/crew`);

            if (!response.ok) {
                throw new Error(`Failed to fetch show crew: ${response.status}`);
            }

            const data = await response.json();
            setCrewMembers(data);
        } catch (err) {
            console.error('Error fetching show crew:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch show crew');
        } finally {
            setIsLoading(false);
        }
    }, [showId, apiFetch]);

    const refetch = useCallback(async () => {
        await fetchShowCrew();
    }, [fetchShowCrew]);

    useEffect(() => {
        fetchShowCrew();
    }, [fetchShowCrew]);

    return {
        crewMembers,
        isLoading,
        error,
        refetch
    };
};