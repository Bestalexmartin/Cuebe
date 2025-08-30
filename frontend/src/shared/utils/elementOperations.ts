// frontend/src/shared/utils/elementOperations.ts
// Shared element operation logic - mirrors backend operations.py
import { debug } from '../../utils/logger';

interface ElementLike {
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
  debug('🔧 SHARED OPERATIONS: Applying operation:', operation.type, operation.element_id);
  
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
      debug('⚠️ SHARED OPERATIONS: Unhandled operation type:', operation.type);
      return elements; // Return unchanged
  }
}

function applyUpdateElement(elementsById: Map<string, ElementLike>, operation: any): ElementLike[] {
  const element = elementsById.get(operation.element_id);
  if (!element) {
    debug('❌ SHARED OPERATIONS: Element not found for UPDATE_ELEMENT:', operation.element_id);
    return Array.from(elementsById.values());
  }
  
  // Apply field changes
  Object.entries(operation.changes || {}).forEach(([field, changeData]: [string, any]) => {
    if (changeData && typeof changeData === 'object' && 'new_value' in changeData) {
      element[field] = changeData.new_value;
    } else {
      element[field] = changeData;
    }
  });
  
  debug('✏️ SHARED OPERATIONS: Updated element:', operation.element_id);
  return Array.from(elementsById.values());
}

function applyUpdateGroupWithPropagation(elementsById: Map<string, ElementLike>, operation: any): ElementLike[] {
  const element = elementsById.get(operation.element_id);
  if (!element) {
    debug('❌ SHARED OPERATIONS: Group element not found:', operation.element_id);
    return Array.from(elementsById.values());
  }
  
  // Apply field updates to the group element
  if (operation.field_updates) {
    Object.entries(operation.field_updates).forEach(([field, value]) => {
      element[field] = value;
    });
    debug('🎨 SHARED OPERATIONS: Applied group field updates:', operation.field_updates);
  }
  
  // Propagate offset changes to children
  if (operation.offset_delta_ms && operation.affected_children) {
    operation.affected_children.forEach((childId: string) => {
      const child = elementsById.get(childId);
      if (child) {
        child.offset_ms += operation.offset_delta_ms;
        debug('📍 SHARED OPERATIONS: Updated child offset:', childId, 'new offset:', child.offset_ms);
      }
    });
  }
  
  return Array.from(elementsById.values());
}

function applyCreateElement(elementsById: Map<string, ElementLike>, operation: any): ElementLike[] {
  if (!operation.element_data) {
    debug('❌ SHARED OPERATIONS: No element_data for CREATE_ELEMENT');
    return Array.from(elementsById.values());
  }
  
  elementsById.set(operation.element_data.element_id, operation.element_data);
  debug('➕ SHARED OPERATIONS: Created element:', operation.element_data.element_id);
  return Array.from(elementsById.values());
}

function applyDeleteElement(elementsById: Map<string, ElementLike>, operation: any): ElementLike[] {
  if (!elementsById.has(operation.element_id)) {
    debug('❌ SHARED OPERATIONS: Element not found for DELETE_ELEMENT:', operation.element_id);
    return Array.from(elementsById.values());
  }
  
  elementsById.delete(operation.element_id);
  debug('🗑️ SHARED OPERATIONS: Deleted element:', operation.element_id);
  return Array.from(elementsById.values());
}

function applyReorder(elementsById: Map<string, ElementLike>, _operation: any): ElementLike[] {
  // TODO: Implement reorder logic mirroring backend
  debug('🔄 SHARED OPERATIONS: REORDER not yet implemented');
  return Array.from(elementsById.values());
}

function applyBulkReorder(elementsById: Map<string, ElementLike>, _operation: any): ElementLike[] {
  // TODO: Implement bulk reorder logic mirroring backend  
  debug('🔄 SHARED OPERATIONS: BULK_REORDER not yet implemented');
  return Array.from(elementsById.values());
}
