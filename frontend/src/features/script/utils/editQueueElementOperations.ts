import {
  BatchCollapseGroupsOperation,
  EditOperation,
  ToggleGroupCollapseOperation,
} from "../types/editQueue";
import { ScriptElement } from "../types/scriptElements";
import { generateGroupSummary } from "./groupUtils";

export function normalizeSequences(elements: ScriptElement[]): ScriptElement[] {
  const sortedElements = [...elements].sort((a, b) => a.sequence - b.sequence);

  return sortedElements.map((element, index) => ({
    ...element,
    sequence: index + 1,
  }));
}

export function recalculateGroupTimings(
  elements: ScriptElement[],
): ScriptElement[] {
  return elements.map((element) => {
    if (element.element_type !== "GROUP") {
      return { ...element };
    }

    const childElements = elements.filter(
      (candidate) => candidate.parent_element_id === element.element_id,
    );

    if (childElements.length === 0) {
      return { ...element };
    }

    const childTimeOffsets = childElements.map((candidate) => candidate.offset_ms);
    const minTimeOffset = Math.min(...childTimeOffsets);
    const maxTimeOffset = Math.max(...childTimeOffsets);

    return {
      ...element,
      offset_ms: minTimeOffset,
      duration_ms: maxTimeOffset - minTimeOffset,
    };
  });
}

export function getVisibleScriptElements(
  elements: ScriptElement[],
): ScriptElement[] {
  return elements.filter((element) => {
    if (!element.parent_element_id) {
      return true;
    }

    const parent = elements.find(
      (candidate) => candidate.element_id === element.parent_element_id,
    );

    return !parent || !parent.is_collapsed;
  });
}

export function sortInitialScriptElements(
  elements: ScriptElement[],
  autoSortCues?: boolean,
): ScriptElement[] {
  return [...elements].sort((a, b) => {
    if (!autoSortCues) {
      return a.sequence - b.sequence;
    }

    if (a.offset_ms !== b.offset_ms) {
      return a.offset_ms - b.offset_ms;
    }

    if (a.element_id === b.parent_element_id) return -1;
    if (b.element_id === a.parent_element_id) return 1;

    return a.sequence - b.sequence;
  });
}

export function applyOperationToElements(
  elements: ScriptElement[],
  operation: EditOperation,
): ScriptElement[] {
  switch (operation.type) {
    case "REORDER":
      return applyReorderOperation(elements, operation);
    case "UPDATE_FIELD":
      return applyUpdateFieldOperation(elements, operation);
    case "UPDATE_TIME_OFFSET":
      return applyUpdateTimeOffsetOperation(elements, operation);
    case "CREATE_ELEMENT":
      return applyCreateElementOperation(elements, operation);
    case "DELETE_ELEMENT":
      return applyDeleteElementOperation(elements, operation);
    case "BULK_REORDER":
      return applyIndexedReorderOperation(
        elements,
        (operation as any).element_changes || [],
      );
    case "ENABLE_AUTO_SORT":
      return applyIndexedReorderOperation(
        elements,
        (operation as any).element_moves || [],
      );
    case "DISABLE_AUTO_SORT":
      return applyDisableAutoSortOperation(elements, operation);
    case "UPDATE_SCRIPT_INFO":
      return elements;
    case "CREATE_GROUP":
      return applyCreateGroupOperation(elements, operation);
    case "UPDATE_ELEMENT":
      return applyUpdateElementOperation(elements, operation);
    case "UPDATE_GROUP_WITH_PROPAGATION":
      return applyUpdateGroupWithPropagationOperation(elements, operation);
    case "TOGGLE_GROUP_COLLAPSE":
      return applyToggleGroupCollapseOperation(elements, operation);
    case "BATCH_COLLAPSE_GROUPS":
      return applyBatchCollapseGroupsOperation(elements, operation);
    case "UNGROUP_ELEMENTS":
      return applyUngroupElementsOperation(elements, operation);
    default:
      return elements;
  }
}

