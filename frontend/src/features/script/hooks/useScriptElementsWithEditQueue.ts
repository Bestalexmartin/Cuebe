// frontend/src/features/script/hooks/useScriptElementsWithEditQueue.ts

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
// REMOVED: useAuth - no longer fetching
import { ScriptElement } from "../types/scriptElements";
import {
  EditOperation,
  ToggleGroupCollapseOperation,
  BatchCollapseGroupsOperation,
} from "../types/editQueue";
import { useEditQueue } from "./useEditQueue";
import {
  applyOperationToElements,
  getVisibleScriptElements,
  recalculateGroupTimings,
  sortInitialScriptElements,
} from "../utils/editQueueElementOperations";

interface UseScriptElementsWithEditQueueReturn {
  // Current view state (server + local changes)
  elements: ScriptElement[];
  allElements: ScriptElement[]; // All elements including collapsed children
  serverElements: ScriptElement[];

  // Loading and error states - removed (no longer fetching)

  // Edit queue integration
  hasUnsavedChanges: boolean;
  pendingOperations: EditOperation[];

  // Operations
  applyLocalChange: (
    operation: Omit<EditOperation, "id" | "timestamp" | "description">,
  ) => void;

  // Save operations
  saveChanges: () => Promise<boolean>;
  discardChanges: () => void;
  updateServerElements: (freshElements: ScriptElement[]) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Group operations
  toggleGroupCollapse: (elementId: string) => void;
  expandAllGroups: () => void;
  collapseAllGroups: () => void;

  // Checkpoint operations
  checkpoints: any[];
  activeCheckpoint: string | undefined | null;
  createCheckpoint: (
    type: "AUTO_SORT" | "MANUAL",
    description: string,
    scriptData?: any,
  ) => string;
  revertToCheckpoint: (checkpointId: string) => Promise<boolean>;

  // Revert
  revertToPoint: (targetIndex: number) => void;
}

interface UseScriptElementsOptions {
  element_type?: string;
  departmentId?: string;
  skip?: number;
  limit?: number;
  onAfterSave?: () => Promise<void>;
  autoSortCues?: boolean;
  sendSyncUpdate?: (message: {
    update_type: string;
    changes?: any;
    operation_id?: string;
  }) => void;
}

