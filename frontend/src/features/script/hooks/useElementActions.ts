// frontend/src/features/script/hooks/useElementActions.ts

import { useCallback, useMemo } from "react";
export function useElementActions(
  elements: any[],
  autoSort: boolean,
  applyLocalChange: (op: any) => void,
) {
  const insertElement = useCallback(
    (elementData: any) => {
      const cleanData = { ...elementData };
      delete (cleanData as any)._autoSort;

      let insertIndex = elements.length;
      if (autoSort) {
        // Find correct insertion point in chronological order
        for (let i = 0; i < elements.length; i++) {
          if (elements[i].time_offset_ms > cleanData.time_offset_ms) {
            insertIndex = i;
            break;
          }
        }
      }

      // Calculate proper sequence based on insertion position
      const properSequence = insertIndex + 1;
      
      applyLocalChange({
        type: "CREATE_ELEMENT",
        element_id: cleanData.element_id,
        element_data: {
          ...cleanData,
          sequence: properSequence
        },
        insertIndex: insertIndex === elements.length ? undefined : insertIndex,
      } as any);
    },
    [elements, autoSort, applyLocalChange],
  );

  return useMemo(
    () => ({
      insertElement,
    }),
    [insertElement],
  );
}
