// frontend/src/hooks/useDashboardNavigation.ts

import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

export interface DashboardNavigationOptions {
    view?: 'shows' | 'venues' | 'crew' | 'departments';
    selectedShowId?: string;
    selectedScriptId?: string;
    returnFromManage?: boolean;
    preserveState?: boolean;
}

export interface DashboardNavigationReturn {
    navigateToDashboard: (options?: DashboardNavigationOptions) => void;
    navigateToShows: (showId?: string, scriptId?: string) => void;
    navigateToVenues: () => void;
    navigateToCrew: () => void;
    navigateToDepartments: () => void;
    navigateWithCurrentContext: (script?: any, scriptId?: string) => void;
}

/**
 * Custom hook for consistent dashboard navigation patterns
 * Provides standardized navigation methods with proper state management
 */
export const useDashboardNavigation = (): DashboardNavigationReturn => {
    const navigate = useNavigate();
    
    // Main dashboard navigation with full options
    const navigateToDashboard = useCallback((options: DashboardNavigationOptions = {}) => {
        const {
            view = 'shows',
            selectedShowId,
            selectedScriptId,
            returnFromManage = false,
            preserveState = true
        } = options;
        
        const navigationState = preserveState ? {
            view,
            ...(selectedShowId && { selectedShowId }),
            ...(selectedScriptId && { selectedScriptId }),
            ...(returnFromManage && { returnFromManage })
        } : undefined;
        
        navigate('/dashboard', {
            state: navigationState
        });
    }, [navigate]);
    
    // Navigate to shows view specifically
    const navigateToShows = useCallback((showId?: string, scriptId?: string) => {
        navigateToDashboard({
            view: 'shows',
            selectedShowId: showId,
            selectedScriptId: scriptId,
            returnFromManage: true
        });
    }, [navigateToDashboard]);
    
    // Navigate to venues view
    const navigateToVenues = useCallback(() => {
        navigateToDashboard({ view: 'venues' });
    }, [navigateToDashboard]);
    
    // Navigate to crew view
    const navigateToCrew = useCallback(() => {
        navigateToDashboard({ view: 'crew' });
    }, [navigateToDashboard]);
    
    // Navigate to departments view
    const navigateToDepartments = useCallback(() => {
        navigateToDashboard({ view: 'departments' });
    }, [navigateToDashboard]);
    
    // Navigate with current script context (common pattern in ManageScriptPage)
    const navigateWithCurrentContext = useCallback((script?: any, scriptId?: string) => {
        navigateToDashboard({
            view: 'shows',
            selectedShowId: script?.showID,
            selectedScriptId: scriptId,
            returnFromManage: true
        });
    }, [navigateToDashboard]);
    
    return {
        navigateToDashboard,
        navigateToShows,
        navigateToVenues,
        navigateToCrew,
        navigateToDepartments,
        navigateWithCurrentContext
    };
};