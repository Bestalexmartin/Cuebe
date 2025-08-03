// frontend/src/features/script/hooks/useScriptElementsWithEditQueue.ts

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ScriptElement } from '../types/scriptElements';
import { EditOperation } from '../types/editQueue';
import { useEditQueue } from './useEditQueue';

interface UseScriptElementsWithEditQueueReturn {
    // Current view state (server + local changes)
    elements: ScriptElement[];
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
    
    // Revert
    revertToPoint: (targetIndex: number) => void;
}

interface UseScriptElementsOptions {
    element_type?: string;
    departmentId?: string;
    activeOnly?: boolean;
    skip?: number;
    limit?: number;
}

export const useScriptElementsWithEditQueue = (
    scriptId: string | undefined,
    options: UseScriptElementsOptions = {}
): UseScriptElementsWithEditQueueReturn => {
    const [serverElements, setServerElements] = useState<ScriptElement[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { getToken } = useAuth();
    
    const editQueue = useEditQueue();
    
    // Use a ref to store the latest editQueue to create stable callbacks
    const editQueueRef = useRef(editQueue);
    editQueueRef.current = editQueue;
    
    // Extract only the properties we need to avoid depending on the entire object
    const { operations, hasUnsavedChanges, canUndo, canRedo } = editQueue;
    
    // Apply edit operations to server elements to get current view
    const elements = useMemo(() => {
        let currentElements = [...serverElements];
        
        // Apply each operation in sequence to build current state
        operations.forEach(operation => {
            currentElements = applyOperationToElements(currentElements, operation);
        });
        
        return currentElements;
    }, [serverElements, operations]);
    
    const fetchElements = useCallback(async () => {
        if (!scriptId) {
            setServerElements([]);
            return;
        }

        // console.log(`🔍 useScriptElementsWithEditQueue: Fetching elements for script ${scriptId}...`);
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
            if (options.activeOnly !== undefined) params.append('active_only', options.activeOnly.toString());
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
            // console.log(`✅ useScriptElementsWithEditQueue: Loaded ${data.length} elements from server`);
            setServerElements(data);
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
            const token = await getToken();
            if (!token) {
                throw new Error('Authentication token not available');
            }
            
            // Send batch of operations to server
            console.log('Sending operations to batch-update:', editQueueRef.current.operations);
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
                    errorData = await response.json();
                } catch {
                    errorData = await response.text();
                }
                console.error('Backend error response:', response.status, errorData);
                throw new Error(`Failed to save changes: ${response.status} - ${JSON.stringify(errorData)}`);
            }
            
            // Clear the edit queue and refresh from server
            editQueueRef.current.clearQueue();
            await fetchElements();
            
            return true;
        } catch (err) {
            console.error('Error saving changes:', err);
            setError(err instanceof Error ? err.message : 'Failed to save changes');
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
    
    useEffect(() => {
        fetchElements();
    }, [fetchElements]);
    
    return useMemo(() => ({
        // Current view state
        elements,
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
        
        // Revert
        revertToPoint: editQueueRef.current.revertToPoint
    }), [
        elements,
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
        canRedo
    ]);
};

/**
 * Apply a single edit operation to an array of elements
 */
function applyOperationToElements(elements: ScriptElement[], operation: EditOperation): ScriptElement[] {
    switch (operation.type) {
        case 'REORDER':
            const reorderOp = operation as any;
            const elementToMove = elements.find(el => el.element_id === operation.elementId);
            if (!elementToMove) return elements;
            
            const filtered = elements.filter(el => el.element_id !== operation.elementId);
            const result = [...filtered];
            result.splice(reorderOp.newIndex, 0, elementToMove);
            
            // Update sequences
            return result.map((el, index) => ({
                ...el,
                sequence: index + 1
            }));
            
        case 'UPDATE_FIELD':
            const updateOp = operation as any;
            return elements.map(el => 
                el.element_id === operation.elementId 
                    ? { ...el, [updateOp.field]: updateOp.newValue }
                    : el
            );
            
        case 'UPDATE_TIME_OFFSET':
            const timeOp = operation as any;
            return elements.map(el => 
                el.element_id === operation.elementId 
                    ? { ...el, time_offset_ms: timeOp.newTimeOffsetMs }
                    : el
            );
            
        case 'CREATE_ELEMENT':
            const createOp = operation as any;
            if (createOp.insertIndex !== undefined) {
                // Insert at specific index
                const newElements = [...elements];
                newElements.splice(createOp.insertIndex, 0, createOp.elementData);
                
                // Update sequences for all elements after insertion
                return newElements.map((el, index) => ({
                    ...el,
                    sequence: index + 1
                }));
            } else {
                // Append to end
                return [...elements, createOp.elementData];
            }
            
        case 'DELETE_ELEMENT':
            return elements.filter(el => el.element_id !== operation.elementId);
            
        case 'BULK_REORDER':
            // Handle bulk reorder operations
            let bulkResult = [...elements];
            const bulkOp = operation as any;
            
            bulkOp.elementChanges.forEach((change: any) => {
                const elementIndex = bulkResult.findIndex(el => el.element_id === change.elementId);
                if (elementIndex !== -1) {
                    const [element] = bulkResult.splice(elementIndex, 1);
                    bulkResult.splice(change.newIndex, 0, element);
                }
            });
            
            return bulkResult.map((el, index) => ({
                ...el,
                sequence: index + 1
            }));
            
        case 'ENABLE_AUTO_SORT':
            // Handle auto-sort enabling (applies element moves, preference handled separately)
            let autoSortResult = [...elements];
            const autoSortOp = operation as any;
            
            autoSortOp.elementMoves.forEach((change: any) => {
                const elementIndex = autoSortResult.findIndex(el => el.element_id === change.elementId);
                if (elementIndex !== -1) {
                    const [element] = autoSortResult.splice(elementIndex, 1);
                    autoSortResult.splice(change.newIndex, 0, element);
                }
            });
            
            return autoSortResult.map((el, index) => ({
                ...el,
                sequence: index + 1
            }));
            
        case 'DISABLE_AUTO_SORT':
            // Handle auto-sort disabling (no element changes, just preference tracking)
            return elements;
            
        case 'UPDATE_SCRIPT_INFO':
            // Script info operations don't affect elements, just track for undo/redo
            return elements;
            
        case 'UPDATE_ELEMENT':
            const updateElementOp = operation as any;
            return elements.map(el => {
                if (el.element_id === operation.elementId) {
                    const updatedElement = { ...el };
                    // Apply all field changes from the operation
                    Object.entries(updateElementOp.changes).forEach(([field, change]: [string, any]) => {
                        (updatedElement as any)[field] = change.newValue;
                    });
                    return updatedElement;
                }
                return el;
            });
            
        default:
            return elements;
    }
}
