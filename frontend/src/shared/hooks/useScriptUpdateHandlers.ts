interface ScriptUpdate {
  update_type?: 'element_change' | 'element_order' | 'element_delete' | 'elements_updated' | 'script_info';
  changes?: any;
}

interface UpdateCallbacks {
  updateSingleElement: (elementId: string, element: any) => void;
  updateScriptElementsDirectly: (elements: any[]) => void;
  deleteElement: (elementId: string) => void;
  refreshScriptElementsOnly: () => void;
}

export const useScriptUpdateHandlers = (callbacks: UpdateCallbacks) => {
  const handleUpdate = (update: ScriptUpdate) => {
    const { updateSingleElement, updateScriptElementsDirectly, deleteElement, refreshScriptElementsOnly } = callbacks;
    
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
      // Script info changes (name, status, times, notes) may affect the script header display
      // For now, do lightweight refresh to get updated script metadata
      refreshScriptElementsOnly();
    }
  };

  return { handleUpdate };
};