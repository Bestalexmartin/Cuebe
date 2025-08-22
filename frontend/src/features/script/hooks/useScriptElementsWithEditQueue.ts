// frontend/src/features/script/hooks/useScriptElementsWithEditQueue.ts

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ScriptElement } from '../types/scriptElements';
import { EditOperation, ToggleGroupCollapseOperation, BatchCollapseGroupsOperation } from '../types/editQueue';
import { useEditQueue } from './useEditQueue';

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
    applyLocalChange: (operation: Omit<EditOperation, 'id' | 'timestamp' | 'description'>) => void;
    
    // Save operations
    saveChanges: () => Promise<boolean>;
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
    
    // Revert
    revertToPoint: (targetIndex: number) => void;
}

interface UseScriptElementsOptions {
    element_type?: string;
    departmentId?: string;
    skip?: number;
    limit?: number;
    onAfterSave?: () => Promise<void>;
}

export const useScriptElementsWithEditQueue = (
    scriptId: string | undefined,
    options: UseScriptElementsOptions = {}
): UseScriptElementsWithEditQueueReturn => {
    const [serverElements, setServerElements] = useState<ScriptElement[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { getToken } = useAuth();
    
    const editQueue = useEditQueue();
    
    // Use a ref to store the latest editQueue to create stable callbacks
    const editQueueRef = useRef(editQueue);
    editQueueRef.current = editQueue;
    
    // Extract only the properties we need to avoid depending on the entire object
    const { operations, hasUnsavedChanges, canUndo, canRedo } = editQueue;
    
    
    // Keep a ref to the last computed elements to prevent flicker during save
    const lastComputedElementsRef = useRef<ScriptElement[]>([]);
    
    // Apply edit operations to server elements to get current view
    const { elements, allElements } = useMemo(() => {
        // If we're saving, return the last computed state to prevent flicker
        if (isSaving && lastComputedElementsRef.current.length > 0) {
            return {
                elements: lastComputedElementsRef.current,
                allElements: lastComputedElementsRef.current // This isn't ideal but prevents crashes during save
            };
        }
        
        let currentElements = [...serverElements];
        
        // Apply each operation in sequence to build current state
        operations.forEach(operation => {
            currentElements = applyOperationToElements(currentElements, operation);
        });
        
        // After all operations are applied, recalculate group durations
        // This ensures durations are accurate after any reordering, time changes, or group membership changes
        currentElements = recalculateGroupDurations(currentElements);
        
        // Filter out collapsed child elements for display
        const visibleElements = currentElements.filter(element => {
            // Always show parent elements (group_level === 0 or no parent)
            if (!element.parent_element_id) {
                return true;
            }
            
            // Find the parent element
            const parent = currentElements.find(el => el.element_id === element.parent_element_id);
            
            // If parent doesn't exist or parent is not collapsed, show this element
            return !parent || !parent.is_collapsed;
        });
        
        // Store the computed elements for potential use during save
        lastComputedElementsRef.current = visibleElements;
        
        return {
            elements: visibleElements,
            allElements: currentElements // Include all elements for group summary calculations
        };
    }, [serverElements, operations, isSaving]);
    
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
                throw new Error('Authentication token not available');
            }

            // Build query parameters
            const params = new URLSearchParams();
            if (options.element_type) params.append('element_type', options.element_type);
            if (options.departmentId) params.append('department_id', options.departmentId);
            if (options.skip !== undefined) params.append('skip', options.skip.toString());
            if (options.limit !== undefined) params.append('limit', options.limit.toString());

            const queryString = params.toString();
            const url = `/api/scripts/${scriptId}/elements${queryString ? '?' + queryString : ''}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch script elements: ${response.status}`);
            }

            const data = await response.json();
            
            // Sort elements with group parents before their children when at same time offset
            const sortedElements = data.sort((a: ScriptElement, b: ScriptElement) => {
                // First sort by time offset
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
            });
            
            setServerElements(sortedElements);
        } catch (err) {
            console.error('Error fetching script elements:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch script elements');
            setServerElements([]);
        } finally {
            setIsLoading(false);
        }
    }, [scriptId, getToken, JSON.stringify(options)]);
    
    const applyLocalChange = useCallback((operation: Omit<EditOperation, 'id' | 'timestamp' | 'description'>) => {
        editQueue.addOperation(operation);
    }, [editQueue.addOperation]);
    
    const saveChanges = useCallback(async (): Promise<boolean> => {
        if (!scriptId || editQueueRef.current.operations.length === 0) {
            return true;
        }
        
        
        try {
            // Set saving flag to prevent flicker
            setIsSaving(true);
            const token = await getToken();
            if (!token) {
                throw new Error('Authentication token not available');
            }
            
            // Send batch of operations to server
            const response = await fetch(`/api/scripts/${scriptId}/elements/batch-update`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operations: editQueueRef.current.operations
                })
            });
            
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
                        errorData = 'No error details available';
                    }
                } catch {
                    errorData = 'Failed to read error response';
                }
                console.error('Backend error response:', response.status, errorData);
                throw new Error(`Failed to save changes: ${response.status} - ${JSON.stringify(errorData)}`);
            }
            
            // Clear the edit queue and fetch fresh data
            editQueueRef.current.clearQueue();
            await fetchElements();
            
            // Refetch script data if callback provided
            if (options.onAfterSave) {
                await options.onAfterSave();
            }
            
            // Clear saving flag to allow normal rendering
            setIsSaving(false);
            
            return true;
        } catch (err) {
            console.error('Error saving changes:', err);
            setError(err instanceof Error ? err.message : 'Failed to save changes');
            setIsSaving(false); // Clear saving flag on error too
            return false;
        }
    }, [scriptId, getToken, fetchElements]);
    
    const discardChanges = useCallback(() => {
        editQueueRef.current.clearQueue();
    }, []);
    
    const undoOperation = useCallback(() => {
        editQueueRef.current.undo();
    }, []);
    
    const redoOperation = useCallback(() => {
        editQueueRef.current.redo();
    }, []);
    
    const toggleGroupCollapse = useCallback((elementId: string) => {
        // Find the current element to determine what state we're toggling TO
        const currentElement = allElements.find(el => el.element_id === elementId);
        const currentlyCollapsed = currentElement?.is_collapsed || false;
        const targetState = !currentlyCollapsed;
        
        applyLocalChange({
            type: 'TOGGLE_GROUP_COLLAPSE',
            element_id: elementId,
            target_collapsed_state: targetState
        } as Omit<ToggleGroupCollapseOperation, 'id' | 'timestamp' | 'description'>);
    }, [applyLocalChange, allElements]);

    const expandAllGroups = useCallback(() => {
        // Find all group elements that are currently collapsed
        const collapsedGroups = allElements.filter(el => 
            el.element_type === 'GROUP' && 
            el.is_collapsed === true
        );
        
        if (collapsedGroups.length === 0) return;
        
        applyLocalChange({
            type: 'BATCH_COLLAPSE_GROUPS',
            element_id: 'batch_expand_all',
            group_element_ids: collapsedGroups.map(el => el.element_id),
            target_collapsed_state: false
        } as Omit<BatchCollapseGroupsOperation, 'id' | 'timestamp' | 'description'>);
    }, [applyLocalChange, allElements]);

    const collapseAllGroups = useCallback(() => {
        // Find all group elements that are currently expanded
        const expandedGroups = allElements.filter(el => 
            el.element_type === 'GROUP' && 
            (el.is_collapsed === false || el.is_collapsed === undefined)
        );
        
        if (expandedGroups.length === 0) return;
        
        applyLocalChange({
            type: 'BATCH_COLLAPSE_GROUPS',
            element_id: 'batch_collapse_all',
            group_element_ids: expandedGroups.map(el => el.element_id),
            target_collapsed_state: true
        } as Omit<BatchCollapseGroupsOperation, 'id' | 'timestamp' | 'description'>);
    }, [applyLocalChange, allElements]);
    
    useEffect(() => {
        fetchElements();
    }, [fetchElements]);
    
    return useMemo(() => ({
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
        
        // Revert
        revertToPoint: editQueueRef.current.revertToPoint
    }), [
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
        collapseAllGroups
    ]);
};

