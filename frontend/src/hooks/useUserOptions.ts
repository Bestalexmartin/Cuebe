// frontend/src/hooks/useUserOptions.ts

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useEnhancedToast } from '../utils/toastUtils';

export interface UserOptions {
    colorizeDepNames: boolean;
    autoSortCues: boolean;
    showClockTimes: boolean;
}

const DEFAULT_OPTIONS: UserOptions = {
    colorizeDepNames: true,
    autoSortCues: true,
    showClockTimes: false
};

const STORAGE_KEY = 'userOptions';

// Helper functions for localStorage
const saveOptionsToStorage = (options: UserOptions) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
    } catch (error) {
    }
};

const loadOptionsFromStorage = (): UserOptions | null => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Validate that all required keys exist and are booleans
            if (
                typeof parsed.colorizeDepNames === 'boolean' &&
                typeof parsed.autoSortCues === 'boolean' &&
                typeof parsed.showClockTimes === 'boolean'
            ) {
                return parsed;
            }
        }
    } catch (error) {
    }
    return null;
};

export const useUserOptions = () => {
    const { getToken } = useAuth();
    const { showError } = useEnhancedToast();
    
    // Initialize with localStorage or defaults
    const [options, setOptions] = useState<UserOptions>(() => {
        return loadOptionsFromStorage() || DEFAULT_OPTIONS;
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Load user options on mount
    useEffect(() => {
        const loadOptions = async () => {
            try {
                const token = await getToken();
                if (!token) {
                    setIsLoading(false);
                    return;
                }

                const response = await fetch('/api/users/options', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const userOptions = await response.json();
                    setOptions(userOptions);
                    saveOptionsToStorage(userOptions);
                } else {
                    const storedOptions = loadOptionsFromStorage();
                    if (storedOptions) {
                        setOptions(storedOptions);
                    } else {
                        setOptions(DEFAULT_OPTIONS);
                        saveOptionsToStorage(DEFAULT_OPTIONS);
                    }
                }
            } catch (error) {
                console.error('Error loading user options:', error);
                const storedOptions = loadOptionsFromStorage();
                if (storedOptions) {
                    setOptions(storedOptions);
                } else {
                    setOptions(DEFAULT_OPTIONS);
                    saveOptionsToStorage(DEFAULT_OPTIONS);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadOptions();
    }, [getToken]);

    // Update specific option
    const updateOption = async <K extends keyof UserOptions>(
        key: K,
        value: UserOptions[K]
    ): Promise<boolean> => {
        // Store the current state before making changes for potential rollback
        const previousOptions = { ...options };
        
        // Immediately update local state and localStorage for instant feedback
        const updatedOptions = { ...options, [key]: value };
        setOptions(updatedOptions);
        saveOptionsToStorage(updatedOptions);
        
        setIsSaving(true);
        
        try {
            const token = await getToken();
            if (!token) {
                showError('Authentication required');
                // Revert local changes on error
                setOptions(previousOptions);
                saveOptionsToStorage(previousOptions);
                return false;
            }

            const response = await fetch('/api/users/options', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ [key]: value })
            });

            if (response.ok) {
                const serverOptions = await response.json();
                setOptions(serverOptions);
                saveOptionsToStorage(serverOptions);
                return true;
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error(`Failed to update option ${key}:`, response.status, errorData);
                showError(`Failed to update option: ${errorData.detail || 'Unknown error'}`);
                // Revert local changes on error
                setOptions(previousOptions);
                saveOptionsToStorage(previousOptions);
                return false;
            }
        } catch (error) {
            console.error('Error updating user option:', error);
            showError('Failed to save option. Please try again.');
            // Revert local changes on error
            setOptions(previousOptions);
            saveOptionsToStorage(previousOptions);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    // Update multiple options
    const updateOptions = async (newOptions: Partial<UserOptions>): Promise<boolean> => {
        // Store the current state before making changes for potential rollback
        const previousOptions = { ...options };
        
        // Immediately update local state and localStorage for instant feedback
        const updatedOptions = { ...options, ...newOptions };
        setOptions(updatedOptions);
        saveOptionsToStorage(updatedOptions);
        
        setIsSaving(true);
        
        try {
            const token = await getToken();
            if (!token) {
                showError('Authentication required');
                // Revert local changes on error
                setOptions(previousOptions);
                saveOptionsToStorage(previousOptions);
                return false;
            }

            const response = await fetch('/api/users/options', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newOptions)
            });

            if (response.ok) {
                const serverOptions = await response.json();
                // Update with server response to ensure consistency
                setOptions(serverOptions);
                saveOptionsToStorage(serverOptions);
                return true;
            } else {
                const errorData = await response.json().catch(() => ({}));
                showError(`Failed to update options: ${errorData.detail || 'Unknown error'}`);
                // Revert local changes on error
                setOptions(previousOptions);
                saveOptionsToStorage(previousOptions);
                return false;
            }
        } catch (error) {
            console.error('Error updating user options:', error);
            showError('Failed to save options. Please try again.');
            // Revert local changes on error
            setOptions(previousOptions);
            saveOptionsToStorage(previousOptions);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    return useMemo(() => ({
        options,
        isLoading,
        isSaving,
        updateOption,
        updateOptions
    }), [options, isLoading, isSaving, updateOption, updateOptions]);
};
