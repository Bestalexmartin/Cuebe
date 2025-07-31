// frontend/src/hooks/useUserPreferences.ts

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useEnhancedToast } from '../utils/toastUtils';

export interface UserPreferences {
    darkMode: boolean;
    colorizeDepNames: boolean;
    autoSortCues: boolean;
    showClockTimes: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
    darkMode: false,
    colorizeDepNames: true,
    autoSortCues: true,
    showClockTimes: false
};

const STORAGE_KEY = 'userPreferences';

// Helper functions for localStorage
const savePreferencesToStorage = (preferences: UserPreferences) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
        console.warn('Failed to save preferences to localStorage:', error);
    }
};

const loadPreferencesFromStorage = (): UserPreferences | null => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Validate that all required keys exist and are booleans
            if (
                typeof parsed.darkMode === 'boolean' &&
                typeof parsed.colorizeDepNames === 'boolean' &&
                typeof parsed.autoSortCues === 'boolean' &&
                typeof parsed.showClockTimes === 'boolean'
            ) {
                return parsed;
            }
        }
    } catch (error) {
        console.warn('Failed to load preferences from localStorage:', error);
    }
    return null;
};

export const useUserPreferences = () => {
    const { getToken } = useAuth();
    const { showError } = useEnhancedToast();
    
    // Initialize with localStorage or defaults
    const [preferences, setPreferences] = useState<UserPreferences>(() => {
        return loadPreferencesFromStorage() || DEFAULT_PREFERENCES;
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Load user preferences on mount
    useEffect(() => {
        const loadPreferences = async () => {
            try {
                const token = await getToken();
                if (!token) {
                    setIsLoading(false);
                    return;
                }

                const response = await fetch('/api/users/preferences', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const userPreferences = await response.json();
                    setPreferences(userPreferences);
                    savePreferencesToStorage(userPreferences);
                } else {
                    console.warn('Failed to load user preferences, using stored or defaults');
                    const storedPreferences = loadPreferencesFromStorage();
                    if (storedPreferences) {
                        setPreferences(storedPreferences);
                    } else {
                        setPreferences(DEFAULT_PREFERENCES);
                        savePreferencesToStorage(DEFAULT_PREFERENCES);
                    }
                }
            } catch (error) {
                console.error('Error loading user preferences:', error);
                const storedPreferences = loadPreferencesFromStorage();
                if (storedPreferences) {
                    setPreferences(storedPreferences);
                } else {
                    setPreferences(DEFAULT_PREFERENCES);
                    savePreferencesToStorage(DEFAULT_PREFERENCES);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadPreferences();
    }, [getToken]);

    // Update specific preference
    const updatePreference = async <K extends keyof UserPreferences>(
        key: K,
        value: UserPreferences[K]
    ): Promise<boolean> => {
        // Store the current state before making changes for potential rollback
        const previousPreferences = { ...preferences };
        
        // Immediately update local state and localStorage for instant feedback
        const updatedPreferences = { ...preferences, [key]: value };
        setPreferences(updatedPreferences);
        savePreferencesToStorage(updatedPreferences);
        
        setIsSaving(true);
        
        try {
            const token = await getToken();
            if (!token) {
                showError('Authentication required');
                // Revert local changes on error
                setPreferences(previousPreferences);
                savePreferencesToStorage(previousPreferences);
                return false;
            }

            const response = await fetch('/api/users/preferences', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ [key]: value })
            });

            if (response.ok) {
                const serverPreferences = await response.json();
                setPreferences(serverPreferences);
                savePreferencesToStorage(serverPreferences);
                return true;
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error(`Failed to update preference ${key}:`, response.status, errorData);
                showError(`Failed to update preference: ${errorData.detail || 'Unknown error'}`);
                // Revert local changes on error
                setPreferences(previousPreferences);
                savePreferencesToStorage(previousPreferences);
                return false;
            }
        } catch (error) {
            console.error('Error updating user preference:', error);
            showError('Failed to save preference. Please try again.');
            // Revert local changes on error
            setPreferences(previousPreferences);
            savePreferencesToStorage(previousPreferences);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    // Update multiple preferences
    const updatePreferences = async (newPreferences: Partial<UserPreferences>): Promise<boolean> => {
        // Store the current state before making changes for potential rollback
        const previousPreferences = { ...preferences };
        
        // Immediately update local state and localStorage for instant feedback
        const updatedPreferences = { ...preferences, ...newPreferences };
        setPreferences(updatedPreferences);
        savePreferencesToStorage(updatedPreferences);
        
        setIsSaving(true);
        
        try {
            const token = await getToken();
            if (!token) {
                showError('Authentication required');
                // Revert local changes on error
                setPreferences(previousPreferences);
                savePreferencesToStorage(previousPreferences);
                return false;
            }

            const response = await fetch('/api/users/preferences', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newPreferences)
            });

            if (response.ok) {
                const serverPreferences = await response.json();
                // Update with server response to ensure consistency
                setPreferences(serverPreferences);
                savePreferencesToStorage(serverPreferences);
                return true;
            } else {
                const errorData = await response.json().catch(() => ({}));
                showError(`Failed to update preferences: ${errorData.detail || 'Unknown error'}`);
                // Revert local changes on error
                setPreferences(previousPreferences);
                savePreferencesToStorage(previousPreferences);
                return false;
            }
        } catch (error) {
            console.error('Error updating user preferences:', error);
            showError('Failed to save preferences. Please try again.');
            // Revert local changes on error
            setPreferences(previousPreferences);
            savePreferencesToStorage(previousPreferences);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    return useMemo(() => ({
        preferences,
        isLoading,
        isSaving,
        updatePreference,
        updatePreferences
    }), [preferences, isLoading, isSaving, updatePreference, updatePreferences]);
};