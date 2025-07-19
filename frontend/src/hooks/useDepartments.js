// frontend/src/useDepartments.js

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

export const useDepartments = () => {
    const { getToken } = useAuth();
    const [departments, setDepartments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDepartments = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const token = await getToken();
            const response = await fetch('/api/departments/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch departments: ${response.status}`);
            }

            const departmentsData = await response.json();
            setDepartments(departmentsData);
        } catch (err) {
            setError(err.message || 'Failed to load departments');
        } finally {
            setIsLoading(false);
        }
    };

    const refetchDepartments = () => {
        fetchDepartments();
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    return {
        departments,
        isLoading,
        error,
        refetchDepartments
    };
};