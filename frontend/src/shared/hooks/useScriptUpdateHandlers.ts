interface ScriptUpdate {
  update_type?: 'element_change' | 'element_order' | 'element_delete' | 'elements_updated' | 'script_info';
  changes?: any;
}

interface UpdateCallbacks {
  updateSingleElement: (elementId: string, element: any) => void;
  updateScriptElementsDirectly: (elements: any[]) => void;
  deleteElement: (elementId: string) => void;
  refreshScriptElementsOnly: () => void;
  refreshSharedData?: () => void; // For full data refresh if needed
  updateScriptInfo?: (changes: any) => void; // For direct script info updates
}

export const useScriptUpdateHandlers = (callbacks: UpdateCallbacks) => {
  const handleUpdate = (update: ScriptUpdate) => {
    const { updateSingleElement, updateScriptElementsDirectly, deleteElement, refreshScriptElementsOnly, refreshSharedData, updateScriptInfo } = callbacks;
    
    // Guard against updates without type
    if (!update.update_type) return;
    
    // Apply targeted updates based on update type
    if (update.update_type === 'element_change' && update.changes) {
      const updatedElement = update.changes;
      updateSingleElement(updatedElement.element_id, updatedElement);
    } else if (update.update_type === 'element_order' && update.changes?.elements) {
      updateScriptElementsDirectly(update.changes.elements);
    } else if (update.update_type === 'element_delete' && update.changes?.element_id) {
      deleteElement(update.changes.element_id);
    } else if (update.update_type === 'elements_updated') {
      refreshScriptElementsOnly();
    } else if (update.update_type === 'script_info') {
      // Script info changes - apply directly if possible, otherwise refresh
      if (updateScriptInfo && update.changes) {
        console.log('🔄 ScriptUpdate: Applying script info changes directly:', update.changes);
        updateScriptInfo(update.changes);
      } else if (refreshSharedData) {
        console.log('🔄 ScriptUpdate: Full data refresh for script info changes');
        refreshSharedData();
      } else {
        // Fallback to element refresh if nothing else available
        refreshScriptElementsOnly();
      }
    }
  };

  return { handleUpdate };
};