export const useScriptElementsWithEditQueue = (
  _scriptId: string | undefined, // Keep for future operation tracking
  initialElements: ScriptElement[] = [], // Accept elements instead of fetching
  options: UseScriptElementsOptions = {},
): UseScriptElementsWithEditQueueReturn => {
  // RENDER TRACKING (dev-only)
  const renderCount = useRef(0);
  if (process.env.NODE_ENV !== 'production') {
    renderCount.current++;
  }
  
  const [serverElements, setServerElements] = useState<ScriptElement[]>([]);
  const [currentElements, setCurrentElements] = useState<ScriptElement[]>([]);
  // REMOVED: isLoading, error, isSaving, getToken - no longer fetching
  const [needsRebuild, setNeedsRebuild] = useState(false);
  const initializedRef = useRef(false);

  const editQueue = useEditQueue();

  // Use a ref to store the latest editQueue to create stable callbacks
  const editQueueRef = useRef(editQueue);
  editQueueRef.current = editQueue;

  // Extract only the properties we need to avoid depending on the entire object
  const { operations, hasUnsavedChanges, canUndo, canRedo, checkpoints, activeCheckpoint } = editQueue;
  
  // Track if operations is changing  
  const prevOperationsRef = useRef(operations);
  if (prevOperationsRef.current !== operations) {
      prevOperationsRef.current = operations;
  } else {
  }

  // Keep a ref to the last computed elements to prevent flicker during save
  const lastComputedElementsRef = useRef<ScriptElement[]>([]);

  // Simple reference equality check for now - revert deep comparison optimization
  const arraysEqual = useCallback((a: ScriptElement[], b: ScriptElement[]) => {
    // Just use reference equality for now to avoid expensive comparisons during playback
    return a === b;
  }, []);

  // Rebuild current elements when needed, otherwise use existing state
  const rebuildCurrentElements = useCallback(
    (baseElements: ScriptElement[], operationsToApply: EditOperation[]) => {
      let rebuiltElements = [...baseElements];


      operationsToApply.forEach((operation) => {
        rebuiltElements = applyOperationToElements(rebuiltElements, operation);
      });

      // Recalculate group durations after applying all operations
      rebuiltElements = recalculateGroupTimings(rebuiltElements);
      return rebuiltElements;
    },
    [],
  );

  // Initialize current elements from server elements on first load or when server elements change
  useEffect(() => {

    if (serverElements.length > 0) {
      if (currentElements.length === 0) {
        // First load - initialize currentElements
        setCurrentElements([...serverElements]);
        setNeedsRebuild(false);
      } else if (operations.length === 0) {
        // Server elements changed and no pending operations - update currentElements only if content changed
        if (!arraysEqual(currentElements, serverElements)) {
          setCurrentElements([...serverElements]);
        }
        setNeedsRebuild(false);
      } else {
        // Server elements changed with pending operations - trigger rebuild
        setNeedsRebuild(true);
      }
    }
  }, [serverElements]); // Only trigger when serverElements actually changes

  // Handle rebuilds when needed
  useEffect(() => {
    if (needsRebuild && serverElements.length > 0) {
      const rebuiltElements = rebuildCurrentElements(
        serverElements,
        operations,
      );
      // Only update if the rebuilt elements are actually different
      if (!arraysEqual(currentElements, rebuiltElements)) {
        setCurrentElements(rebuiltElements);
      }
      setNeedsRebuild(false);
    }
  }, [needsRebuild, serverElements, operations, rebuildCurrentElements, currentElements, arraysEqual]);

  // Compute display elements from current elements - memoized arrays for stable references
  const allElements = useMemo(() => currentElements, [currentElements]);

  const elements = useMemo(() => {
    const visibleElements = getVisibleScriptElements(currentElements);
    lastComputedElementsRef.current = visibleElements;
    return visibleElements;
  }, [currentElements]); // REMOVED: isSaving dependency

  // REMOVED: initializeElements callback - now handled directly in useEffect to avoid infinite loops

  const applyLocalChange = useCallback(
    (operation: Omit<EditOperation, "id" | "timestamp" | "description">) => {


      // Add operation to edit queue first
      editQueueRef.current.addOperation(operation);

      // Apply operation directly to current elements for immediate UI update
      if (currentElements.length > 0) {
        const updatedElements = applyOperationToElements(
          currentElements,
          operation as EditOperation,
        );
        
        // Only recalculate group timings if this isn't a manual group parent offset change
        const isManualGroupParentOffsetChange = operation.type === 'UPDATE_ELEMENT' && 
          (operation as any).element_id &&
          updatedElements.find(el => el.element_id === (operation as any).element_id &&
            (el as any).element_type === 'GROUP') &&
          (operation as any).changes?.offset_ms;
            
        const finalElements = isManualGroupParentOffsetChange 
          ? updatedElements 
          : recalculateGroupTimings(updatedElements);
        
        
        setCurrentElements(finalElements);
      } else {
        setNeedsRebuild(true);
      }
    },
    [currentElements],
  );

  const saveChanges = useCallback(
    async (): Promise<boolean> => {
      // This function will be overridden by the parent component
      // Default implementation does nothing
      return true;
    },
    [],
  );

  const updateServerElements = useCallback((freshElements: ScriptElement[]) => {
    // Only update serverElements if they actually changed
    if (!arraysEqual(serverElements, freshElements)) {
      setServerElements(freshElements);
    }
    // Recalculate group timings for fresh elements from server before setting current elements
    const elementsWithCalculatedGroupTimings = recalculateGroupTimings([...freshElements]);
    // Only update currentElements if they actually changed
    if (!arraysEqual(currentElements, elementsWithCalculatedGroupTimings)) {
      setCurrentElements(elementsWithCalculatedGroupTimings);
    }
  }, [serverElements, currentElements, arraysEqual]);

  const discardChanges = useCallback(() => {
    editQueueRef.current.clearQueue();
    // Reset currentElements to serverElements since we've cleared all edits - only if different
    if (!arraysEqual(currentElements, serverElements)) {
      setCurrentElements([...serverElements]);
    }
  }, [serverElements, currentElements, arraysEqual]);

  const undoOperation = useCallback(() => {
    editQueueRef.current.undo();
  }, []);

  const redoOperation = useCallback(() => {
    editQueueRef.current.redo();
  }, []);

  const toggleGroupCollapse = useCallback(
    (elementId: string) => {
      // Find the current element to determine what state we're toggling TO
      const currentElement = allElements.find(
        (el) => el.element_id === elementId,
      );
      const currentlyCollapsed = currentElement?.is_collapsed || false;
      const targetState = !currentlyCollapsed;

      applyLocalChange({
        type: "TOGGLE_GROUP_COLLAPSE",
        element_id: elementId,
        target_collapsed_state: targetState,
      } as Omit<
        ToggleGroupCollapseOperation,
        "id" | "timestamp" | "description"
      >);
    },
    [applyLocalChange, allElements],
  );

  const expandAllGroups = useCallback(() => {
    // Find all group elements that are currently collapsed
    const collapsedGroups = allElements.filter(
      (el) => el.element_type === "GROUP" && el.is_collapsed === true,
    );

    if (collapsedGroups.length === 0) return;

    applyLocalChange({
      type: "BATCH_COLLAPSE_GROUPS",
      element_id: "batch_expand_all",
      group_element_ids: collapsedGroups.map((el) => el.element_id),
      target_collapsed_state: false,
    } as Omit<
      BatchCollapseGroupsOperation,
      "id" | "timestamp" | "description"
    >);
  }, [applyLocalChange, allElements]);

  const collapseAllGroups = useCallback(() => {
    // Find all group elements that are currently expanded
    const expandedGroups = allElements.filter(
      (el) =>
        el.element_type === "GROUP" &&
        (el.is_collapsed === false || el.is_collapsed === undefined),
    );

    if (expandedGroups.length === 0) return;

    applyLocalChange({
      type: "BATCH_COLLAPSE_GROUPS",
      element_id: "batch_collapse_all",
      group_element_ids: expandedGroups.map((el) => el.element_id),
      target_collapsed_state: true,
    } as Omit<
      BatchCollapseGroupsOperation,
      "id" | "timestamp" | "description"
    >);
  }, [applyLocalChange, allElements]);

  // Checkpoint operations
  const createCheckpoint = useCallback(
    (
      type: "AUTO_SORT" | "MANUAL",
      description: string,
      scriptData?: any,
    ): string => {
      return editQueueRef.current.createCheckpoint(
        type,
        description,
        elements,
        scriptData,
      );
    },
    [], // Remove dependencies to make function stable
  );

  const revertToCheckpoint = useCallback(
    async (checkpointId: string): Promise<boolean> => {
      const checkpoint = editQueueRef.current.revertToCheckpoint(checkpointId);
      if (!checkpoint) {
        return false;
      }

      // Trigger rebuild from serverElements + remaining operations after revert
      setNeedsRebuild(true);
      return true;
    },
    [], // Remove dependencies to make function stable
  );

  // Custom revert to point function that triggers rebuild
  const revertToPoint = useCallback((targetIndex: number) => {
    editQueueRef.current.revertToPoint(targetIndex);
    setNeedsRebuild(true);
  }, []);

  // Initialize elements when data first becomes available
  useEffect(() => {
    if (initialElements && initialElements.length > 0 && !initializedRef.current) {
      const sortedElements = sortInitialScriptElements(
        initialElements,
        options.autoSortCues,
      );

      setServerElements(sortedElements);
      initializedRef.current = true;
    }
  }, [initialElements, options.autoSortCues]); // Direct dependencies, no callback

  return useMemo(
    () => {
      return {
        // Current view state
        elements,
        allElements,
        serverElements,

      // Loading and error states - removed (no longer fetching)

      // Edit queue integration
      hasUnsavedChanges,
      pendingOperations: operations,

      // Operations
      applyLocalChange,

      // Save operations
      saveChanges,
      discardChanges,
      updateServerElements,

      // Undo/Redo
      undo: undoOperation,
      redo: redoOperation,
      canUndo,
      canRedo,

      // Group operations
      toggleGroupCollapse,
      expandAllGroups,
      collapseAllGroups,

      // Checkpoint operations
      checkpoints,
      activeCheckpoint,
      createCheckpoint,
      revertToCheckpoint,

      // Revert
      revertToPoint,
    };
  },
    [
      // Use array lengths instead of array references to reduce re-renders
      elements.length,
      allElements.length,
      serverElements.length,
      hasUnsavedChanges,
      operations.length, // Use length instead of array reference
      canUndo,
      canRedo,
      checkpoints.length, // Use length instead of array reference
      activeCheckpoint,
      // Functions are already memoized with useCallback, no need to include them here
    ],
  );
};
