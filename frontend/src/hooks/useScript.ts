import { useState, useCallback } from 'react';
import { ScriptElement } from '../features/script/types/scriptElements';
import { validateShareToken, INVALID_SHARE_TOKEN_ERROR } from '../utils/tokenValidation';

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

export const useScript = (shareToken: string | undefined) => {
  const [viewingScriptId, setViewingScriptId] = useState<string | null>(null);
  const [scriptElements, setScriptElements] = useState<ScriptElement[]>([]);
  const [isLoadingScript, setIsLoadingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [crewContext, setCrewContext] = useState<CrewContext | null>(null);
  // Remove unused state

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
        `/api/scripts/${scriptId}?share_token=${encodeURIComponent(shareToken!)}`
      );

      if (!elementsResponse.ok) {
        throw new Error('Failed to load script elements');
      }

      const elementsData = await elementsResponse.json();

      if (Array.isArray(elementsData)) {
        // Recalculate group durations before setting elements
        const elementsWithGroupDurations = recalculateGroupDurations(elementsData);
        setScriptElements(elementsWithGroupDurations);
        setCrewContext(null);
      } else {
        // Recalculate group durations before setting elements
        const elements = elementsData.elements || [];
        const elementsWithGroupDurations = recalculateGroupDurations(elements);
        setScriptElements(elementsWithGroupDurations);
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
    // STRIPPED FOR REBUILD: This was part of the broken coordinated refresh architecture
    // TODO REBUILD: May not be needed if unified save handles refresh via single response
    // if (viewingScriptId) {
    //   handleScriptClick(viewingScriptId);
    // }
  }, [viewingScriptId, handleScriptClick]);

  const refreshScriptElementsOnly = useCallback(async () => {
    // STRIPPED FOR REBUILD: This was part of the broken coordinated refresh architecture
    // TODO REBUILD: May not be needed if unified save handles refresh via single response
    // if (!viewingScriptId || !validateShareToken(shareToken)) {
    //   return;
    // }
    // try {
    //   const elementsResponse = await fetch(
    //     buildSharedApiUrl(`/api/scripts/${viewingScriptId}/elements`, shareToken!)
    //   );
    //   if (!elementsResponse.ok) {
    //     return;
    //   }
    //   const elementsData = await elementsResponse.json();
    //   let elements: ScriptElement[];
    //   if (Array.isArray(elementsData)) {
    //     elements = elementsData;
    //   } else {
    //     elements = elementsData.elements || [];
    //   }
    //   const elementsWithGroupDurations = recalculateGroupDurations(elements);
    //   setScriptElements(elementsWithGroupDurations);
    // } catch (err) {
    // }
  }, [viewingScriptId, shareToken]);

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