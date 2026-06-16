// frontend/src/hooks/useResource.ts

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useEnhancedToast } from '../utils/toastUtils';
import { useApiFetch } from './useApiFetch';

// TypeScript interfaces
interface UseResourceOptions<T> {
  fetchOnMount?: boolean;
  showErrorToast?: boolean;
  notFoundValue?: T[];
  getErrorMessage?: (response: Response, endpoint: string) => string;
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
  options: UseResourceOptions<T> = {}
): UseResourceReturn<T> => {
    const [data, setData] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const apiFetch = useApiFetch();
    const { showError } = useEnhancedToast();

    const {
        fetchOnMount = true,
        showErrorToast = true,
        notFoundValue,
        getErrorMessage,
    } = options;

    const fetchData = useCallback(async (): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await apiFetch(endpoint);

            if (!response.ok) {
                if (response.status === 404 && notFoundValue) {
                    setData(notFoundValue);
                    return;
                }

                const message = getErrorMessage
                    ? getErrorMessage(response, endpoint)
                    : `Failed to fetch ${endpoint}`;
                throw new Error(message);
            }

            const result: T[] = await response.json();
            setData(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
            setError(errorMessage);
            if (showErrorToast) {
                showError(errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    }, [apiFetch, endpoint, getErrorMessage, notFoundValue, showError, showErrorToast]);

    const createResource = useCallback(async (resourceData: Partial<T>): Promise<T> => {
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
    }, [apiFetch, endpoint]);

    useEffect(() => {
        if (fetchOnMount) {
            fetchData();
        }
    }, [fetchData, fetchOnMount]);

    return useMemo(() => ({
        data,
        isLoading,
        error,
        refetch: fetchData,
        createResource,
    }), [data, isLoading, error, fetchData, createResource]);
};
