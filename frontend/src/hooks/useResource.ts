// frontend/src/hooks/useResource.ts

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useEnhancedToast } from '../utils/toastUtils';

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
    const { showError } = useEnhancedToast();

    const {
        fetchOnMount = true,
    } = options;

    const fetchData = async (): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            console.log('🔍 DEBUG: Starting API call to:', endpoint);
            const token = await getToken();
            console.log('🔍 DEBUG: Token retrieved:', token ? 'Yes' : 'No', token ? `(${token.substring(0, 20)}...)` : '');

            if (!token) {
                throw new Error('Authentication token not available');
            }

            console.log('🔍 DEBUG: Making fetch request to:', endpoint);
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('🔍 DEBUG: Response status:', response.status);
            console.log('🔍 DEBUG: Response headers:', Object.fromEntries(response.headers.entries()));
            console.log('🔍 DEBUG: Response URL:', response.url);

            if (!response.ok) {
                const responseText = await response.text();
                console.log('🔍 DEBUG: Error response body:', responseText.substring(0, 200));
                throw new Error(`Failed to fetch ${endpoint}: ${response.status} ${response.statusText}`);
            }

            const responseText = await response.text();
            console.log('🔍 DEBUG: Raw response (first 200 chars):', responseText.substring(0, 200));

            try {
                const result: T[] = JSON.parse(responseText);
                setData(result);
                console.log('🔍 DEBUG: Successfully parsed JSON, got', Array.isArray(result) ? result.length : 'non-array', 'items');
            } catch (parseError) {
                console.error('🔍 DEBUG: JSON parse error:', parseError);
                console.log('🔍 DEBUG: Full response text:', responseText);
                throw new Error(`JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
            }
        } catch (err) {
            console.error('🔍 DEBUG: Fetch error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
            setError(errorMessage);
            showError(errorMessage);
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

    return useMemo(() => ({
        data,
        isLoading,
        error,
        refetch: fetchData,
        createResource,
    }), [data, isLoading, error, fetchData, createResource]);
};