// frontend/src/features/script/hooks/useScriptModes.ts

import { useState, useCallback, useMemo } from 'react';

export type ScriptMode = 'view' | 'info' | 'edit' | 'history';

interface UseScriptModesReturn {
    activeMode: ScriptMode;
    setActiveMode: (mode: ScriptMode) => void;
    isValidMode: (mode: string) => mode is ScriptMode;
    getAvailableModes: () => { id: ScriptMode; label: string; isDisabled: boolean }[];
}

export const useScriptModes = (initialMode: ScriptMode = 'view'): UseScriptModesReturn => {
    const [activeMode, setActiveModeState] = useState<ScriptMode>(initialMode);

    const isValidMode = useCallback((mode: string): mode is ScriptMode => {
        return ['view', 'info', 'edit', 'history'].includes(mode);
    }, []);

    const setActiveMode = useCallback((mode: ScriptMode) => {
        if (isValidMode(mode)) {
            setActiveModeState(mode);
        }
    }, [isValidMode]);

    const getAvailableModes = useCallback(() => [
        { id: 'view' as ScriptMode, label: 'View', isDisabled: false },
        { id: 'info' as ScriptMode, label: 'Info', isDisabled: false },
        { id: 'edit' as ScriptMode, label: 'Edit', isDisabled: false }, // Now enabled for script element editing
        // History mode moved to edit mode toolbar section
    ], []);

    return useMemo(() => ({
        activeMode,
        setActiveMode,
        isValidMode,
        getAvailableModes
    }), [activeMode, setActiveMode, isValidMode, getAvailableModes]);
};
