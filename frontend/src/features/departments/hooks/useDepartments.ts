// frontend/src/features/departments/hooks/useDepartments.ts

import { useMemo } from 'react';
import { useResource } from '../../../hooks/useResource';

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
    share_url?: string;
    share_link_id?: string;
    share_expires_at?: string;
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
    refetchDepartments: () => Promise<void>;
}

export const useDepartments = (): UseDepartmentsReturn => {
    const { data, isLoading, error, refetch } = useResource<Department>('/api/me/departments', {
        showErrorToast: false,
        notFoundValue: [],
        getErrorMessage: (response) => {
            if (response.status >= 500) {
                return `Database or server error (${response.status}). Please check if the database is running.`;
            }
            return `Failed to fetch departments: ${response.status}`;
        },
    });

    return useMemo(() => ({
        departments: data,
        isLoading,
        error,
        refetchDepartments: refetch
    }), [data, isLoading, error, refetch]);
};
