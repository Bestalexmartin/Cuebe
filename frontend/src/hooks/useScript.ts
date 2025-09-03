import { useState, useCallback } from 'react';
import { ScriptElement } from '../features/script/types/scriptElements';
import { validateShareToken, encodeShareToken, INVALID_SHARE_TOKEN_ERROR } from '../utils/tokenValidation';
import { useSynchronizedPlayContext } from '../contexts/SynchronizedPlayContext';

/**
 * Recalculate durations for all group elements based on their children
 */
function recalculateGroupDurations(elements: ScriptElement[]): ScriptElement[] {
  return elements.map((element) => {
    if ((element as any).element_type === "GROUP") {
      // Find all child elements of this group
      const childElements = elements.filter(
        (el) => el.parent_element_id === element.element_id,
      );

      if (childElements.length > 0) {
        // Calculate new duration from child time offsets
        const childTimeOffsets = childElements.map((el) => el.offset_ms);
        const minTimeOffset = Math.min(...childTimeOffsets);
        const maxTimeOffset = Math.max(...childTimeOffsets);
        const groupDurationMs = maxTimeOffset - minTimeOffset;
        return {
          ...element,
          duration_ms: groupDurationMs,
        };
      }
    }
    return { ...element };
  });
}

interface CrewContext {
  department_name?: string;
  department_initials?: string;
  department_color?: string;
  show_role?: string;
  user_name?: string;
}

export const useScript = (shareToken: string | undefined, updateSharedData?: (updater: (prev: any) => any) => void, refreshSharedData?: () => void) => {
  const [viewingScriptId, setViewingScriptId] = useState<string | null>(null);
  const [scriptElements, setScriptElements] = useState<ScriptElement[]>([]);
  const [isLoadingScript, setIsLoadingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [crewContext, setCrewContext] = useState<CrewContext | null>(null);
  
  const { handlePlaybackCommand, resetAllPlaybackState } = useSynchronizedPlayContext();

  const handleScriptClick = useCallback(async (scriptId: string) => {
    // Reset all playback state and element states before loading new script
    resetAllPlaybackState();
    
    // Clear previous script element data (preserve crew context for websocket auth)
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
        `/api/shared/${encodeShareToken(shareToken!)}/scripts/${scriptId}`
      );

      if (!elementsResponse.ok) {
        throw new Error('Failed to load script data');
      }

      const scriptData = await elementsResponse.json();

      // Update cached shared data with fresh script metadata
      if (updateSharedData && scriptData?.script_id) {
        updateSharedData(prevData => {
          if (!prevData?.shows) return prevData;
          
          const updatedShows = prevData.shows.map(show => ({
            ...show,
            scripts: show.scripts.map(script => {
              if (script.script_id === scriptId) {
                return scriptData;
              }
              return script;
            })
          }));
          
          return { ...prevData, shows: updatedShows };
        });
      }

      // Script response now contains elements directly
      const elements = scriptData.elements || [];
      const elementsWithGroupDurations = recalculateGroupDurations(elements);
      setScriptElements(elementsWithGroupDurations);
      setCrewContext(scriptData.crew_context || null);
    } catch (err) {
      setScriptError(err instanceof Error ? err.message : 'Failed to load script');
      setViewingScriptId(null);
    } finally {
      setIsLoadingScript(false);
    }
  }, [shareToken]);

  const handleBackToShows = useCallback(() => {
    // Reset playback state to STOPPED when leaving script view
    handlePlaybackCommand('STOP', Date.now());
    
    setViewingScriptId(null);
    setScriptElements([]);
    setScriptError(null);
    setCrewContext(null);
    
    // Refresh show card data for guest users
    if (refreshSharedData) {
      refreshSharedData();
    }
  }, [refreshSharedData, handlePlaybackCommand]);

  const refreshScriptData = useCallback(() => {
    // No-op placeholder; unified save flow handles refresh in responses
  }, [viewingScriptId, handleScriptClick]);

  const refreshScriptElementsOnly = useCallback(async () => {
    // No-op placeholder; unified save flow handles refresh in responses
  }, [viewingScriptId]);

  const updateScriptElementsDirectly = useCallback((newElements: ScriptElement[]) => {
    setScriptElements(newElements);
  }, []);

  const updateSingleElement = useCallback((elementId: string, updates: Partial<ScriptElement>) => {
    setScriptElements(prev => {
      // First, update the target element
      let updatedElements = prev.map(el => {
        if (el.element_id === elementId) {
          return { ...el, ...updates } as ScriptElement;
        }
        return el;
      });

      // If offset_ms was changed, recalculate parent group duration
      if ('offset_ms' in updates) {
        const updatedElement = updatedElements.find(el => el.element_id === elementId);
        if (updatedElement?.parent_element_id) {
          // Find the parent group
          const parentGroupId = updatedElement.parent_element_id;
          const childElements = updatedElements.filter(
            el => el.parent_element_id === parentGroupId
          );

          if (childElements.length > 0) {
            // Calculate new group duration from child time offsets
            const childTimeOffsets = childElements.map(el => el.offset_ms);
            const minTimeOffset = Math.min(...childTimeOffsets);
            const maxTimeOffset = Math.max(...childTimeOffsets);
            const groupDurationMs = maxTimeOffset - minTimeOffset;

            // Update the parent group
            updatedElements = updatedElements.map(el => {
              if (el.element_id === parentGroupId) {
                return { ...el, duration_ms: groupDurationMs };
              }
              return el;
            });
          }
        }
      }

      return updatedElements;
    });
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