/**
 * Recalculate durations for all group elements based on their children
 */
function recalculateGroupDurations(elements: ScriptElement[]): ScriptElement[] {
    return elements.map(element => {
        if ((element as any).element_type === 'GROUP') {
            // Find all child elements of this group
            const childElements = elements.filter(el => 
                el.parent_element_id === element.element_id
            );
            
            if (childElements.length > 0) {
                // Calculate new duration from child time offsets
                const childTimeOffsets = childElements.map(el => el.offset_ms);
                const minTimeOffset = Math.min(...childTimeOffsets);
                const maxTimeOffset = Math.max(...childTimeOffsets);
                const groupDurationMs = maxTimeOffset - minTimeOffset;
                return {
                    ...element,
                    duration_ms: groupDurationMs
                };
            }
        }
        return element;
    });
}

/**
 * Apply a single edit operation to an array of elements
 */
function applyOperationToElements(elements: ScriptElement[], operation: EditOperation): ScriptElement[] {
    switch (operation.type) {
        case 'REORDER':
            const reorderOp = operation as any;
            const elementToMove = elements.find(el => el.element_id === operation.element_id);
            
            if (!elementToMove) {
                return elements;
            }
            
            // Check if we're moving a group parent - if so, move the entire group
            const isGroupParent = (elementToMove as any).element_type === 'GROUP';
            
            if (isGroupParent) {
                // Find all children of this group
                const groupChildren = elements.filter(el => 
                    el.parent_element_id === elementToMove.element_id
                );
                
                // Update parent sequence and all children sequences to be consecutive after parent
                const updatedElements = elements.map(el => {
                    if (el.element_id === operation.element_id) {
                        // Update the group parent
                        return { ...el, sequence: reorderOp.new_sequence };
                    } else if (el.parent_element_id === elementToMove.element_id) {
                        // Update child elements to be consecutive after parent
                        const childIndex = groupChildren.findIndex(child => child.element_id === el.element_id);
                        return { ...el, sequence: reorderOp.new_sequence + childIndex + 1 };
                    } else {
                        // Leave other elements unchanged
                        return el;
                    }
                });
                
                // Sort all elements by sequence to get the new order
                return [...updatedElements].sort((a, b) => a.sequence - b.sequence);
            } else {
                // Regular element move (not a group parent)
                // Update the element's sequence
                const updatedElements = elements.map(el => 
                    el.element_id === operation.element_id 
                        ? { ...el, sequence: reorderOp.new_sequence }
                        : el
                );
                
                // Sort all elements by sequence to get the new order
                return [...updatedElements].sort((a, b) => a.sequence - b.sequence);
            }
            
        case 'UPDATE_FIELD':
            const updateOp = operation as any;
            return elements.map(el => 
                el.element_id === operation.element_id 
                    ? { ...el, [updateOp.field]: updateOp.new_value }
                    : el
            );
            
        case 'UPDATE_TIME_OFFSET':
            const timeOp = operation as any;
            return elements.map(el => 
                el.element_id === operation.element_id 
                    ? { ...el, offset_ms: timeOp.new_offset_ms }
                    : el
            );
            
        case 'CREATE_ELEMENT':
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
            if (newElement.parent_element_id && newElement.group_level && newElement.group_level > 0) {
                // Find all children of this group (including the new one)
                const groupChildren = newElements.filter(el => 
                    el.parent_element_id === newElement.parent_element_id &&
                    el.group_level && el.group_level > 0
                );
                
                if (groupChildren.length > 0) {
                    // Recalculate group duration from first to last child
                    const childTimeOffsets = groupChildren.map(el => el.offset_ms);
                    const minTimeOffset = Math.min(...childTimeOffsets);
                    const maxTimeOffset = Math.max(...childTimeOffsets);
                    const groupDurationMs = maxTimeOffset - minTimeOffset;
                    
                    // Update the group parent
                    newElements = newElements.map(el => {
                        if (el.element_id === newElement.parent_element_id) {
                            return {
                                ...el,
                                duration_ms: groupDurationMs,
                                offset_ms: minTimeOffset
                            };
                        }
                        return el;
                    });
                }
            }
            
            // Update sequences for all elements
            return newElements.map((el, index) => ({
                ...el,
                sequence: index + 1
            }));
            
        case 'DELETE_ELEMENT':
            const elementToDelete = elements.find(el => el.element_id === operation.element_id);
            if (!elementToDelete) {
                return elements;
            }

            // Check if we're deleting a group parent or child
            const isDeletingGroupParent = (elementToDelete as any).element_type === 'GROUP';
            const isDeletingGroupChild = elementToDelete.group_level && elementToDelete.group_level > 0;

            let updatedElements = elements.filter(el => el.element_id !== operation.element_id);

            if (isDeletingGroupParent) {
                // Deleting a group parent - ungroup all children
                updatedElements = updatedElements.map(el => {
                    if (el.parent_element_id === operation.element_id) {
                        return {
                            ...el,
                            parent_element_id: undefined,
                            group_level: 0
                        };
                    }
                    return el;
                });
            } else if (isDeletingGroupChild && elementToDelete.parent_element_id) {
                // Deleting a group child - check if group becomes empty
                const remainingChildren = updatedElements.filter(el => 
                    el.parent_element_id === elementToDelete.parent_element_id &&
                    el.group_level && el.group_level > 0
                );

                if (remainingChildren.length === 0) {
                    // No children left, remove the group parent
                    updatedElements = updatedElements.filter(el => 
                        el.element_id !== elementToDelete.parent_element_id
                    );
                } else if (remainingChildren.length === 1) {
                    // Only one child left, ungroup it and remove the group parent
                    updatedElements = updatedElements.map(el => {
                        if (el.element_id === remainingChildren[0].element_id) {
                            return {
                                ...el,
                                parent_element_id: undefined,
                                group_level: 0
                            };
                        }
                        return el;
                    }).filter(el => el.element_id !== elementToDelete.parent_element_id);
                } else {
                    // Multiple children remain - recalculate group duration
                    const childTimeOffsets = remainingChildren.map(el => el.offset_ms);
                    const minTimeOffset = Math.min(...childTimeOffsets);
                    const maxTimeOffset = Math.max(...childTimeOffsets);
                    const newGroupDurationMs = maxTimeOffset - minTimeOffset;

                    updatedElements = updatedElements.map(el => {
                        if (el.element_id === elementToDelete.parent_element_id) {
                            return {
                                ...el,
                                duration_ms: newGroupDurationMs,
                                offset_ms: minTimeOffset
                            };
                        }
                        return el;
                    });
                }
            }

            return updatedElements;
            
        case 'BULK_REORDER':
            // Handle bulk reorder operations
            let bulkResult = [...elements];
            const bulkOp = operation as any;
            
            bulkOp.element_changes.forEach((change: any) => {
                const elementIndex = bulkResult.findIndex(el => el.element_id === change.element_id);
                if (elementIndex !== -1) {
                    const [element] = bulkResult.splice(elementIndex, 1);
                    bulkResult.splice(change.new_index, 0, element);
                }
            });
            
            return bulkResult.map((el, index) => ({
                ...el,
                sequence: index + 1
            }));
            
        case 'ENABLE_AUTO_SORT':
            // Handle auto-sort enabling (applies element changes, preference handled separately)
            let autoSortResult = [...elements];
            const autoSortOp = operation as any;
            
            // Check if element_moves exists before trying to iterate
            if (autoSortOp.element_moves && Array.isArray(autoSortOp.element_moves)) {
                autoSortOp.element_moves.forEach((change: any) => {
                    const elementIndex = autoSortResult.findIndex(el => el.element_id === change.element_id);
                    if (elementIndex !== -1) {
                        const [element] = autoSortResult.splice(elementIndex, 1);
                        autoSortResult.splice(change.new_index, 0, element);
                    }
                });
            }
            
            return autoSortResult.map((el, index) => ({
                ...el,
                sequence: index + 1
            }));
            
        case 'DISABLE_AUTO_SORT':
            // Handle auto-sort disabling - need to "freeze" current order
            // This prevents any previous ENABLE_AUTO_SORT operations from re-sorting
            const disableOp = operation as any;
            if (disableOp.frozenOrder) {
                // Apply the frozen order to override any previous sorting
                const orderedElements = [...elements];
                disableOp.frozenOrder.forEach((elementId: string, index: number) => {
                    const elementIndex = orderedElements.findIndex(el => el.element_id === elementId);
                    if (elementIndex !== -1) {
                        const [element] = orderedElements.splice(elementIndex, 1);
                        orderedElements.splice(index, 0, element);
                    }
                });
                return orderedElements.map((el, index) => ({
                    ...el,
                    sequence: index + 1
                }));
            }
            return elements;
            
        case 'UPDATE_SCRIPT_INFO':
            // Script info operations don't affect elements, just track for undo/redo
            return elements;
            
        case 'CREATE_GROUP':
            // Handle element grouping
            const createGroupOp = operation as any;
            const groupColor = createGroupOp.background_color || '#E2E8F0';
            const groupName = createGroupOp.group_name || 'Untitled Group';
            const elementIds = createGroupOp.element_ids || [];
            
            // Count the types of elements being grouped
            const childElements = elements.filter(el => elementIds.includes(el.element_id));
            const cueCount = childElements.filter(el => (el as any).element_type === 'CUE').length;
            const noteCount = childElements.filter(el => (el as any).element_type === 'NOTE').length;
            const groupCount = childElements.filter(el => (el as any).element_type === 'GROUP').length;
            
            // Calculate group duration from first to last child element
            const childTimeOffsets = childElements.map(el => el.offset_ms);
            const minTimeOffset = Math.min(...childTimeOffsets);
            const maxTimeOffset = Math.max(...childTimeOffsets);
            const groupDurationMs = maxTimeOffset - minTimeOffset;
            
            // Generate the notes field
            const noteParts: string[] = [];
            if (cueCount > 0) noteParts.push(`${cueCount} cue${cueCount !== 1 ? 's' : ''}`);
            if (noteCount > 0) noteParts.push(`${noteCount} note${noteCount !== 1 ? 's' : ''}`);
            if (groupCount > 0) noteParts.push(`${groupCount} group${groupCount !== 1 ? 's' : ''}`);
            
            const generatedNotes = noteParts.length > 0 ? `Includes ${noteParts.join(' and ')}` : '';
            
            // Create a deterministic group parent ID based on the operation ID to prevent duplicates during React StrictMode
            const groupParentId = `group-${operation.id}`;
            const groupParent = {
                element_id: groupParentId,
                script_id: elements[0]?.script_id || '',
                element_type: 'GROUP' as const,
                sequence: Math.min(...elements.filter(el => elementIds.includes(el.element_id)).map(el => el.sequence)),
                offset_ms: minTimeOffset,
                duration_ms: groupDurationMs,
                element_name: groupName,
                cue_notes: generatedNotes,
                custom_color: groupColor,
                priority: 'NORMAL' as const,
                group_level: 0,
                is_collapsed: false,
                parent_element_id: undefined,
                created_by: 'user',
                updated_by: 'user',
                date_created: new Date().toISOString(),
                date_updated: new Date().toISOString(),
                isSafetyCritical: false
            };
            
            // Update elements to be children of the group
            const groupedElements = elements.map(el => {
                if (elementIds.includes(el.element_id)) {
                    return {
                        ...el,
                        parent_element_id: groupParentId,
                        group_level: 1
                    };
                }
                return el;
            });
            
            // Insert group parent at the correct position and update sequences
            const insertPosition = groupedElements.findIndex(el => elementIds.includes(el.element_id));
            const finalElements = [...groupedElements];
            finalElements.splice(insertPosition, 0, groupParent);
            
            // Update sequences
            return finalElements.map((el, index) => ({
                ...el,
                sequence: index + 1
            }));
            
        case 'UPDATE_ELEMENT':
            const updateElementOp = operation as any;
            const targetElement = elements.find(el => el.element_id === operation.element_id);
            const isUpdatingGroupParent = targetElement && (targetElement as any).element_type === 'GROUP';
            const timeOffsetChange = updateElementOp.changes.offset_ms;
            
            // Handle group parent time offset changes specially
            if (isUpdatingGroupParent && timeOffsetChange) {
                const oldTime = timeOffsetChange.old_value;
                const newTime = timeOffsetChange.new_value;
                const timeDelta = newTime - oldTime;
                
                // Apply the same delta to all children
                return elements.map(el => {
                    if (el.element_id === operation.element_id) {
                        // Update the group parent
                        const updatedElement = { ...el };
                        Object.entries(updateElementOp.changes).forEach(([field, change]: [string, any]) => {
                            (updatedElement as any)[field] = change.new_value;
                        });
                        return updatedElement;
                    } else if (el.parent_element_id === operation.element_id) {
                        // Update child elements with same delta
                        return {
                            ...el,
                            offset_ms: el.offset_ms + timeDelta
                        };
                    }
                    return el;
                });
            }
            
            // Regular element update (not a group parent)
            const elementUpdates = elements.map(el => {
                if (el.element_id === operation.element_id) {
                    const updatedElement = { ...el };
                    // Apply all field changes from the operation
                    Object.entries(updateElementOp.changes).forEach(([field, change]: [string, any]) => {
                        (updatedElement as any)[field] = change.new_value;
                    });
                    return updatedElement;
                }
                return el;
            });
            
            // If offset_ms was changed and auto-sort would be enabled, reposition the element
            const timeOffsetChanged = updateElementOp.changes.offset_ms;
            if (timeOffsetChanged && updateElementOp.autoSort) {
                const elementIndex = elementUpdates.findIndex(el => el.element_id === operation.element_id);
                if (elementIndex !== -1) {
                    const element = elementUpdates[elementIndex];
                    const otherElements = elementUpdates.filter((_, i) => i !== elementIndex);
                    
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
                        sequence: index + 1
                    }));
                }
            }
            
            // Group durations will be recalculated at the end of all operations
            
            return elementUpdates;
            
        case 'UPDATE_GROUP_WITH_PROPAGATION':
            const updateGroupOp = operation as any;
            const offsetDelta = updateGroupOp.offset_delta_ms || 0;
            
            return elements.map(el => {
                if (el.element_id === operation.element_id) {
                    // Update the group element itself
                    const updatedGroup = { ...el };
                    Object.entries(updateGroupOp.field_updates || {}).forEach(([field, newValue]: [string, any]) => {
                        (updatedGroup as any)[field] = newValue;
                    });
                    return updatedGroup;
                } else if (offsetDelta !== 0 && el.parent_element_id === operation.element_id && el.group_level && el.group_level > 0) {
                    // Update child elements with offset propagation
                    return {
                        ...el,
                        offset_ms: Math.max(0, (el.offset_ms || 0) + offsetDelta)
                    };
                }
                return el;
            });
            
        case 'TOGGLE_GROUP_COLLAPSE':
            const toggleOp = operation as any;
            return elements.map(el => 
                el.element_id === operation.element_id 
                    ? { ...el, is_collapsed: toggleOp.target_collapsed_state }
                    : el
            );

        case 'BATCH_COLLAPSE_GROUPS':
            const batchOp = operation as any;
            const targetGroupIds = batchOp.group_element_ids || [];
            return elements.map(el => 
                targetGroupIds.includes(el.element_id)
                    ? { ...el, is_collapsed: batchOp.target_collapsed_state }
                    : el
            );
            
        case 'UNGROUP_ELEMENTS':
            const ungroupOp = operation as any;
            const groupElementId = ungroupOp.group_element_id;
            
            // Remove the group parent element and clear parent_element_id from children
            return elements.filter(el => el.element_id !== groupElementId)
                .map(el => {
                    if (el.parent_element_id === groupElementId) {
                        return {
                            ...el,
                            parent_element_id: undefined,
                            group_level: 0
                        };
                    }
                    return el;
                });
            
        default:
            return elements;
    }
}
