// frontend/src/hooks/useResource.js

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useToast } from '@chakra-ui/react';

export const useResource = (endpoint, options = {}) => {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { getToken } = useAuth();
    const toast = useToast();

    const {
        fetchOnMount = true,
        showErrorToast = true,
        dependencies = []
    } = options;

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const token = await getToken();
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch ${endpoint}`);
            }

            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err.message);
            if (showErrorToast) {
                toast({
                    title: 'Error Loading Data',
                    description: err.message,
                    status: 'error',
                    containerStyle: {
                        width: '400px',
                        maxWidth: '400px',
                    },
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const createResource = async (resourceData) => {
        try {
            const token = await getToken();
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(resourceData)
            });

            if (!response.ok) {
                throw new Error('Failed to create resource');
            }

            const newResource = await response.json();
            setData(prev => [...prev, newResource]);
            return newResource;
        } catch (err) {
            console.error('Error creating resource:', err);
            throw err;
        }
    };

    useEffect(() => {
        if (fetchOnMount) {
            fetchData();
        }
    }, [endpoint, fetchOnMount, ...dependencies]);

    return {
        data,
        isLoading,
        error,
        refetch: fetchData,
        createResource,
    };
};