// frontend/src/pages/script/hooks/useScriptModes.ts

import { useState, useCallback } from 'react';

export type ScriptMode = 'view' | 'play' | 'info' | 'edit' | 'share' | 'history';

interface UseScriptModesReturn {
    activeMode: ScriptMode;
    setActiveMode: (mode: ScriptMode) => void;
    isValidMode: (mode: string) => mode is ScriptMode;
    getAvailableModes: () => { id: ScriptMode; label: string; isDisabled: boolean }[];
}

export const useScriptModes = (initialMode: ScriptMode = 'view'): UseScriptModesReturn => {
    const [activeMode, setActiveModeState] = useState<ScriptMode>(initialMode);

    const isValidMode = useCallback((mode: string): mode is ScriptMode => {
        return ['view', 'play', 'info', 'edit', 'share', 'history'].includes(mode);
    }, []);

    const setActiveMode = useCallback((mode: ScriptMode) => {
        if (isValidMode(mode)) {
            setActiveModeState(mode);
        }
    }, [isValidMode]);

    const getAvailableModes = useCallback(() => [
        { id: 'view' as ScriptMode, label: 'View', isDisabled: false },
        { id: 'play' as ScriptMode, label: 'Play', isDisabled: true }, // Will be enabled in future phases
        { id: 'info' as ScriptMode, label: 'Info', isDisabled: false },
        { id: 'edit' as ScriptMode, label: 'Edit', isDisabled: false }, // Now enabled for script element editing
        { id: 'share' as ScriptMode, label: 'Share', isDisabled: true }, // Will be enabled in future phases
        // History mode moved to edit mode toolbar section
    ], []);

    return {
        activeMode,
        setActiveMode,
        isValidMode,
        getAvailableModes
    };
};