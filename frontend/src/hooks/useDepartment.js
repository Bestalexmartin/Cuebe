// frontend/src/hooks/useDepartment.js

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

export const useDepartment = (departmentId) => {
    const { getToken } = useAuth();
    const [department, setDepartment] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDepartment = useCallback(async () => {
        if (!departmentId) return;
        
        setIsLoading(true);
        try {
            const token = await getToken();
            const response = await fetch(`/api/departments/${departmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch department data.');
            }
            const data = await response.json();
            setDepartment(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [departmentId, getToken]);

    useEffect(() => {
        fetchDepartment();
    }, [fetchDepartment]);

    return { department, isLoading, error };
};