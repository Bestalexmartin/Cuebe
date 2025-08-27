// frontend/src/features/script/hooks/useScriptElementsWithEditQueue.ts

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { ScriptElement } from "../types/scriptElements";
import {
  EditOperation,
  ToggleGroupCollapseOperation,
  BatchCollapseGroupsOperation,
} from "../types/editQueue";
import { useEditQueue } from "./useEditQueue";

interface UseScriptElementsWithEditQueueReturn {
  // Current view state (server + local changes)
  elements: ScriptElement[];
  allElements: ScriptElement[]; // All elements including collapsed children
  serverElements: ScriptElement[];

  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // Edit queue integration
  hasUnsavedChanges: boolean;
  pendingOperations: EditOperation[];

  // Operations
  refetchElements: () => Promise<void>;
  applyLocalChange: (
    operation: Omit<EditOperation, "id" | "timestamp" | "description">,
  ) => void;

  // Save operations
  saveChanges: (clearHistory?: boolean) => Promise<boolean>;
  discardChanges: () => void;

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
  scriptId: string | undefined,
  options: UseScriptElementsOptions = {},
): UseScriptElementsWithEditQueueReturn => {
  const [serverElements, setServerElements] = useState<ScriptElement[]>([]);
  const [currentElements, setCurrentElements] = useState<ScriptElement[]>([]); // NEW: Live UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [needsRebuild, setNeedsRebuild] = useState(false); // NEW: Track when rebuild is needed
  const { getToken } = useAuth();

  const editQueue = useEditQueue();

  // Use a ref to store the latest editQueue to create stable callbacks
  const editQueueRef = useRef(editQueue);
  editQueueRef.current = editQueue;

  // Extract only the properties we need to avoid depending on the entire object
  const { operations, hasUnsavedChanges, canUndo, canRedo } = editQueue;

  // Keep a ref to the last computed elements to prevent flicker during save
  const lastComputedElementsRef = useRef<ScriptElement[]>([]);

  // Rebuild current elements when needed, otherwise use existing state
  const rebuildCurrentElements = useCallback(
    (baseElements: ScriptElement[], operationsToApply: EditOperation[]) => {
      let rebuiltElements = [...baseElements];

      console.log("🔄 REBUILD - Starting operation replay", {
        totalOperations: operationsToApply.length,
        operationTypes: operationsToApply.map((op) => op.type),
        operationIds: operationsToApply.map((op) => op.id),
      });

      operationsToApply.forEach((operation, index) => {
        console.log(
          `🔄 REBUILD - Replaying operation ${index + 1}/${operationsToApply.length}`,
          {
            operationType: operation.type,
            operationId: operation.id,
            elementId: operation.element_id,
          },
        );
        rebuiltElements = applyOperationToElements(rebuiltElements, operation);
      });

      // Recalculate group durations after applying all operations
      rebuiltElements = recalculateGroupDurations(rebuiltElements);
      return rebuiltElements;
    },
    [],
  );

  // Initialize current elements from server elements on first load or when server elements change
  useEffect(() => {
    console.log("🔍 SERVER ELEMENTS EFFECT TRIGGERED", {
      serverElementsLength: serverElements.length,
      currentElementsLength: currentElements.length,
      operationsLength: operations.length,
      serverElementsRef:
        serverElements.length > 0 ? serverElements[0]?.element_id : "empty",
      timestamp: Date.now(),
    });

    if (serverElements.length > 0) {
      if (currentElements.length === 0) {
        // First load - initialize currentElements
        console.log(
          "🔄 INIT - Setting initial currentElements from serverElements",
          { count: serverElements.length },
        );
        setCurrentElements([...serverElements]);
        setNeedsRebuild(false);
      } else if (operations.length === 0) {
        // Server elements changed and no pending operations - update currentElements
        console.log(
          "🔄 REFRESH - Updating currentElements from fresh serverElements",
          { count: serverElements.length },
        );
        setCurrentElements([...serverElements]);
        setNeedsRebuild(false);
      } else {
        // Server elements changed with pending operations - trigger rebuild
        console.log(
          "🔄 REFRESH - Server elements changed with pending operations, triggering rebuild",
          {
            operationsCount: operations.length,
            serverElementsCount: serverElements.length,
            currentElementsCount: currentElements.length,
          },
        );
        setNeedsRebuild(true);
      }
    }
  }, [serverElements]); // Only trigger when serverElements actually changes

  // Handle rebuilds when needed
  useEffect(() => {
    if (needsRebuild && serverElements.length > 0) {
      console.log("🔄 REBUILD - Rebuilding currentElements", {
        serverElementsCount: serverElements.length,
        operationsCount: operations.length,
      });
      const rebuiltElements = rebuildCurrentElements(
        serverElements,
        operations,
      );
      setCurrentElements(rebuiltElements);
      setNeedsRebuild(false);
    }
  }, [needsRebuild, serverElements, operations, rebuildCurrentElements]);

  // Compute display elements from current elements
  const { elements, allElements } = useMemo(() => {
    // If we're saving, return the last computed state to prevent flicker
    if (isSaving && lastComputedElementsRef.current.length > 0) {
      return {
        elements: lastComputedElementsRef.current,
        allElements: lastComputedElementsRef.current, // This isn't ideal but prevents crashes during save
      };
    }

    // Filter out collapsed child elements for display
    const visibleElements = currentElements.filter((element) => {
      // Always show parent elements (group_level === 0 or no parent)
      if (!element.parent_element_id) {
        return true;
      }

      // Find the parent element
      const parent = currentElements.find(
        (el) => el.element_id === element.parent_element_id,
      );

      // If parent doesn't exist or parent is not collapsed, show this element
      return !parent || !parent.is_collapsed;
    });

    // Store the computed elements for potential use during save
    lastComputedElementsRef.current = visibleElements;

    return {
      elements: visibleElements,
      allElements: currentElements, // Include all elements for group summary calculations
    };
  }, [currentElements, isSaving]);

  const fetchElements = useCallback(async () => {
    if (!scriptId) {
      setServerElements([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Authentication token not available");
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (options.element_type)
        params.append("element_type", options.element_type);
      if (options.departmentId)
        params.append("department_id", options.departmentId);
      if (options.skip !== undefined)
        params.append("skip", options.skip.toString());
      if (options.limit !== undefined)
        params.append("limit", options.limit.toString());

      const queryString = params.toString();
      const url = `/api/scripts/${scriptId}/elements${queryString ? "?" + queryString : ""}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch script elements: ${response.status}`);
      }

      const data = await response.json();

      // Sort elements based on auto-sort preference
      const sortedElements = data.sort((a: ScriptElement, b: ScriptElement) => {
        if (options.autoSortCues) {
          // Auto-sort enabled: sort by time offset first, then handle parent-child relationships
          if (a.offset_ms !== b.offset_ms) {
            return a.offset_ms - b.offset_ms;
          }

          // If same time offset, check if one is parent of the other
          if (a.element_id === b.parent_element_id) {
            // a is parent of b, a should come first
            return -1;
          }
          if (b.element_id === a.parent_element_id) {
            // b is parent of a, b should come first
            return 1;
          }

          // If same time but no parent-child relationship, maintain sequence order
          return a.sequence - b.sequence;
        } else {
          // Auto-sort disabled: respect sequence order from database
          return a.sequence - b.sequence;
        }
      });

      setServerElements(sortedElements);
    } catch (err) {
      console.error("Error fetching script elements:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch script elements",
      );
      setServerElements([]);
    } finally {
      setIsLoading(false);
    }
  }, [scriptId, getToken, JSON.stringify(options)]);

  const applyLocalChange = useCallback(
    (operation: Omit<EditOperation, "id" | "timestamp" | "description">) => {
      console.log("🎆 APPLY LOCAL CHANGE - Called", {
        operationType: operation.type,
        elementId: operation.element_id,
        currentElementsCount: currentElements.length,
      });

      // Add operation to edit queue first
      editQueue.addOperation(operation);

      // Apply operation directly to current elements for immediate UI update
      if (currentElements.length > 0) {
        console.log(
          "🎆 APPLY LOCAL CHANGE - Applying directly to currentElements",
        );
        const updatedElements = applyOperationToElements(
          currentElements,
          operation as EditOperation,
        );
        const finalElements = recalculateGroupDurations(updatedElements);
        setCurrentElements(finalElements);
      } else {
        console.log(
          "🎆 APPLY LOCAL CHANGE - No currentElements yet, will rebuild later",
        );
        setNeedsRebuild(true);
      }
    },
    [editQueue.addOperation, currentElements],
  );

  const saveChanges = useCallback(
    async (clearHistory: boolean = true): Promise<boolean> => {
      if (!scriptId || editQueueRef.current.operations.length === 0) {
        return true;
      }

      try {
        // Capture operation count and details before save (might be cleared after)
        const operationCount = editQueueRef.current.operations.length;
        const currentOperations = [...editQueueRef.current.operations];

        // Set saving flag to prevent flicker
        setIsSaving(true);
        const token = await getToken();
        if (!token) {
          throw new Error("Authentication token not available");
        }

        // Send batch of operations to server
        const response = await fetch(
          `/api/scripts/${scriptId}/elements/batch-update`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              operations: editQueueRef.current.operations,
            }),
          },
        );

        if (!response.ok) {
          let errorData;
          try {
            const text = await response.text();
            if (text) {
              try {
                errorData = JSON.parse(text);
              } catch {
                errorData = text;
              }
            } else {
              errorData = "No error details available";
            }
          } catch {
            errorData = "Failed to read error response";
          }
          console.error("Backend error response:", response.status, errorData);
          throw new Error(
            `Failed to save changes: ${response.status} - ${JSON.stringify(errorData)}`,
          );
        }

        // Note: WebSocket broadcasting is handled by useScriptModalHandlers
        // to avoid duplicate messages and ensure proper coordination
        console.log("🔄 Elements Save: Completed successfully", {
          operationCount,
          timestamp: new Date().toISOString(),
          operationTypes: currentOperations.map((op) => op.type),
          note: "WebSocket broadcasting delegated to modal handlers",
        });

        // Update server elements with current state and reset currentElements for fresh start
        if (currentElements.length > 0) {
          console.log(
            "🔄 Elements Save: Updating serverElements with currentElements",
            {
              currentElementsCount: currentElements.length,
            },
          );
          setServerElements([...currentElements]);
          setCurrentElements([...currentElements]); // Reset currentElements to match new server state
        }

        // Conditionally clear the edit queue based on clearHistory parameter
        if (clearHistory) {
          editQueueRef.current.clearQueue();
        }

        // Clear saving flag to allow normal rendering
        setIsSaving(false);

        return true;
      } catch (err) {
        console.error("Error saving changes:", err);
        setError(err instanceof Error ? err.message : "Failed to save changes");
        setIsSaving(false); // Clear saving flag on error too
        return false;
      }
    },
    [scriptId, getToken, currentElements],
  );

  const discardChanges = useCallback(() => {
    editQueueRef.current.clearQueue();
  }, []);

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
      return editQueue.createCheckpoint(
        type,
        description,
        elements,
        scriptData,
      );
    },
    [editQueue, elements],
  );

  const revertToCheckpoint = useCallback(
    async (checkpointId: string): Promise<boolean> => {
      const checkpoint = editQueue.revertToCheckpoint(checkpointId);
      if (!checkpoint) {
        return false;
      }

      // Trigger rebuild from serverElements + remaining operations after revert
      console.log("🔄 REVERT TO CHECKPOINT - Triggering rebuild");
      setNeedsRebuild(true);
      return true;
    },
    [editQueue],
  );

  // Custom revert to point function that triggers rebuild
  const revertToPoint = useCallback((targetIndex: number) => {
    console.log("🔄 REVERT TO POINT - Triggering rebuild", { targetIndex });
    editQueueRef.current.revertToPoint(targetIndex);
    setNeedsRebuild(true);
  }, []);

  // Only fetch on mount or script ID change - not on options changes
  useEffect(() => {
    fetchElements();
  }, [scriptId]); // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(
    () => ({
      // Current view state
      elements,
      allElements,
      serverElements,

      // Loading and error states
      isLoading,
      error,

      // Edit queue integration
      hasUnsavedChanges,
      pendingOperations: operations,

      // Operations
      refetchElements: fetchElements,
      applyLocalChange,

      // Save operations
      saveChanges,
      discardChanges,

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
      checkpoints: editQueue.checkpoints,
      activeCheckpoint: editQueue.activeCheckpoint,
      createCheckpoint,
      revertToCheckpoint,

      // Revert
      revertToPoint,
    }),
    [
      elements,
      allElements,
      serverElements,
      isLoading,
      error,
      hasUnsavedChanges,
      operations,
      fetchElements,
      applyLocalChange,
      saveChanges,
      discardChanges,
      undoOperation,
      redoOperation,
      canUndo,
      canRedo,
      toggleGroupCollapse,
      expandAllGroups,
      collapseAllGroups,
      editQueue.checkpoints,
      editQueue.activeCheckpoint,
      createCheckpoint,
      revertToCheckpoint,
      revertToPoint,
    ],
  );
};

