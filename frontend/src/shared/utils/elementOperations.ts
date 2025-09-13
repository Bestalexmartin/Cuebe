// frontend/src/shared/utils/elementOperations.ts
// Shared element operation logic - mirrors backend operations.py
 

export interface ElementLike {
  element_id: string;
  sequence: number;
  offset_ms: number;
  element_type: string;
  parent_element_id?: string | null;
  [key: string]: any;
}

export function applyOperationToElements(
  elements: ElementLike[], 
  operation: any
): ElementLike[] {
  // removed debug log
  
  // Create a working copy
  const elementsById = new Map(elements.map(el => [el.element_id, { ...el }]));
  
  switch (operation.type) {
    case 'UPDATE_ELEMENT':
      return applyUpdateElement(elementsById, operation);
    case 'UPDATE_GROUP_WITH_PROPAGATION':
      return applyUpdateGroupWithPropagation(elementsById, operation);
    case 'CREATE_ELEMENT':
      return applyCreateElement(elementsById, operation);
    case 'DELETE_ELEMENT':
      return applyDeleteElement(elementsById, operation);
    case 'REORDER':
      return applyReorder(elementsById, operation);
    case 'BULK_REORDER':
      return applyBulkReorder(elementsById, operation);
    default:
      return elements; // Return unchanged
  }
}

function applyUpdateElement(elementsById: Map<string, ElementLike>, operation: any): ElementLike[] {
  const element = elementsById.get(operation.element_id);
  if (!element) return Array.from(elementsById.values());
  
  // Apply field changes
  Object.entries(operation.changes || {}).forEach(([field, changeData]: [string, any]) => {
    if (changeData && typeof changeData === 'object' && 'new_value' in changeData) {
      element[field] = changeData.new_value;
    } else {
      element[field] = changeData;
    }
  });
  
  return Array.from(elementsById.values());
}

function applyUpdateGroupWithPropagation(elementsById: Map<string, ElementLike>, operation: any): ElementLike[] {
  const element = elementsById.get(operation.element_id);
  if (!element) return Array.from(elementsById.values());
  
  // Apply field updates to the group element
  if (operation.field_updates) {
    Object.entries(operation.field_updates).forEach(([field, value]) => {
      element[field] = value;
    });
    
  }
  
  // Propagate offset changes to children
  if (operation.offset_delta_ms && operation.affected_children) {
    operation.affected_children.forEach((childId: string) => {
      const child = elementsById.get(childId);
      if (child) {
        child.offset_ms += operation.offset_delta_ms;
        
      }
    });
  }
  
  return Array.from(elementsById.values());
}

function applyCreateElement(elementsById: Map<string, ElementLike>, operation: any): ElementLike[] {
  if (!operation.element_data) return Array.from(elementsById.values());
  
  elementsById.set(operation.element_data.element_id, operation.element_data);
  return Array.from(elementsById.values());
}

function applyDeleteElement(elementsById: Map<string, ElementLike>, operation: any): ElementLike[] {
  if (!elementsById.has(operation.element_id)) return Array.from(elementsById.values());
  
  elementsById.delete(operation.element_id);
  return Array.from(elementsById.values());
}

function applyReorder(elementsById: Map<string, ElementLike>, _operation: any): ElementLike[] {
  return Array.from(elementsById.values());
}

function applyBulkReorder(elementsById: Map<string, ElementLike>, _operation: any): ElementLike[] {
  return Array.from(elementsById.values());
}
