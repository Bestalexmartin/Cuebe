import { useCallback, useState } from 'react';
import { ScriptElement } from '../../features/script/types/scriptElements';
import { INVALID_SHARE_TOKEN_ERROR, encodeShareToken, validateShareToken } from '../../utils/tokenValidation';

type SharedDataUpdater = (updater: (prev: any) => any) => void;

export interface CrewContext {
  department_name?: string;
  department_initials?: string;
  department_color?: string;
  show_role?: string;
  user_name?: string;
}

interface UseScriptViewOptions {
  buildScriptUrl: (encodedShareToken: string, scriptId: string) => string;
  resetPlaybackState: () => void;
  shareToken: string | undefined;
  updateSharedData?: SharedDataUpdater;
  refreshSharedData?: () => void;
}

function recalculateGroupDurations(elements: ScriptElement[]): ScriptElement[] {
  return elements.map((element) => {
    if ((element as any).element_type === 'GROUP') {
      const childElements = elements.filter(
        (el) => el.parent_element_id === element.element_id,
      );

      if (childElements.length > 0) {
        const childTimeOffsets = childElements.map((el) => el.offset_ms);
        return {
          ...element,
          duration_ms: Math.max(...childTimeOffsets) - Math.min(...childTimeOffsets),
        };
      }
    }
    return { ...element };
  });
}

export const useScriptView = ({
  buildScriptUrl,
  resetPlaybackState,
  shareToken,
  updateSharedData,
  refreshSharedData,
}: UseScriptViewOptions) => {
  const [viewingScriptId, setViewingScriptId] = useState<string | null>(null);
  const [scriptElements, setScriptElements] = useState<ScriptElement[]>([]);
  const [isLoadingScript, setIsLoadingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [crewContext, setCrewContext] = useState<CrewContext | null>(null);

  const clearScriptState = useCallback(() => {
    resetPlaybackState();
    setViewingScriptId(null);
    setScriptElements([]);
    setScriptError(null);
    setCrewContext(null);
  }, [resetPlaybackState]);

  const handleScriptClick = useCallback(async (scriptId: string) => {
    resetPlaybackState();
    setScriptElements([]);

    if (!validateShareToken(shareToken)) {
      setScriptError(INVALID_SHARE_TOKEN_ERROR);
      return;
    }

    setIsLoadingScript(true);
    setScriptError(null);
    setViewingScriptId(scriptId);

    try {
      const elementsResponse = await fetch(
        buildScriptUrl(encodeShareToken(shareToken!), scriptId),
      );

      if (!elementsResponse.ok) {
        if (elementsResponse.status === 401 || elementsResponse.status === 403) {
          window.location.href = '/shared/expired';
          return;
        }
        throw new Error('Failed to load script data');
      }

      const scriptData = await elementsResponse.json();

      if (updateSharedData && scriptData?.script_id) {
        updateSharedData((prevData) => {
          if (!prevData?.shows) return prevData;

          const updatedShows = prevData.shows.map((show: any) => ({
            ...show,
            scripts: show.scripts.map((script: any) => (
              script.script_id === scriptId ? scriptData : script
            )),
          }));

          return { ...prevData, shows: updatedShows };
        });
      }

      setScriptElements(recalculateGroupDurations(scriptData.elements || []));
      setCrewContext(scriptData.crew_context || null);
    } catch (err) {
      setScriptError(err instanceof Error ? err.message : 'Failed to load script');
      clearScriptState();
    } finally {
      setIsLoadingScript(false);
    }
  }, [buildScriptUrl, clearScriptState, resetPlaybackState, shareToken, updateSharedData]);

  const handleBackToShows = useCallback(() => {
    clearScriptState();
    refreshSharedData?.();
  }, [clearScriptState, refreshSharedData]);

  const refreshScriptData = useCallback(() => {
    // Unified save flow handles refresh in responses.
  }, []);

  const updateScriptElementsDirectly = useCallback((newElements: ScriptElement[]) => {
    setScriptElements(newElements);
  }, []);

  const updateSingleElement = useCallback((elementId: string, updates: Partial<ScriptElement>) => {
    setScriptElements((prev) => {
      let updatedElements = prev.map((el) => (
        el.element_id === elementId ? { ...el, ...updates } as ScriptElement : el
      ));

      if ('offset_ms' in updates) {
        const updatedElement = updatedElements.find((el) => el.element_id === elementId);
        if (updatedElement?.parent_element_id) {
          const parentGroupId = updatedElement.parent_element_id;
          const childElements = updatedElements.filter(
            (el) => el.parent_element_id === parentGroupId,
          );

          if (childElements.length > 0) {
            const childTimeOffsets = childElements.map((el) => el.offset_ms);
            const groupDurationMs = Math.max(...childTimeOffsets) - Math.min(...childTimeOffsets);

            updatedElements = updatedElements.map((el) => (
              el.element_id === parentGroupId ? { ...el, duration_ms: groupDurationMs } : el
            ));
          }
        }
      }

      return updatedElements;
    });
  }, []);

  const deleteElement = useCallback((elementId: string) => {
    setScriptElements((prev) => prev.filter((el) => el.element_id !== elementId));
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
    updateScriptElementsDirectly,
    updateSingleElement,
    deleteElement,
  };
};
