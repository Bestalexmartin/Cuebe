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
        for (let i = 0; i < elements.length; i++) {
          if (elements[i].timeOffsetMs > cleanData.timeOffsetMs) {
            insertIndex = i;
            break;
          }
        }
      }

      if (insertIndex === elements.length) {
        applyLocalChange({
          type: "CREATE_ELEMENT",
          elementId: cleanData.elementID,
          elementData: cleanData,
        } as any);
      } else {
        applyLocalChange({
          type: "CREATE_ELEMENT_AT_INDEX",
          elementId: cleanData.elementID,
          elementData: cleanData,
          insertIndex,
        } as any);
      }
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
