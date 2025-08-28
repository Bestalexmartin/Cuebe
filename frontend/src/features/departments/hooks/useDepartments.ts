// frontend/src/features/departments/hooks/useDepartments.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';

// TypeScript interfaces
interface DepartmentCrewAssignment {
    assignment_id: string;
    show_id: string;
    show_name: string;
    user_id: string;
    fullname_first?: string;
    fullname_last?: string;
    email_address?: string;
    profile_img_url?: string;
    role?: string;
}

interface Department {
    department_id: string;
    department_name: string;
    department_description?: string;
    department_color?: string;
    department_initials?: string;
    date_created: string;
    date_updated: string;
    shows_assigned_count?: number;
    unique_crew_count?: number;
    crew_assignments?: DepartmentCrewAssignment[];
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
                if (response.status === 404) {
                    setDepartments([]);
                    return;
                }
                if (response.status >= 500) {
                    throw new Error(`Database or server error (${response.status}). Please check if the database is running.`);
                }
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
