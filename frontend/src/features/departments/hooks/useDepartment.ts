// frontend/src/features/departments/hooks/useDepartment.ts

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
            
            const response = await fetch(`/api/departments/${departmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch department data.');
            }
            const data: Department = await response.json();
            setDepartment(data);
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
