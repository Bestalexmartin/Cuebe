// frontend/src/features/script/hooks/useScriptElements.ts

import { useMemo } from 'react';
import { ScriptElement } from '../types/scriptElements';

interface UseScriptElementsReturn {
    elements: ScriptElement[];
    isLoading: boolean;
    error: string | null;
}

export const useScriptElements = (): UseScriptElementsReturn => {
    // STRIPPED FOR REBUILD: This hook no longer fetches - elements should come from unified endpoint
    // TODO REBUILD: This hook may not be needed if all usage switches to unified loading
    
    const elements: ScriptElement[] = [];
    const isLoading = false;
    const error: string | null = null;

    return useMemo(() => ({
        elements,
        isLoading,
        error
    }), [elements, isLoading, error]);
};
