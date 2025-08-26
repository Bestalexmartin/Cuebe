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
}

export const useScriptUpdateHandlers = (callbacks: UpdateCallbacks) => {
  const handleUpdate = (update: ScriptUpdate) => {
    console.log("🔄 SharedPage: Received websocket update:", {
      update_type: update.update_type,
      hasChanges: !!update.changes,
      changesType: typeof update.changes,
      changesLength: Array.isArray(update.changes) ? update.changes.length : 'not-array'
    });

    const {
      updateSingleElement,
      updateScriptElementsDirectly,
      deleteElement,
      refreshScriptElementsOnly,
      refreshSharedData,
      updateScriptInfo,
    } = callbacks;

    // Guard against updates without type
    if (!update.update_type) {
      console.log("🔄 SharedPage: Ignoring update without type");
      return;
    }

    // Apply updates based on update type - now expecting operation objects
    if (update.update_type === "script_info") {
      console.log("🔄 SharedPage: Handling script_info update");
      // Script info changes - apply directly if possible, otherwise refresh
      if (updateScriptInfo && update.changes) {
        updateScriptInfo(update.changes);
      } else if (refreshSharedData) {
        refreshSharedData();
      } else {
        refreshScriptElementsOnly();
      }
    } else if (update.update_type === "elements_updated") {
      console.log("🔄 SharedPage: Handling elements_updated - no refresh needed");
      // Elements_updated contains operation data, but we don't need to refresh local data
      // The purpose is just to notify that changes were made
    } else if (update.changes) {
      console.log("🔄 SharedPage: Handling individual operation update");
      // Individual operation updates - the changes field contains the operation object
      const operation = update.changes;
      
      // For individual operations that significantly change structure, refresh
      if (operation.type === 'CREATE_ELEMENT' || operation.type === 'DELETE_ELEMENT' || 
          operation.type === 'CREATE_GROUP' || operation.type === 'UNGROUP_ELEMENTS' ||
          operation.type === 'REORDER' || operation.type === 'BULK_REORDER' ||
          operation.type === 'ENABLE_AUTO_SORT' || operation.type === 'DISABLE_AUTO_SORT') {
        console.log("🔄 SharedPage: Structural change - refreshing elements");
        refreshScriptElementsOnly();
      } else {
        console.log("🔄 SharedPage: Field update - refreshing elements");
        // For simple field updates, we could be more granular but refresh is safer
        refreshScriptElementsOnly();
      }
    } else {
      console.log("🔄 SharedPage: Unknown update type or no changes:", update.update_type);
    }
  };

  return { handleUpdate };
};
