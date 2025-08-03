// frontend/src/hooks/useScriptNavigation.ts

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseScriptNavigationParams {
    hasUnsavedChanges: boolean;
    script: any;
    scriptId: string | undefined;
    onUnsavedChangesDetected: (pendingPath: string) => void;
}

export const useScriptNavigation = ({
    hasUnsavedChanges,
    script,
    scriptId,
    onUnsavedChangesDetected
}: UseScriptNavigationParams) => {
    const navigate = useNavigate();

    // Handle browser beforeunload event (tab close, refresh, etc.)
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                event.preventDefault();
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore - returnValue is deprecated but required for Chrome compatibility
                event.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Push initial history state to enable popstate detection
    useEffect(() => {
        window.history.pushState({ manageScript: true }, '', window.location.pathname);
    }, []);

    // Handle browser back/forward button using popstate
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (hasUnsavedChanges) {
                event.preventDefault();
                window.history.pushState({ manageScript: true }, '', window.location.pathname);
                onUnsavedChangesDetected('/dashboard');
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [hasUnsavedChanges, onUnsavedChangesDetected]);

    const handleCancel = useCallback(() => {
        const dashboardPath = '/dashboard';
        if (hasUnsavedChanges) {
            onUnsavedChangesDetected(dashboardPath);
        } else {
            navigate(dashboardPath, {
                state: {
                    view: 'shows',
                    selectedShowId: script?.show_id,
                    selectedScriptId: scriptId,
                    returnFromManage: true
                }
            });
        }
    }, [hasUnsavedChanges, onUnsavedChangesDetected, navigate, script, scriptId]);

    return {
        handleCancel
    };
};