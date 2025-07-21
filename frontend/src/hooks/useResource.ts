// frontend/src/hooks/useResource.ts

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useToast } from '@chakra-ui/react';
import { toastConfig } from '../ChakraTheme';

// TypeScript interfaces
interface UseResourceOptions {
  fetchOnMount?: boolean;
}

interface UseResourceReturn<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createResource: (resourceData: Partial<T>) => Promise<T>;
}

export const useResource = <T = any>(
  endpoint: string,
  options: UseResourceOptions = {}
): UseResourceReturn<T> => {
    const [data, setData] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { getToken } = useAuth();
    const toast = useToast();

    const {
        fetchOnMount = true,
    } = options;

    const fetchData = async (): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            const token = await getToken();
            if (!token) {
                throw new Error('Authentication token not available');
            }
            
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch ${endpoint}`);
            }

            const result: T[] = await response.json();
            setData(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
            setError(errorMessage);
            toast({
                title: 'Error Loading Data',
                description: errorMessage,
                duration: 5000,
                isClosable: true,
                ...toastConfig,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const createResource = async (resourceData: Partial<T>): Promise<T> => {
        try {
            const token = await getToken();
            if (!token) {
                throw new Error('Authentication token not available');
            }
            
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

            const newResource: T = await response.json();
            setData(prev => [...prev, newResource]);
            return newResource;
        } catch (err) {
            throw err;
        }
    };

    useEffect(() => {
        if (fetchOnMount) {
            fetchData();
        }
    }, [endpoint, fetchOnMount]);

    return {
        data,
        isLoading,
        error,
        refetch: fetchData,
        createResource,
    };
};