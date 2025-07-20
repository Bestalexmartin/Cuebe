// frontend/src/hooks/useDepartment.js

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

export const useDepartment = (departmentId) => {
    const { getToken } = useAuth();
    const [department, setDepartment] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!departmentId) return;

        const fetchDepartment = async () => {
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
        };

        fetchDepartment();
    }, [departmentId, getToken]);

    return { department, isLoading, error };
};