function applyReorderOperation(
  elements: ScriptElement[],
  operation: EditOperation,
): ScriptElement[] {
  const reorderOp = operation as any;
  const elementToMove = elements.find(
    (element) => element.element_id === operation.element_id,
  );

  if (!elementToMove) {
    return elements;
  }

  if (elementToMove.element_type === "GROUP") {
    return applyGroupParentReorder(elements, elementToMove, reorderOp);
  }

  const oldSeq = reorderOp.old_sequence;
  const newSeq = reorderOp.new_sequence;

  let updatedElements = elements.map((element) => {
    if (element.element_id === operation.element_id) {
      return { ...element, sequence: newSeq };
    }

    if (oldSeq < newSeq && element.sequence > oldSeq && element.sequence <= newSeq) {
      return { ...element, sequence: element.sequence - 1 };
    }

    if (oldSeq > newSeq && element.sequence >= newSeq && element.sequence < oldSeq) {
      return { ...element, sequence: element.sequence + 1 };
    }

    return { ...element };
  });

  const sortedElements = [...updatedElements].sort((a, b) => a.sequence - b.sequence);
  const movedElement = sortedElements.find(
    (element) => element.element_id === operation.element_id,
  );

  if (!movedElement) {
    return updatedElements;
  }

  const nonGroupElements = sortedElements.filter(
    (element) => element.element_type !== "GROUP",
  );
  const movedNonGroupIndex = nonGroupElements.findIndex(
    (element) => element.element_id === operation.element_id,
  );
  const beforeElement =
    movedNonGroupIndex > 0 ? nonGroupElements[movedNonGroupIndex - 1] : null;
  const afterElement =
    movedNonGroupIndex < nonGroupElements.length - 1
      ? nonGroupElements[movedNonGroupIndex + 1]
      : null;

  let updatedMovedElement = { ...movedElement };

  if ((operation as any).auto_sort_enabled) {
    if (
      beforeElement &&
      afterElement &&
      beforeElement.parent_element_id &&
      afterElement.parent_element_id &&
      beforeElement.parent_element_id === afterElement.parent_element_id
    ) {
      updatedMovedElement = {
        ...updatedMovedElement,
        parent_element_id: beforeElement.parent_element_id,
        group_level: beforeElement.group_level || 1,
      };
    } else if (movedElement.parent_element_id) {
      updatedMovedElement = {
        ...updatedMovedElement,
        parent_element_id: undefined,
        group_level: 0,
      };
    }
  }

  updatedElements = sortedElements.map((element) =>
    element.element_id === operation.element_id ? updatedMovedElement : element,
  );

  return updatedElements;
}

function applyGroupParentReorder(
  elements: ScriptElement[],
  elementToMove: ScriptElement,
  reorderOp: any,
): ScriptElement[] {
  const oldSeq = reorderOp.old_sequence;
  const newSeq = reorderOp.new_sequence;
  const groupChildren = elements.filter(
    (element) => element.parent_element_id === elementToMove.element_id,
  );
  const groupSize = groupChildren.length + 1;

  let updatedElements = elements.map((element) => {
    if (
      element.element_id === elementToMove.element_id ||
      element.parent_element_id === elementToMove.element_id
    ) {
      return { ...element, sequence: 9999 + element.sequence };
    }

    if (element.sequence > oldSeq + groupSize - 1) {
      return { ...element, sequence: element.sequence - groupSize };
    }

    return element;
  });

  updatedElements = updatedElements.map((element) => {
    if (element.element_id === elementToMove.element_id) {
      return { ...element, sequence: newSeq };
    }

    if (element.parent_element_id === elementToMove.element_id) {
      const childIndex = groupChildren.findIndex(
        (child) => child.element_id === element.element_id,
      );

      return { ...element, sequence: newSeq + childIndex + 1 };
    }

    if (element.sequence >= newSeq && element.sequence < 9999) {
      return { ...element, sequence: element.sequence + groupSize };
    }

    return element;
  });

  return [...updatedElements].sort((a, b) => a.sequence - b.sequence);
}

