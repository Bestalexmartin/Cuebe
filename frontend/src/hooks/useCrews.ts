// frontend/src/hooks/useCrews.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

// TypeScript interfaces
interface CrewMember {
    userID: string;
    fullnameFirst?: string;
    fullnameLast?: string;
    emailAddress?: string;
    phoneNumber?: string;
    userRole?: string;
    userStatus?: string;
    isActive?: boolean;
    profileImgURL?: string;
    notes?: string; // User table notes
    relationshipNotes?: string; // Relationship table notes
    clerk_user_id?: string; // To identify current user
    dateCreated: string;
    dateUpdated: string;
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
            const response = await fetch('/api/me/crews', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch crew members: ${response.status}`);
            }

            const crewsData: CrewMember[] = await response.json();
            setCrews(crewsData);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load crew members';
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

    return {
        crews,
        isLoading,
        error,
        refetchCrews
    };
};