interface ScriptUpdate {
  update_type?:
    | "element_change"
    | "element_create" 
    | "element_delete"
    | "element_update"
    | "element_order"
    | "element_group"
    | "element_group_state"
    | "elements_updated"
    | "script_info";
  changes?: any;
}

interface UpdateCallbacks {
  updateSingleElement: (elementId: string, element: any) => void;
  updateScriptElementsDirectly: (elements: any[]) => void;
  deleteElement: (elementId: string) => void;
  refreshScriptElementsOnly: () => void;
  refreshSharedData?: () => void; // For full data refresh if needed
  updateScriptInfo?: (changes: any) => void; // For direct script info updates
  getCurrentElements?: () => any[]; // Get current elements for CREATE operations
}

import { useCallback } from 'react';

export const useScriptUpdateHandlers = (callbacks: UpdateCallbacks) => {
  const handleUpdate = useCallback((update: ScriptUpdate) => {
    const {
      updateSingleElement,
      deleteElement,
      refreshScriptElementsOnly,
      refreshSharedData,
      updateScriptInfo,
    } = callbacks;

    // Guard against updates without type
    if (!update.update_type) {
      return;
    }

    // Apply updates based on update type - now expecting operation objects
    if (update.update_type === "script_info") {
      // Script info changes - apply directly if possible, otherwise refresh
      if (updateScriptInfo && update.changes) {
        updateScriptInfo(update.changes);
      } else if (refreshSharedData) {
        refreshSharedData();
      } else {
        refreshScriptElementsOnly();
      }
    } else if (update.update_type === "elements_updated") {
      // Elements_updated contains operation data that needs to be processed
      if (Array.isArray(update.changes)) {
        // Process each operation to update the UI
        for (const operation of update.changes) {
          if (operation.type === 'UPDATE_ELEMENT' && updateSingleElement) {
            // Apply the element update directly - extract new_value from each change
            const elementChanges: Record<string, any> = {};
            Object.entries(operation.changes || {}).forEach(([field, changeData]: [string, any]) => {
              if (changeData && typeof changeData === 'object' && 'new_value' in changeData) {
                elementChanges[field] = changeData.new_value;
              } else {
                elementChanges[field] = changeData; // Fallback for direct values
              }
            });
            
            updateSingleElement(operation.element_id, elementChanges);
          } else if (operation.type === 'CREATE_ELEMENT' && operation.element_data && callbacks.getCurrentElements) {
            // Add the new element directly to local state
            // Get current elements and add the new one
            const currentElements = callbacks.getCurrentElements();
            const newElements = [...currentElements, operation.element_data];
            callbacks.updateScriptElementsDirectly(newElements);
          } else if (operation.type === 'DELETE_ELEMENT' && deleteElement) {
            // Remove the element directly from local state
            deleteElement(operation.element_id);
          }
        }
      } else {
        refreshScriptElementsOnly();
      }
    } else if (update.changes) {
      // Individual operation updates - the changes field contains the operation object
      const operation = update.changes;
      
      // For individual operations that significantly change structure, refresh
      if (operation.type === 'CREATE_ELEMENT' || operation.type === 'DELETE_ELEMENT' || 
          operation.type === 'CREATE_GROUP' || operation.type === 'UNGROUP_ELEMENTS' ||
          operation.type === 'REORDER' || operation.type === 'BULK_REORDER' ||
          operation.type === 'ENABLE_AUTO_SORT' || operation.type === 'DISABLE_AUTO_SORT') {
        refreshScriptElementsOnly();
      } else {
        // For simple field updates, we could be more granular but refresh is safer
        refreshScriptElementsOnly();
      }
    }
  }, [callbacks]);

  return { handleUpdate };
};