function applyUpdateFieldOperation(
  elements: ScriptElement[],
  operation: EditOperation,
): ScriptElement[] {
  const updateOp = operation as any;

  return elements.map((element) =>
    element.element_id === operation.element_id
      ? { ...element, [updateOp.field]: updateOp.new_value }
      : element,
  );
}

function applyUpdateTimeOffsetOperation(
  elements: ScriptElement[],
  operation: EditOperation,
): ScriptElement[] {
  const timeOp = operation as any;

  return elements.map((element) =>
    element.element_id === operation.element_id
      ? { ...element, offset_ms: timeOp.new_offset_ms }
      : element,
  );
}

function applyCreateElementOperation(
  elements: ScriptElement[],
  operation: EditOperation,
): ScriptElement[] {
  const createOp = operation as any;
  let newElements: ScriptElement[];

  if (createOp.insert_index !== undefined) {
    newElements = [...elements];
    newElements.splice(createOp.insert_index, 0, createOp.element_data);
  } else {
    newElements = [...elements, createOp.element_data];
  }

  const newElement = createOp.element_data;
  if (newElement.parent_element_id && (newElement.group_level || 0) > 0) {
    const groupChildren = newElements.filter(
      (element) =>
        element.parent_element_id === newElement.parent_element_id &&
        (element.group_level || 0) > 0,
    );

    if (groupChildren.length > 0) {
      const childTimeOffsets = groupChildren.map((element) => element.offset_ms);
      const minTimeOffset = Math.min(...childTimeOffsets);
      const maxTimeOffset = Math.max(...childTimeOffsets);

      newElements = newElements.map((element) => {
        if (element.element_id !== newElement.parent_element_id) {
          return element;
        }

        return {
          ...element,
          duration_ms: maxTimeOffset - minTimeOffset,
          offset_ms: minTimeOffset,
        };
      });
    }
  }

  return newElements.map((element, index) => ({
    ...element,
    sequence: index + 1,
  }));
}

function applyDeleteElementOperation(
  elements: ScriptElement[],
  operation: EditOperation,
): ScriptElement[] {
  const elementToDelete = elements.find(
    (element) => element.element_id === operation.element_id,
  );

  if (!elementToDelete) {
    return elements;
  }

  const isDeletingGroupParent = elementToDelete.element_type === "GROUP";
  const isDeletingGroupChild = (elementToDelete.group_level || 0) > 0;

  let updatedElements = elements.filter(
    (element) => element.element_id !== operation.element_id,
  );

  if (isDeletingGroupParent) {
    updatedElements = updatedElements.map((element) => {
      if (element.parent_element_id !== operation.element_id) {
        return element;
      }

      return {
        ...element,
        parent_element_id: undefined,
        group_level: 0,
      };
    });
  } else if (isDeletingGroupChild && elementToDelete.parent_element_id) {
    const remainingChildren = updatedElements.filter(
      (element) =>
        element.parent_element_id === elementToDelete.parent_element_id &&
        (element.group_level || 0) > 0,
    );

    if (remainingChildren.length === 0) {
      updatedElements = updatedElements.filter(
        (element) => element.element_id !== elementToDelete.parent_element_id,
      );
    } else if (remainingChildren.length === 1) {
      updatedElements = updatedElements
        .map((element) => {
          if (element.element_id !== remainingChildren[0].element_id) {
            return element;
          }

          return {
            ...element,
            parent_element_id: undefined,
            group_level: 0,
          };
        })
        .filter(
          (element) => element.element_id !== elementToDelete.parent_element_id,
        );
    } else {
      const childTimeOffsets = remainingChildren.map((element) => element.offset_ms);
      const minTimeOffset = Math.min(...childTimeOffsets);
      const maxTimeOffset = Math.max(...childTimeOffsets);

      updatedElements = updatedElements.map((element) => {
        if (element.element_id !== elementToDelete.parent_element_id) {
          return element;
        }

        return {
          ...element,
          duration_ms: maxTimeOffset - minTimeOffset,
          offset_ms: minTimeOffset,
        };
      });
    }
  }

  return normalizeSequences(updatedElements);
}

