// frontend/src/features/script/hooks/useScriptElements.ts

import { useMemo } from 'react';
import { ScriptElement } from '../types/scriptElements';

interface UseScriptElementsReturn {
    elements: ScriptElement[];
    isLoading: boolean;
    error: string | null;
}

export const useScriptElements = (): UseScriptElementsReturn => {
    // This hook no longer fetches; elements should come from unified endpoint
    
    const elements: ScriptElement[] = [];
    const isLoading = false;
    const error: string | null = null;

    return useMemo(() => ({
        elements,
        isLoading,
        error
    }), [elements, isLoading, error]);
};
