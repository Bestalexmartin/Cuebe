// frontend/src/hooks/useIntegratedColorMode.ts

import { useColorMode } from '@chakra-ui/react';
import { useUserPreferences } from './useUserPreferences';
import { useEffect } from 'react';

/**
 * Integrated color mode hook that syncs Chakra UI color mode with user preferences bitmap
 */
export const useIntegratedColorMode = () => {
    const { colorMode, setColorMode } = useColorMode();
    const { preferences, updatePreference, isLoading } = useUserPreferences();
    
    // Sync Chakra color mode with user preferences when preferences load
    useEffect(() => {
        if (!isLoading) {
            const expectedMode = preferences.darkMode ? 'dark' : 'light';
            if (colorMode !== expectedMode) {
                setColorMode(expectedMode);
            }
        }
    }, [preferences.darkMode, isLoading, colorMode, setColorMode]);
    
    const toggleColorMode = async () => {
        const newDarkMode = !preferences.darkMode;
        
        // Immediately update Chakra UI for instant feedback
        setColorMode(newDarkMode ? 'dark' : 'light');
        
        // Save to preferences (with optimistic update and rollback on failure)
        const success = await updatePreference('darkMode', newDarkMode);
        
        // If save failed, revert the Chakra UI change
        if (!success) {
            setColorMode(preferences.darkMode ? 'dark' : 'light');
        }
    };
    
    return {
        colorMode,
        toggleColorMode,
        isDark: preferences.darkMode,
    };
};