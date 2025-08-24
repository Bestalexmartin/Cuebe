// frontend/src/contexts/PreferencesContext.tsx

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useEnhancedToast } from '../utils/toastUtils';

// Field name mapping between frontend (camelCase) and backend (snake_case)
const FIELD_MAPPING = {
    darkMode: 'dark_mode',
    colorizeDepNames: 'colorize_dep_names',
    autoSortCues: 'auto_sort_cues',
    showClockTimes: 'show_clock_times',
    useMilitaryTime: 'use_military_time',
    dangerMode: 'danger_mode',
    autoSaveInterval: 'auto_save_interval'
} as const;

const REVERSE_FIELD_MAPPING = {
    dark_mode: 'darkMode',
    colorize_dep_names: 'colorizeDepNames',
    auto_sort_cues: 'autoSortCues',
    show_clock_times: 'showClockTimes',
    use_military_time: 'useMilitaryTime',
    danger_mode: 'dangerMode',
    auto_save_interval: 'autoSaveInterval'
} as const;

// Helper functions to convert between frontend and backend field names
const toBackendFields = (frontendPrefs: Partial<UserPreferences>): Record<string, any> => {
    const backendPrefs: Record<string, any> = {};
    for (const [frontendKey, value] of Object.entries(frontendPrefs)) {
        const backendKey = FIELD_MAPPING[frontendKey as keyof typeof FIELD_MAPPING];
        if (backendKey) {
            backendPrefs[backendKey] = value;
        }
    }
    return backendPrefs;
};

const fromBackendFields = (backendPrefs: Record<string, any>): UserPreferences => {
    const frontendPrefs: Partial<UserPreferences> = {};
    for (const [backendKey, value] of Object.entries(backendPrefs)) {
        const frontendKey = REVERSE_FIELD_MAPPING[backendKey as keyof typeof REVERSE_FIELD_MAPPING];
        if (frontendKey) {
            frontendPrefs[frontendKey] = value;
        }
    }
    return frontendPrefs as UserPreferences;
};

export interface UserPreferences {
    darkMode: boolean;
    colorizeDepNames: boolean;
    autoSortCues: boolean;
    showClockTimes: boolean;
    useMilitaryTime: boolean;
    dangerMode: boolean;
    autoSaveInterval: number; // 0 = off, 15, 30, 60 seconds
}

const DEFAULT_PREFERENCES: UserPreferences = {
    darkMode: false,
    colorizeDepNames: true,
    autoSortCues: true,
    showClockTimes: false,
    useMilitaryTime: false,
    dangerMode: false,
    autoSaveInterval: 0 // Off by default
};

const STORAGE_KEY = 'userPreferences';

// Helper functions for localStorage
const savePreferencesToStorage = (preferences: UserPreferences) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
    }
};

const loadPreferencesFromStorage = (): UserPreferences | null => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Validate that all required keys exist and have correct types
            if (
                typeof parsed.darkMode === 'boolean' &&
                typeof parsed.colorizeDepNames === 'boolean' &&
                typeof parsed.autoSortCues === 'boolean' &&
                typeof parsed.showClockTimes === 'boolean' &&
                typeof parsed.useMilitaryTime === 'boolean' &&
                typeof parsed.dangerMode === 'boolean' &&
                typeof parsed.autoSaveInterval === 'number' &&
                [0, 15, 30, 60].includes(parsed.autoSaveInterval)
            ) {
                return parsed;
            }
        }
    } catch (error) {
    }
    return null;
};

// Context interface
interface PreferencesContextType {
    preferences: UserPreferences;
    isLoading: boolean;
    isSaving: boolean;
    updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<boolean>;
    updatePreferences: (newPreferences: Partial<UserPreferences>) => Promise<boolean>;
}

// Create context
const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

// Provider component
interface PreferencesProviderProps {
    children: ReactNode;
}

export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({ children }) => {
    const { getToken, isSignedIn } = useAuth();
    const { showError } = useEnhancedToast();
    
    // Initialize with localStorage or defaults
    const [preferences, setPreferences] = useState<UserPreferences>(() => {
        return loadPreferencesFromStorage() || DEFAULT_PREFERENCES;
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false); // Prevent multiple loads

    // Load user preferences ONCE per session
    useEffect(() => {
        // Only load once and only if signed in
        if (hasLoaded || !isSignedIn) {
            setIsLoading(false);
            return;
        }

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
                    const backendPreferences = await response.json();
                    const userPreferences = fromBackendFields(backendPreferences);
                    setPreferences(userPreferences);
                    savePreferencesToStorage(userPreferences);
                } else {
                    const storedPreferences = loadPreferencesFromStorage();
                    if (storedPreferences) {
                        setPreferences(storedPreferences);
                    } else {
                        setPreferences(DEFAULT_PREFERENCES);
                        savePreferencesToStorage(DEFAULT_PREFERENCES);
                    }
                }
            } catch (error) {
                const storedPreferences = loadPreferencesFromStorage();
                if (storedPreferences) {
                    setPreferences(storedPreferences);
                } else {
                    setPreferences(DEFAULT_PREFERENCES);
                    savePreferencesToStorage(DEFAULT_PREFERENCES);
                }
            } finally {
                setIsLoading(false);
                setHasLoaded(true); // Mark as loaded to prevent future loads
            }
        };

        loadPreferences();
    }, [getToken, isSignedIn, hasLoaded]);

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
                body: JSON.stringify(toBackendFields({ [key]: value }))
            });

            if (response.ok) {
                const backendPreferences = await response.json();
                const serverPreferences = fromBackendFields(backendPreferences);
                setPreferences(serverPreferences);
                savePreferencesToStorage(serverPreferences);
                return true;
            } else {
                const errorData = await response.json().catch(() => ({}));
                showError(`Failed to update preference: ${errorData.detail || 'Unknown error'}`);
                // Revert local changes on error
                setPreferences(previousPreferences);
                savePreferencesToStorage(previousPreferences);
                return false;
            }
        } catch (error) {
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
                body: JSON.stringify(toBackendFields(newPreferences))
            });

            if (response.ok) {
                const backendPreferences = await response.json();
                const serverPreferences = fromBackendFields(backendPreferences);
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
            showError('Failed to save preferences. Please try again.');
            // Revert local changes on error
            setPreferences(previousPreferences);
            savePreferencesToStorage(previousPreferences);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const contextValue = useMemo(() => ({
        preferences,
        isLoading,
        isSaving,
        updatePreference,
        updatePreferences
    }), [preferences, isLoading, isSaving]);

    return (
        <PreferencesContext.Provider value={contextValue}>
            {children}
        </PreferencesContext.Provider>
    );
};

// Hook to use preferences context
export const useUserPreferences = () => {
    const context = useContext(PreferencesContext);
    if (context === undefined) {
        throw new Error('useUserPreferences must be used within a PreferencesProvider');
    }
    return context;
};

