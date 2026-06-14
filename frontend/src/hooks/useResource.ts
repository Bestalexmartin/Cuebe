// frontend/src/hooks/useResource.ts

import { useState, useEffect, useMemo } from 'react';
import { useEnhancedToast } from '../utils/toastUtils';
import { useApiFetch } from './useApiFetch';

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
    const apiFetch = useApiFetch();
    const { showError } = useEnhancedToast();

    const {
        fetchOnMount = true,
    } = options;

    const fetchData = async (): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await apiFetch(endpoint);

            if (!response.ok) {
                throw new Error(`Failed to fetch ${endpoint}`);
            }

            const result: T[] = await response.json();
            setData(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const createResource = async (resourceData: Partial<T>): Promise<T> => {
        try {
            const response = await apiFetch(endpoint, {
                method: 'POST',
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

    return useMemo(() => ({
        data,
        isLoading,
        error,
        refetch: fetchData,
        createResource,
    }), [data, isLoading, error, fetchData, createResource]);
};