function applyIndexedReorderOperation(
  elements: ScriptElement[],
  changes: Array<{ element_id: string; new_index?: number }>,
): ScriptElement[] {
  const reorderedElements = [...elements];

  changes.forEach((change) => {
    if (change.new_index === undefined) {
      return;
    }

    const elementIndex = reorderedElements.findIndex(
      (element) => element.element_id === change.element_id,
    );

    if (elementIndex === -1) {
      return;
    }

    const [element] = reorderedElements.splice(elementIndex, 1);
    reorderedElements.splice(change.new_index, 0, element);
  });

  return reorderedElements.map((element, index) => ({
    ...element,
    sequence: index + 1,
  }));
}

function applyDisableAutoSortOperation(
  elements: ScriptElement[],
  operation: EditOperation,
): ScriptElement[] {
  const disableOp = operation as any;
  if (!disableOp.frozenOrder) {
    return elements;
  }

  const orderedElements = [...elements];
  disableOp.frozenOrder.forEach((elementId: string, index: number) => {
    const elementIndex = orderedElements.findIndex(
      (element) => element.element_id === elementId,
    );

    if (elementIndex === -1) {
      return;
    }

    const [element] = orderedElements.splice(elementIndex, 1);
    orderedElements.splice(index, 0, element);
  });

  return orderedElements.map((element, index) => ({
    ...element,
    sequence: index + 1,
  }));
}