/**
 * Normalize sequences to ensure consecutive numbering (1, 2, 3, 4...)
 * This closes gaps left by deleted elements
 */
function normalizeSequences(elements: ScriptElement[]): ScriptElement[] {
  // Sort elements by current sequence, then reassign consecutive sequences
  const sortedElements = [...elements].sort((a, b) => a.sequence - b.sequence);

  return sortedElements.map((element, index) => ({
    ...element,
    sequence: index + 1,
  }));
}

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

/**
 * Apply a single edit operation to an array of elements
 */
function applyOperationToElements(
  elements: ScriptElement[],
  operation: EditOperation,
): ScriptElement[] {
  switch (operation.type) {
    case "REORDER":
      const reorderOp = operation as any;
      console.log("🔥 EDIT QUEUE - Processing REORDER operation", {
        operationType: operation.type,
        elementId: operation.element_id,
        oldSequence: reorderOp.old_sequence,
        newSequence: reorderOp.new_sequence,
        isGroupParent: reorderOp.is_group_parent,
        groupChildrenCount: reorderOp.group_children?.length || 0,
        totalElementsBeforeReorder: elements.length,
      });

      const elementToMove = elements.find(
        (el) => el.element_id === operation.element_id,
      );

      if (!elementToMove) {
        console.log("🔥 EDIT QUEUE - REORDER FAILED: Element not found", {
          elementId: operation.element_id,
          availableElementIds: elements.map((el) => el.element_id),
        });
        return elements;
      }

      // Check if we're moving a group parent - if so, move the entire group
      const isGroupParent = (elementToMove as any).element_type === "GROUP";

      if (isGroupParent) {
        // Two-phase group reordering to properly handle sequence gaps
        const oldSeq = reorderOp.old_sequence;
        const newSeq = reorderOp.new_sequence;

        // Find all children of this group
        const groupChildren = elements.filter(
          (el) => el.parent_element_id === elementToMove.element_id,
        );
        const groupSize = groupChildren.length + 1; // +1 for the group parent

        // PHASE 1: Remove group and shift elements up to fill the holes
        let updatedElements = elements.map((el) => {
          if (
            el.element_id === operation.element_id ||
            el.parent_element_id === elementToMove.element_id
          ) {
            // Group elements: temporarily give them very high sequences to keep them out of the way
            return { ...el, sequence: 9999 + el.sequence };
          } else if (el.sequence > oldSeq + groupSize - 1) {
            // Elements after the ENTIRE old group footprint: shift up to fill holes
            return { ...el, sequence: el.sequence - groupSize };
          } else {
            // Elements before or within the old group footprint: unchanged
            return el;
          }
        });

        // PHASE 2: Place group at new position and shift elements down as needed
        updatedElements = updatedElements.map((el) => {
          if (el.element_id === operation.element_id) {
            // Group parent: place at new sequence
            return { ...el, sequence: newSeq };
          } else if (el.parent_element_id === elementToMove.element_id) {
            // Group children: place consecutively after parent
            const childIndex = groupChildren.findIndex(
              (child) => child.element_id === el.element_id,
            );
            return { ...el, sequence: newSeq + childIndex + 1 };
          } else if (el.sequence >= newSeq && el.sequence < 9999) {
            // Non-group elements at or after new position: shift down by group size
            return { ...el, sequence: el.sequence + groupSize };
          } else {
            // Other elements: unchanged
            return el;
          }
        });

        // Sort all elements by sequence to get the new order
        return [...updatedElements].sort((a, b) => a.sequence - b.sequence);
      } else {
        // Regular element move (not a group parent)
        // Need to properly shift sequences to avoid conflicts
        const oldSeq = reorderOp.old_sequence;
        const newSeq = reorderOp.new_sequence;

        let updatedElements = elements.map((el) => {
          if (el.element_id === operation.element_id) {
            // This is the element being moved
            return { ...el, sequence: newSeq };
          } else {
            // Shift other elements to make room
            if (oldSeq < newSeq) {
              // Moving down: shift elements between old and new positions up
              if (el.sequence > oldSeq && el.sequence <= newSeq) {
                return { ...el, sequence: el.sequence - 1 };
              }
            } else if (oldSeq > newSeq) {
              // Moving up: shift elements between new and old positions down
              if (el.sequence >= newSeq && el.sequence < oldSeq) {
                return { ...el, sequence: el.sequence + 1 };
              }
            }
            return { ...el };
          }
        });

        // Sort to get the new order for group membership detection
        const sortedElements = [...updatedElements].sort(
          (a, b) => a.sequence - b.sequence,
        );

        // Find the moved element and its surrounding elements for group membership logic
        const movedElementIndex = sortedElements.findIndex(
          (el) => el.element_id === operation.element_id,
        );
        const movedElement = sortedElements[movedElementIndex];

        if (movedElement && movedElementIndex >= 0) {
          // Get surrounding elements (excluding group parents)
          const nonGroupElements = sortedElements.filter(
            (el) => (el as any).element_type !== "GROUP",
          );
          const movedNonGroupIndex = nonGroupElements.findIndex(
            (el) => el.element_id === operation.element_id,
          );

          const beforeElement =
            movedNonGroupIndex > 0
              ? nonGroupElements[movedNonGroupIndex - 1]
              : null;
          const afterElement =
            movedNonGroupIndex < nonGroupElements.length - 1
              ? nonGroupElements[movedNonGroupIndex + 1]
              : null;

          let updatedMovedElement = { ...movedElement };

          // Only apply automatic group changes when auto-sort is enabled
          // In auto-sort mode: position = time relationship, so grouping is safe
          // In manual mode: position ≠ time relationship, so grouping would be incorrect
          if ((operation as any).auto_sort_enabled) {
            // Check if both surrounding elements are in the same group
            if (
              beforeElement &&
              afterElement &&
              beforeElement.parent_element_id &&
              afterElement.parent_element_id &&
              beforeElement.parent_element_id === afterElement.parent_element_id
            ) {
              // Add moved element to the same group
              updatedMovedElement = {
                ...updatedMovedElement,
                parent_element_id: beforeElement.parent_element_id,
                group_level: beforeElement.group_level || 1,
              };
            } else if (movedElement.parent_element_id) {
              // Remove from previous group if moved outside group context
              updatedMovedElement = {
                ...updatedMovedElement,
                parent_element_id: undefined,
                group_level: 0,
              };
            }
          }

          // Apply the group membership changes
          updatedElements = sortedElements.map((el) =>
            el.element_id === operation.element_id ? updatedMovedElement : el,
          );
        }

        const finalResult = updatedElements;

        console.log("🔥 EDIT QUEUE - REORDER operation completed", {
          originalSequence: reorderOp.old_sequence,
          targetSequence: reorderOp.new_sequence,
          actualFinalSequence: finalResult.find(
            (el) => el.element_id === operation.element_id,
          )?.sequence,
          totalElementsAfterReorder: finalResult.length,
          isGroupParent,
          elementOrderAfterReorder: finalResult.map((el, idx) => ({
            index: idx,
            id: el.element_id,
            name: el.element_name,
            sequence: el.sequence,
          })),
        });

        return finalResult;
      }

    case "UPDATE_FIELD":
      const updateOp = operation as any;
      return elements.map((el) =>
        el.element_id === operation.element_id
          ? { ...el, [updateOp.field]: updateOp.new_value }
          : el,
      );

    case "UPDATE_TIME_OFFSET":
      const timeOp = operation as any;
      return elements.map((el) =>
        el.element_id === operation.element_id
          ? { ...el, offset_ms: timeOp.new_offset_ms }
          : el,
      );

    case "CREATE_ELEMENT":
      const createOp = operation as any;
      let newElements: typeof elements;

      if (createOp.insert_index !== undefined) {
        // Insert at specific index
        newElements = [...elements];
        newElements.splice(createOp.insert_index, 0, createOp.element_data);
      } else {
        // Append to end
        newElements = [...elements, createOp.element_data];
      }

      // Check if the new element is a group child - if so, recalculate group duration
      const newElement = createOp.element_data;
      if (
        newElement.parent_element_id &&
        newElement.group_level &&
        newElement.group_level > 0
      ) {
        // Find all children of this group (including the new one)
        const groupChildren = newElements.filter(
          (el) =>
            el.parent_element_id === newElement.parent_element_id &&
            el.group_level &&
            el.group_level > 0,
        );

        if (groupChildren.length > 0) {
          // Recalculate group duration from first to last child
          const childTimeOffsets = groupChildren.map((el) => el.offset_ms);
          const minTimeOffset = Math.min(...childTimeOffsets);
          const maxTimeOffset = Math.max(...childTimeOffsets);
          const groupDurationMs = maxTimeOffset - minTimeOffset;

          // Update the group parent
          newElements = newElements.map((el) => {
            if (el.element_id === newElement.parent_element_id) {
              return {
                ...el,
                duration_ms: groupDurationMs,
                offset_ms: minTimeOffset,
              };
            }
            return el;
          });
        }
      }

      // Update sequences for all elements
      return newElements.map((el, index) => ({
        ...el,
        sequence: index + 1,
      }));

    case "DELETE_ELEMENT":
      const elementToDelete = elements.find(
        (el) => el.element_id === operation.element_id,
      );
      if (!elementToDelete) {
        return elements;
      }

      // Check if we're deleting a group parent or child
      const isDeletingGroupParent =
        (elementToDelete as any).element_type === "GROUP";
      const isDeletingGroupChild =
        elementToDelete.group_level && elementToDelete.group_level > 0;

      let updatedElements = elements.filter(
        (el) => el.element_id !== operation.element_id,
      );

      if (isDeletingGroupParent) {
        // Deleting a group parent - ungroup all children
        updatedElements = updatedElements.map((el) => {
          if (el.parent_element_id === operation.element_id) {
            return {
              ...el,
              parent_element_id: undefined,
              group_level: 0,
            };
          }
          return el;
        });
      } else if (isDeletingGroupChild && elementToDelete.parent_element_id) {
        // Deleting a group child - check if group becomes empty
        const remainingChildren = updatedElements.filter(
          (el) =>
            el.parent_element_id === elementToDelete.parent_element_id &&
            el.group_level &&
            el.group_level > 0,
        );

        if (remainingChildren.length === 0) {
          // No children left, remove the group parent
          updatedElements = updatedElements.filter(
            (el) => el.element_id !== elementToDelete.parent_element_id,
          );
        } else if (remainingChildren.length === 1) {
          // Only one child left, ungroup it and remove the group parent
          updatedElements = updatedElements
            .map((el) => {
              if (el.element_id === remainingChildren[0].element_id) {
                return {
                  ...el,
                  parent_element_id: undefined,
                  group_level: 0,
                };
              }
              return el;
            })
            .filter(
              (el) => el.element_id !== elementToDelete.parent_element_id,
            );
        } else {
          // Multiple children remain - recalculate group duration
          const childTimeOffsets = remainingChildren.map((el) => el.offset_ms);
          const minTimeOffset = Math.min(...childTimeOffsets);
          const maxTimeOffset = Math.max(...childTimeOffsets);
          const newGroupDurationMs = maxTimeOffset - minTimeOffset;

          updatedElements = updatedElements.map((el) => {
            if (el.element_id === elementToDelete.parent_element_id) {
              return {
                ...el,
                duration_ms: newGroupDurationMs,
                offset_ms: minTimeOffset,
              };
            }
            return el;
          });
        }
      }

      // Normalize sequences to ensure consecutive numbering (close gaps)
      return normalizeSequences(updatedElements);

    case "BULK_REORDER":
      // Handle bulk reorder operations
      let bulkResult = [...elements];
      const bulkOp = operation as any;

      bulkOp.element_changes.forEach((change: any) => {
        const elementIndex = bulkResult.findIndex(
          (el) => el.element_id === change.element_id,
        );
        if (elementIndex !== -1) {
          const [element] = bulkResult.splice(elementIndex, 1);
          bulkResult.splice(change.new_index, 0, element);
        }
      });

      return bulkResult.map((el, index) => ({
        ...el,
        sequence: index + 1,
      }));

    case "ENABLE_AUTO_SORT":
      // Handle auto-sort enabling (applies element changes, preference handled separately)
      let autoSortResult = [...elements];
      const autoSortOp = operation as any;

      // Check if element_moves exists before trying to iterate
      if (autoSortOp.element_moves && Array.isArray(autoSortOp.element_moves)) {
        autoSortOp.element_moves.forEach((change: any) => {
          const elementIndex = autoSortResult.findIndex(
            (el) => el.element_id === change.element_id,
          );
          if (elementIndex !== -1) {
            const [element] = autoSortResult.splice(elementIndex, 1);
            autoSortResult.splice(change.new_index, 0, element);
          }
        });
      }

      return autoSortResult.map((el, index) => ({
        ...el,
        sequence: index + 1,
      }));

    case "DISABLE_AUTO_SORT":
      // Handle auto-sort disabling - need to "freeze" current order
      // This prevents any previous ENABLE_AUTO_SORT operations from re-sorting
      const disableOp = operation as any;
      if (disableOp.frozenOrder) {
        // Apply the frozen order to override any previous sorting
        const orderedElements = [...elements];
        disableOp.frozenOrder.forEach((elementId: string, index: number) => {
          const elementIndex = orderedElements.findIndex(
            (el) => el.element_id === elementId,
          );
          if (elementIndex !== -1) {
            const [element] = orderedElements.splice(elementIndex, 1);
            orderedElements.splice(index, 0, element);
          }
        });
        return orderedElements.map((el, index) => ({
          ...el,
          sequence: index + 1,
        }));
      }
      return elements;

    case "UPDATE_SCRIPT_INFO":
      // Script info operations don't affect elements, just track for undo/redo
      return elements;

    case "CREATE_GROUP":
      // Handle element grouping
      const createGroupOp = operation as any;
      const groupColor = createGroupOp.background_color || "#E2E8F0";
      const groupName = createGroupOp.group_name || "Untitled Group";
      const elementIds = createGroupOp.element_ids || [];

      // Count the types of elements being grouped
      const childElements = elements.filter((el) =>
        elementIds.includes(el.element_id),
      );
      const cueCount = childElements.filter(
        (el) => (el as any).element_type === "CUE",
      ).length;
      const noteCount = childElements.filter(
        (el) => (el as any).element_type === "NOTE",
      ).length;
      const groupCount = childElements.filter(
        (el) => (el as any).element_type === "GROUP",
      ).length;

      // Calculate group duration from first to last child element
      const childTimeOffsets = childElements.map((el) => el.offset_ms);
      const minTimeOffset = Math.min(...childTimeOffsets);
      const maxTimeOffset = Math.max(...childTimeOffsets);
      const groupDurationMs = maxTimeOffset - minTimeOffset;

      // Generate the notes field
      const noteParts: string[] = [];
      if (cueCount > 0)
        noteParts.push(`${cueCount} cue${cueCount !== 1 ? "s" : ""}`);
      if (noteCount > 0)
        noteParts.push(`${noteCount} note${noteCount !== 1 ? "s" : ""}`);
      if (groupCount > 0)
        noteParts.push(`${groupCount} group${groupCount !== 1 ? "s" : ""}`);

      const generatedNotes =
        noteParts.length > 0 ? `Includes ${noteParts.join(" and ")}` : "";

      // Create a deterministic group parent ID based on the operation ID to prevent duplicates during React StrictMode
      const operationId = operation.id || `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const groupParentId = `group-${operationId}`;
      const groupParent = {
        element_id: groupParentId,
        script_id: elements[0]?.script_id || "",
        element_type: "GROUP" as const,
        sequence: Math.min(
          ...elements
            .filter((el) => elementIds.includes(el.element_id))
            .map((el) => el.sequence),
        ),
        offset_ms: minTimeOffset,
        duration_ms: groupDurationMs,
        element_name: groupName,
        cue_notes: generatedNotes,
        custom_color: groupColor,
        priority: "NORMAL" as const,
        group_level: 0,
        is_collapsed: false,
        parent_element_id: undefined,
        created_by: "user",
        updated_by: "user",
        date_created: new Date().toISOString(),
        date_updated: new Date().toISOString(),
        isSafetyCritical: false,
      };

      // Update elements to be children of the group
      const groupedElements = elements.map((el) => {
        if (elementIds.includes(el.element_id)) {
          return {
            ...el,
            parent_element_id: groupParentId,
            group_level: 1,
          };
        }
        return el;
      });

      // Insert group parent at the correct position and update sequences
      const insertPosition = groupedElements.findIndex((el) =>
        elementIds.includes(el.element_id),
      );
      const finalElements = [...groupedElements];
      finalElements.splice(insertPosition, 0, groupParent);

      // Update sequences
      return finalElements.map((el, index) => ({
        ...el,
        sequence: index + 1,
      }));

    case "UPDATE_ELEMENT":
      const updateElementOp = operation as any;
      const targetElement = elements.find(
        (el) => el.element_id === operation.element_id,
      );
      const isUpdatingGroupParent =
        targetElement && (targetElement as any).element_type === "GROUP";
      const timeOffsetChange = updateElementOp.changes.offset_ms;

      // Handle group parent time offset changes specially
      if (isUpdatingGroupParent && timeOffsetChange) {
        const oldTime = timeOffsetChange.old_value;
        const newTime = timeOffsetChange.new_value;
        const timeDelta = newTime - oldTime;

        // Apply the same delta to all children
        return elements.map((el) => {
          if (el.element_id === operation.element_id) {
            // Update the group parent
            const updatedElement = { ...el };
            Object.entries(updateElementOp.changes).forEach(
              ([field, change]: [string, any]) => {
                (updatedElement as any)[field] = change.new_value;
              },
            );
            return updatedElement;
          } else if (el.parent_element_id === operation.element_id) {
            // Update child elements with same delta
            return {
              ...el,
              offset_ms: el.offset_ms + timeDelta,
            };
          }
          return el;
        });
      }

      // Regular element update (not a group parent)
      const elementUpdates = elements.map((el) => {
        if (el.element_id === operation.element_id) {
          const updatedElement = { ...el };
          // Apply all field changes from the operation
          Object.entries(updateElementOp.changes).forEach(
            ([field, change]: [string, any]) => {
              (updatedElement as any)[field] = change.new_value;
            },
          );
          return updatedElement;
        }
        return el;
      });

      // If offset_ms was changed and auto-sort would be enabled, reposition the element
      const timeOffsetChanged = updateElementOp.changes.offset_ms;
      if (timeOffsetChanged && updateElementOp.autoSort) {
        const elementIndex = elementUpdates.findIndex(
          (el) => el.element_id === operation.element_id,
        );
        if (elementIndex !== -1) {
          const element = elementUpdates[elementIndex];
          const otherElements = elementUpdates.filter(
            (_, i) => i !== elementIndex,
          );

          // Find correct insertion point for the updated element
          let insertIndex = otherElements.length;
          for (let i = 0; i < otherElements.length; i++) {
            if (otherElements[i].offset_ms > element.offset_ms) {
              insertIndex = i;
              break;
            }
          }

          // Reposition the element
          const repositionedElements = [...otherElements];
          repositionedElements.splice(insertIndex, 0, element);

          // Update sequences
          return repositionedElements.map((el, index) => ({
            ...el,
            sequence: index + 1,
          }));
        }
      }

      // Group durations will be recalculated at the end of all operations

      return elementUpdates;

    case "UPDATE_GROUP_WITH_PROPAGATION":
      const updateGroupOp = operation as any;
      const offsetDelta = updateGroupOp.offset_delta_ms || 0;

      return elements.map((el) => {
        if (el.element_id === operation.element_id) {
          // Update the group element itself
          const updatedGroup = { ...el };
          Object.entries(updateGroupOp.field_updates || {}).forEach(
            ([field, newValue]: [string, any]) => {
              (updatedGroup as any)[field] = newValue;
            },
          );
          return updatedGroup;
        } else if (
          offsetDelta !== 0 &&
          el.parent_element_id === operation.element_id &&
          el.group_level &&
          el.group_level > 0
        ) {
          // Update child elements with offset propagation
          return {
            ...el,
            offset_ms: (el.offset_ms || 0) + offsetDelta,
          };
        }
        return el;
      });

    case "TOGGLE_GROUP_COLLAPSE":
      const toggleOp = operation as any;
      return elements.map((el) =>
        el.element_id === operation.element_id
          ? { ...el, is_collapsed: toggleOp.target_collapsed_state }
          : el,
      );

    case "BATCH_COLLAPSE_GROUPS":
      const batchOp = operation as any;
      const targetGroupIds = batchOp.group_element_ids || [];
      return elements.map((el) =>
        targetGroupIds.includes(el.element_id)
          ? { ...el, is_collapsed: batchOp.target_collapsed_state }
          : el,
      );

    case "UNGROUP_ELEMENTS":
      const ungroupOp = operation as any;
      const groupElementId = ungroupOp.group_element_id;

      // Remove the group parent element and clear parent_element_id from children
      const ungroupedElements = elements
        .filter((el) => el.element_id !== groupElementId)
        .map((el) => {
          if (el.parent_element_id === groupElementId) {
            return {
              ...el,
              parent_element_id: undefined,
              group_level: 0,
            };
          }
          return el;
        });

      // Normalize sequences to close gaps left by the deleted group parent
      return normalizeSequences(ungroupedElements);

    default:
      return elements;
  }
}
