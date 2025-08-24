import { useState, useCallback } from 'react';
import { ScriptElement } from '../features/script/types/scriptElements';
import { validateShareToken, buildSharedApiUrl, INVALID_SHARE_TOKEN_ERROR } from '../utils/tokenValidation';

interface CrewContext {
  department_name?: string;
  department_initials?: string;
  department_color?: string;
  show_role?: string;
  user_name?: string;
}

export const useScriptViewing = (shareToken: string | undefined) => {
  const [viewingScriptId, setViewingScriptId] = useState<string | null>(null);
  const [scriptElements, setScriptElements] = useState<ScriptElement[]>([]);
  const [isLoadingScript, setIsLoadingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [crewContext, setCrewContext] = useState<CrewContext | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const handleScriptClick = useCallback(async (scriptId: string) => {
    if (!validateShareToken(shareToken)) {
      setScriptError(INVALID_SHARE_TOKEN_ERROR);
      return;
    }

    setIsLoadingScript(true);
    setScriptError(null);
    setViewingScriptId(scriptId);

    try {
      const elementsResponse = await fetch(
        buildSharedApiUrl(`/api/scripts/${scriptId}/elements`, shareToken!)
      );

      if (!elementsResponse.ok) {
        throw new Error('Failed to load script elements');
      }

      const elementsData = await elementsResponse.json();

      if (Array.isArray(elementsData)) {
        setScriptElements(elementsData);
        setCrewContext(null);
      } else {
        setScriptElements(elementsData.elements || []);
        setCrewContext(elementsData.crew_context || null);
      }
    } catch (err) {
      setScriptError(err instanceof Error ? err.message : 'Failed to load script');
      setViewingScriptId(null);
    } finally {
      setIsLoadingScript(false);
    }
  }, [shareToken]);

  const handleBackToShows = useCallback(() => {
    setViewingScriptId(null);
    setScriptElements([]);
    setScriptError(null);
    setCrewContext(null);
  }, []);

  const refreshScriptData = useCallback(() => {
    if (viewingScriptId) {
      handleScriptClick(viewingScriptId);
    }
  }, [viewingScriptId, handleScriptClick]);

  const refreshScriptElementsOnly = useCallback(async () => {
    if (!viewingScriptId || !validateShareToken(shareToken)) {
      return;
    }

    try {
      const elementsResponse = await fetch(
        buildSharedApiUrl(`/api/scripts/${viewingScriptId}/elements`, shareToken!)
      );

      if (!elementsResponse.ok) {
        return;
      }

      const elementsData = await elementsResponse.json();
      
      if (Array.isArray(elementsData)) {
        setScriptElements(elementsData);
      } else {
        setScriptElements(elementsData.elements || []);
        // Don't update crew context to avoid unnecessary re-renders
      }
    } catch (err) {
    }
  }, [viewingScriptId, shareToken]);

  const updateScriptElementsDirectly = useCallback((newElements: ScriptElement[]) => {
    setScriptElements(newElements);
  }, []);

  const updateSingleElement = useCallback((elementId: string, updates: Partial<ScriptElement>) => {
    setScriptElements(prev => 
      prev.map(el => 
        el.element_id === elementId ? { ...el, ...updates } : el
      )
    );
  }, []);

  const deleteElement = useCallback((elementId: string) => {
    setScriptElements(prev => 
      prev.filter(el => el.element_id !== elementId)
    );
  }, []);

  return {
    viewingScriptId,
    scriptElements,
    isLoadingScript,
    scriptError,
    crewContext,
    handleScriptClick,
    handleBackToShows,
    refreshScriptData,
    refreshScriptElementsOnly,
    updateScriptElementsDirectly,
    updateSingleElement,
    deleteElement,
  };
};