function applyCreateGroupOperation(
  elements: ScriptElement[],
  operation: EditOperation,
): ScriptElement[] {
  const createGroupOp = operation as any;
  const groupColor = createGroupOp.custom_color || "#E2E8F0";
  const groupName = createGroupOp.group_name || "Untitled Group";
  const elementIds = createGroupOp.element_ids || [];
  const childElements = elements.filter((element) =>
    elementIds.includes(element.element_id),
  );
  const childTimeOffsets = childElements.map((element) => element.offset_ms);
  const minTimeOffset = Math.min(...childTimeOffsets);
  const maxTimeOffset = Math.max(...childTimeOffsets);
  const operationId =
    operation.id || `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const groupParentId = `group-${operationId}`;

  const groupParent: ScriptElement = {
    element_id: groupParentId,
    script_id: elements[0]?.script_id || "",
    element_type: "GROUP",
    sequence: Math.min(
      ...elements
        .filter((element) => elementIds.includes(element.element_id))
        .map((element) => element.sequence),
    ),
    offset_ms: minTimeOffset,
    duration_ms: maxTimeOffset - minTimeOffset,
    element_name: groupName,
    cue_notes: generateGroupSummary(childElements),
    custom_color: groupColor,
    priority: "NORMAL",
    group_level: 0,
    is_collapsed: false,
    parent_element_id: undefined,
    created_by: "user",
    updated_by: "user",
    date_created: new Date().toISOString(),
    date_updated: new Date().toISOString(),
    isSafetyCritical: false,
  };

  const groupedElements = elements.map((element) => {
    if (!elementIds.includes(element.element_id)) {
      return element;
    }

    return {
      ...element,
      parent_element_id: groupParentId,
      group_level: 1,
    };
  });

  const insertPosition = groupedElements.findIndex((element) =>
    elementIds.includes(element.element_id),
  );
  const finalElements = [...groupedElements];
  finalElements.splice(insertPosition, 0, groupParent);

  return finalElements.map((element, index) => ({
    ...element,
    sequence: index + 1,
  }));
}

function applyUpdateElementOperation(
  elements: ScriptElement[],
  operation: EditOperation,
): ScriptElement[] {
  const updateElementOp = operation as any;
  const targetElement = elements.find(
    (element) => element.element_id === operation.element_id,
  );
  const isUpdatingGroupParent = targetElement?.element_type === "GROUP";
  const timeOffsetChange = updateElementOp.changes.offset_ms;

  if (isUpdatingGroupParent && timeOffsetChange) {
    const timeDelta = timeOffsetChange.new_value - timeOffsetChange.old_value;

    return elements.map((element) => {
      if (element.element_id === operation.element_id) {
        const updatedElement = { ...element };
        Object.entries(updateElementOp.changes).forEach(
          ([field, change]: [string, any]) => {
            (updatedElement as any)[field] = change.new_value;
          },
        );
        return updatedElement;
      }

      if (element.parent_element_id === operation.element_id) {
        return {
          ...element,
          offset_ms: element.offset_ms + timeDelta,
        };
      }

      return element;
    });
  }

  const elementUpdates = elements.map((element) => {
    if (element.element_id !== operation.element_id) {
      return element;
    }

    const updatedElement = { ...element };
    Object.entries(updateElementOp.changes).forEach(
      ([field, change]: [string, any]) => {
        (updatedElement as any)[field] = change.new_value;
      },
    );
    return updatedElement;
  });

  if (timeOffsetChange && updateElementOp.autoSort) {
    const elementIndex = elementUpdates.findIndex(
      (element) => element.element_id === operation.element_id,
    );

    if (elementIndex !== -1) {
      const element = elementUpdates[elementIndex];
      const otherElements = elementUpdates.filter((_, index) => index !== elementIndex);
      let insertIndex = otherElements.length;

      for (let index = 0; index < otherElements.length; index++) {
        if (otherElements[index].offset_ms > element.offset_ms) {
          insertIndex = index;
          break;
        }
      }

      const repositionedElements = [...otherElements];
      repositionedElements.splice(insertIndex, 0, element);

      return repositionedElements.map((candidate, index) => ({
        ...candidate,
        sequence: index + 1,
      }));
    }
  }

  return elementUpdates;
}

function applyUpdateGroupWithPropagationOperation(
  elements: ScriptElement[],
  operation: EditOperation,
): ScriptElement[] {
  const updateGroupOp = operation as any;
  const offsetDelta = updateGroupOp.offset_delta_ms || 0;

  return elements.map((element) => {
    if (element.element_id === operation.element_id) {
      const updatedGroup = { ...element };
      Object.entries(updateGroupOp.field_updates || {}).forEach(
        ([field, newValue]: [string, any]) => {
          (updatedGroup as any)[field] = newValue;
        },
      );
      return updatedGroup;
    }

    if (
      offsetDelta !== 0 &&
      element.parent_element_id === operation.element_id &&
      (element.group_level || 0) > 0
    ) {
      return {
        ...element,
        offset_ms: (element.offset_ms || 0) + offsetDelta,
      };
    }

    return element;
  });
}

function applyToggleGroupCollapseOperation(
  elements: ScriptElement[],
  operation: EditOperation,
): ScriptElement[] {
  const toggleOp = operation as Omit<
    ToggleGroupCollapseOperation,
    "id" | "timestamp" | "description"
  >;

  return elements.map((element) =>
    element.element_id === operation.element_id
      ? { ...element, is_collapsed: toggleOp.target_collapsed_state }
      : element,
  );
}

function applyBatchCollapseGroupsOperation(
  elements: ScriptElement[],
  operation: EditOperation,
): ScriptElement[] {
  const batchOp = operation as Omit<
    BatchCollapseGroupsOperation,
    "id" | "timestamp" | "description"
  >;
  const targetGroupIds = batchOp.group_element_ids || [];

  return elements.map((element) =>
    targetGroupIds.includes(element.element_id)
      ? { ...element, is_collapsed: batchOp.target_collapsed_state }
      : element,
  );
}

function applyUngroupElementsOperation(
  elements: ScriptElement[],
  operation: EditOperation,
): ScriptElement[] {
  const groupElementId = (operation as any).group_element_id;

  const ungroupedElements = elements
    .filter((element) => element.element_id !== groupElementId)
    .map((element) => {
      if (element.parent_element_id !== groupElementId) {
        return element;
      }

      return {
        ...element,
        parent_element_id: undefined,
        group_level: 0,
      };
    });

  return normalizeSequences(ungroupedElements);
}
