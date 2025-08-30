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
import { applyOperationToElements } from '../utils/elementOperations';

export const useScriptUpdateHandlers = (callbacks: UpdateCallbacks) => {
  const handleUpdate = useCallback((update: ScriptUpdate) => {
    console.log('🔄 SHARED: Received websocket update:', update);
    
    const {
      updateSingleElement,
      deleteElement,
      refreshScriptElementsOnly,
      refreshSharedData,
      updateScriptInfo,
    } = callbacks;

    // Guard against updates without type
    if (!update.update_type) {
      console.log('❌ SHARED: Update missing type, ignoring');
      return;
    }

    // Apply updates based on update type - now expecting operation objects
    if (update.update_type === "script_info") {
      console.log('📋 SHARED: Processing script_info update:', update.changes);
      // Script info changes - apply directly (no API calls)
      if (updateScriptInfo && update.changes) {
        updateScriptInfo(update.changes);
      } else {
        console.log('⚠️ SHARED: No updateScriptInfo handler available, skipping script info update');
      }
    } else if (update.update_type === "elements_updated") {
      console.log('📝 SHARED: Processing elements_updated:', update.changes);
      // Use shared operation logic to apply all changes at once
      if (Array.isArray(update.changes) && callbacks.getCurrentElements && callbacks.updateScriptElementsDirectly) {
        const currentElements = callbacks.getCurrentElements();
        let updatedElements = currentElements;
        
        // Apply each operation using shared logic
        for (const operation of update.changes) {
          updatedElements = applyOperationToElements(updatedElements, operation);
        }
        
        console.log('✅ SHARED: Applied', update.changes.length, 'operations locally');
        callbacks.updateScriptElementsDirectly(updatedElements);
      } else {
        console.log('⚠️ SHARED: Missing required callbacks for elements_updated');
      }
    } else if (update.changes) {
      console.log('🔧 SHARED: Processing individual operation update:', update.changes);
      // Use shared operation logic for individual updates too
      if (callbacks.getCurrentElements && callbacks.updateScriptElementsDirectly) {
        const currentElements = callbacks.getCurrentElements();
        const updatedElements = applyOperationToElements(currentElements, update.changes);
        callbacks.updateScriptElementsDirectly(updatedElements);
      } else {
        console.log('⚠️ SHARED: Missing required callbacks for individual operation');
      }
    }
  }, [callbacks]);

  return { handleUpdate };
};
