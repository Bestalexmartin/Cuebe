// frontend/src/features/script/hooks/useShareScript.ts

import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useEnhancedToast } from '../../../utils/toastUtils';

export interface ScriptShareData {
    share_name?: string;
    notes?: string;
    shared_with_user_id: string;
    permissions: {
        view: boolean;
        download: boolean;
    };
    expires_at?: string;
}

export interface ScriptShareResponse {
    share_id: string;
    script_id: string;
    created_by: string;
    shared_with_user_id: string;
    share_token: string;
    share_url: string;
    permissions: {
        view: boolean;
        download: boolean;
    };
    expires_at: string | null;
    is_active: boolean;
    is_expired: boolean;
    access_count: number;
    last_accessed_at: string | null;
    share_name: string | null;
    notes: string | null;
    date_created: string;
    date_updated: string;
    
    // User info
    shared_with_user_name?: string;
    shared_with_user_email?: string;
}

export interface ScriptShareListResponse {
    shares: ScriptShareResponse[];
    total_count: number;
    active_count: number;
    expired_count: number;
}

interface UseShareScriptReturn {
    createShare: (scriptId: string, shareData: ScriptShareData) => Promise<ScriptShareResponse>;
    listShares: (scriptId: string, activeOnly?: boolean) => Promise<ScriptShareListResponse>;
    updateShare: (scriptId: string, token: string, updates: Partial<ScriptShareData>) => Promise<ScriptShareResponse>;
    revokeShare: (scriptId: string, token: string) => Promise<void>;
    revokeAllShares: (scriptId: string) => Promise<void>;
    regenerateToken: (scriptId: string, token: string) => Promise<ScriptShareResponse>;
    isCreating: boolean;
    isLoading: boolean;
    error: string | null;
}

export const useShareScript = (): UseShareScriptReturn => {
    const { getToken } = useAuth();
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { showError } = useEnhancedToast();

    const handleApiCall = async <T>(
        apiCall: (token: string) => Promise<Response>,
        loadingState: 'creating' | 'loading' = 'loading'
    ): Promise<T> => {
        try {
            setError(null);
            if (loadingState === 'creating') {
                setIsCreating(true);
            } else {
                setIsLoading(true);
            }

            const token = await getToken();
            if (!token) {
                throw new Error('Authentication required');
            }

            const response = await apiCall(token);

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.detail || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            const data = await response.json();
            return data;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
            setError(errorMessage);
            showError(errorMessage);
            throw err;
        } finally {
            setIsCreating(false);
            setIsLoading(false);
        }
    };

    const createShare = useCallback(async (
        scriptId: string, 
        shareData: ScriptShareData
    ): Promise<ScriptShareResponse> => {
        return handleApiCall<ScriptShareResponse>(
            (token) => fetch(`/api/scripts/${scriptId}/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(shareData)
            }),
            'creating'
        );
    }, [getToken, showError]);

    const listShares = useCallback(async (
        scriptId: string, 
        activeOnly: boolean = true
    ): Promise<ScriptShareListResponse> => {
        const params = new URLSearchParams({ active_only: activeOnly.toString() });
        
        return handleApiCall<ScriptShareListResponse>(
            (token) => fetch(`/api/scripts/${scriptId}/shares?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
        );
    }, [getToken, showError]);

    const updateShare = useCallback(async (
        scriptId: string, 
        shareToken: string, 
        updates: Partial<ScriptShareData>
    ): Promise<ScriptShareResponse> => {
        return handleApiCall<ScriptShareResponse>(
            (token) => fetch(`/api/scripts/${scriptId}/shares/${shareToken}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            })
        );
    }, [getToken, showError]);

    const revokeShare = useCallback(async (
        scriptId: string, 
        shareToken: string
    ): Promise<void> => {
        await handleApiCall<void>(
            (token) => fetch(`/api/scripts/${scriptId}/shares/${shareToken}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
        );
    }, [getToken, showError]);

    const revokeAllShares = useCallback(async (scriptId: string): Promise<void> => {
        await handleApiCall<void>(
            (token) => fetch(`/api/scripts/${scriptId}/shares`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
        );
    }, [getToken, showError]);

    const regenerateToken = useCallback(async (
        scriptId: string, 
        shareToken: string
    ): Promise<ScriptShareResponse> => {
        return handleApiCall<ScriptShareResponse>(
            (token) => fetch(`/api/scripts/${scriptId}/shares/${shareToken}/regenerate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
        );
    }, [getToken, showError]);

    return {
        createShare,
        listShares,
        updateShare,
        revokeShare,
        revokeAllShares,
        regenerateToken,
        isCreating,
        isLoading,
        error
    };
};