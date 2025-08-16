import { useState, useCallback } from 'react';
import { ScriptElement } from '../features/script/types/scriptElements';
import { validateShareToken, buildSharedApiUrl, INVALID_SHARE_TOKEN_ERROR } from '../utils/tokenValidation';
import { apiCache } from '../utils/apiCache';

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

  const handleScriptClick = useCallback(async (scriptId: string) => {
    if (!validateShareToken(shareToken)) {
      setScriptError(INVALID_SHARE_TOKEN_ERROR);
      return;
    }

    setIsLoadingScript(true);
    setScriptError(null);
    setViewingScriptId(scriptId);

    // Check cache first
    const cacheKey = apiCache.getScriptElementsKey(scriptId, shareToken!);
    const cachedResponse = apiCache.get<any>(cacheKey);
    
    if (cachedResponse) {
      if (Array.isArray(cachedResponse)) {
        setScriptElements(cachedResponse);
        setCrewContext(null);
      } else {
        setScriptElements(cachedResponse.elements || []);
        setCrewContext(cachedResponse.crew_context || null);
      }
      setIsLoadingScript(false);
      return;
    }

    try {
      const elementsResponse = await fetch(
        buildSharedApiUrl(`/api/scripts/${scriptId}/elements`, shareToken!)
      );

      if (!elementsResponse.ok) {
        throw new Error('Failed to load script elements');
      }

      const elementsData = await elementsResponse.json();

      // Cache the response
      apiCache.set(cacheKey, elementsData);

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

  return {
    viewingScriptId,
    scriptElements,
    isLoadingScript,
    scriptError,
    crewContext,
    handleScriptClick,
    handleBackToShows,
  };
};