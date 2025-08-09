// frontend/src/features/departments/hooks/useDepartment.ts

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
  phone_number?: string;
  profile_img_url?: string;
  role?: string;
  user_role?: string;
  user_status?: string;
  is_active?: boolean;
  date_created?: string;
  date_updated?: string;
}

interface Department {
  department_id: string;
  department_name: string;
  department_description?: string;
  department_color?: string;
  department_initials?: string; // Department initials field - database field
  date_created: string;
  date_updated: string;
  shows_assigned_count?: number;
  unique_crew_count?: number;
  crew_assignments?: DepartmentCrewAssignment[];
}

interface UseDepartmentReturn {
  department: Department | null;
  isLoading: boolean;
  error: string | null;
}

export const useDepartment = (departmentId: string | undefined): UseDepartmentReturn => {
    const { getToken } = useAuth();
    const [department, setDepartment] = useState<Department | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDepartment = useCallback(async () => {
        if (!departmentId) return;
        
        setIsLoading(true);
        try {
            const token = await getToken();
            if (!token) {
                setIsLoading(false);
                return;
            }
            
            // Use the enhanced departments endpoint that includes crew assignments
            const response = await fetch('/api/me/departments', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch department data.');
            }
            const departments: Department[] = await response.json();
            const department = departments.find(d => d.department_id === departmentId);
            
            if (!department) {
                throw new Error('Department not found.');
            }
            
            setDepartment(department);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load department';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [departmentId, getToken]);

    useEffect(() => {
        fetchDepartment();
    }, [fetchDepartment]);

    return useMemo(() => ({ department, isLoading, error }), [department, isLoading, error]);
};
