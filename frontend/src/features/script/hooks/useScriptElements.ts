// frontend/src/pages/script/hooks/useScriptElements.ts

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ScriptElement } from '../types/script-elements';

interface UseScriptElementsReturn {
    elements: ScriptElement[];
    isLoading: boolean;
    error: string | null;
    refetchElements: () => Promise<void>;
}

interface UseScriptElementsOptions {
    elementType?: string;
    departmentId?: string;
    activeOnly?: boolean;
    skip?: number;
    limit?: number;
}

export const useScriptElements = (
    scriptId: string | undefined,
    options: UseScriptElementsOptions = {}
): UseScriptElementsReturn => {
    const [elements, setElements] = useState<ScriptElement[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { getToken } = useAuth();

    const fetchElements = async () => {
        if (!scriptId) {
            setElements([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const token = await getToken();
            if (!token) {
                throw new Error('Authentication token not available');
            }

            // Build query parameters
            const params = new URLSearchParams();
            if (options.elementType) params.append('element_type', options.elementType);
            if (options.departmentId) params.append('department_id', options.departmentId);
            if (options.activeOnly !== undefined) params.append('active_only', options.activeOnly.toString());
            if (options.skip !== undefined) params.append('skip', options.skip.toString());
            if (options.limit !== undefined) params.append('limit', options.limit.toString());

            const queryString = params.toString();
            const url = `/api/scripts/${scriptId}/elements${queryString ? '?' + queryString : ''}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch script elements: ${response.status}`);
            }

            const data = await response.json();
            setElements(data);
        } catch (err) {
            console.error('Error fetching script elements:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch script elements');
            setElements([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchElements();
    }, [scriptId, JSON.stringify(options)]);

    return useMemo(() => ({
        elements,
        isLoading,
        error,
        refetchElements: fetchElements
    }), [elements, isLoading, error, fetchElements]);
};