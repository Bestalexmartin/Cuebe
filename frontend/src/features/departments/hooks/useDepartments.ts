// frontend/src/features/departments/hooks/useDepartments.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';

// TypeScript interfaces
interface Department {
    departmentID: string;
    departmentName: string;
    departmentDescription?: string;
    departmentColor?: string;
    dateCreated: string;
    dateUpdated: string;
}

interface UseDepartmentsReturn {
    departments: Department[];
    isLoading: boolean;
    error: string | null;
    refetchDepartments: () => void;
}

export const useDepartments = (): UseDepartmentsReturn => {
    const { getToken } = useAuth();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDepartments = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const token = await getToken();
            const response = await fetch('/api/me/departments', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch departments: ${response.status}`);
            }

            const departmentsData: Department[] = await response.json();
            setDepartments(departmentsData);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load departments';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [getToken]);

    const refetchDepartments = () => {
        fetchDepartments();
    };

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    return useMemo(() => ({
        departments,
        isLoading,
        error,
        refetchDepartments
    }), [departments, isLoading, error, refetchDepartments]);
};
