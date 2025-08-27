// frontend/src/features/script/hooks/useEditQueue.ts

import { useState, useCallback, useRef, useMemo } from 'react';
import { EditOperation, EditQueueState, EditCheckpoint, ElementSnapshot, ScriptSnapshot } from '../types/editQueue';
import { ScriptElement } from '../types/scriptElements';
import { EditQueueFormatter } from '../utils/editQueueFormatter';

export interface UseEditQueueReturn {
    // State
    operations: EditOperation[];
    hasUnsavedChanges: boolean;
    canUndo: boolean;
    canRedo: boolean;
    checkpoints: EditCheckpoint[];
    activeCheckpoint?: string;
    
    // Operations
    addOperation: (operation: Omit<EditOperation, 'id' | 'timestamp' | 'description'>) => void;
    undo: () => EditOperation | null;
    redo: () => EditOperation | null;
    clearQueue: () => void;
    revertToPoint: (targetIndex: number) => void;
    
    // Checkpoint operations
    createCheckpoint: (
        type: 'AUTO_SORT' | 'MANUAL',
        description: string,
        elements: ScriptElement[],
        scriptData?: any
    ) => string; // Returns checkpoint ID
    revertToCheckpoint: (checkpointId: string) => EditCheckpoint | null;
    clearCheckpoints: () => void;
    
    // Batch operations
    startBatch: () => void;
    endBatch: (description?: string) => void;
    
    // Utilities
    getFormattedOperations: (allElements: ScriptElement[]) => Array<{
        operation: EditOperation;
        formattedDescription: string;
        timestamp: string;
    }>;
    getSummary: () => string;
}

export const useEditQueue = (): UseEditQueueReturn => {
    const [queueState, setQueueState] = useState<EditQueueState>({
        queue: {
            operations: [],
            hasUnsavedChanges: false
        },
        currentIndex: -1, // -1 means we're at the "latest" state
        checkpoints: [],
        activeCheckpoint: undefined
    });
    
    const operationIdCounter = useRef(0);
    const batchOperations = useRef<EditOperation[]>([]);
    const isBatching = useRef(false);
    
    const generateOperationId = useCallback(() => {
        return `op_${Date.now()}_${++operationIdCounter.current}`;
    }, []);
    
    const addOperation = useCallback((operationData: Omit<EditOperation, 'id' | 'timestamp' | 'description'>) => {
        const timestamp = Date.now();
        const id = generateOperationId();
        
        // ADDED: Operation source tracking
        
        // Create base operation
        const baseOperation = {
            ...operationData,
            id,
            timestamp,
            description: '' // Will be set below
        } as EditOperation;
        
        // Generate human-readable description
        const description = EditQueueFormatter.formatOperation(baseOperation, []);
        const operation = { ...baseOperation, description };
        
        if (isBatching.current) {
            // Add to batch instead of queue
            batchOperations.current.push(operation);
            return;
        }
        
        setQueueState(prevState => {
            // If we're not at the latest state (user has undone operations),
            // we need to truncate the operations array from current position
            const truncatedOperations = prevState.currentIndex === -1 
                ? prevState.queue.operations
                : prevState.queue.operations.slice(0, prevState.currentIndex + 1);
            
            return {
                queue: {
                    operations: [...truncatedOperations, operation],
                    hasUnsavedChanges: true
                },
                currentIndex: -1, // Reset to latest
                checkpoints: prevState.checkpoints
            };
        });
    }, [generateOperationId]);
    
    const undo = useCallback((): EditOperation | null => {
        let operationToUndo: EditOperation | null = null;
        
        setQueueState(prevState => {
            const operations = prevState.queue.operations;
            
            if (operations.length === 0) return prevState;
            
            // Determine which operation to undo
            const indexToUndo = prevState.currentIndex === -1 
                ? operations.length - 1 
                : prevState.currentIndex;
                
            if (indexToUndo < 0) return prevState;
            
            operationToUndo = operations[indexToUndo];
            
            return {
                ...prevState,
                currentIndex: indexToUndo - 1
            };
        });
        
        return operationToUndo;
    }, []);
    
    const redo = useCallback((): EditOperation | null => {
        let operationToRedo: EditOperation | null = null;
        
        setQueueState(prevState => {
            const operations = prevState.queue.operations;
            
            if (operations.length === 0) return prevState;
            
            const indexToRedo = prevState.currentIndex + 1;
            
            if (indexToRedo >= operations.length) return prevState;
            
            operationToRedo = operations[indexToRedo];
            
            return {
                ...prevState,
                currentIndex: indexToRedo
            };
        });
        
        return operationToRedo;
    }, []);
    
    const clearQueue = useCallback(() => {
        setQueueState({
            queue: {
                operations: [],
                hasUnsavedChanges: false
            },
            currentIndex: -1,
            checkpoints: []
        });
    }, []);
    
    const revertToPoint = useCallback((targetIndex: number) => {
        setQueueState(prevState => {
            const operations = prevState.queue.operations;
            
            // Validate target index
            if (targetIndex < 0 || targetIndex >= operations.length) {
                console.warn('Invalid target index for revert:', targetIndex);
                return prevState;
            }
            
            // Keep operations up to and including the target index
            const truncatedOperations = operations.slice(0, targetIndex + 1);
            
            return {
                queue: {
                    operations: truncatedOperations,
                    hasUnsavedChanges: truncatedOperations.length > 0
                },
                currentIndex: -1, // Reset to latest
                checkpoints: prevState.checkpoints
            };
        });
    }, []);
    
    const startBatch = useCallback(() => {
        isBatching.current = true;
        batchOperations.current = [];
    }, []);
    
    const endBatch = useCallback((description?: string) => {
        if (!isBatching.current) return;
        
        const operations = batchOperations.current;
        if (operations.length === 0) {
            isBatching.current = false;
            return;
        }
        
        if (operations.length === 1) {
            // Single operation, add normally
            setQueueState(prevState => ({
                queue: {
                    operations: [...prevState.queue.operations, operations[0]],
                    hasUnsavedChanges: true
                },
                currentIndex: -1,
                checkpoints: prevState.checkpoints
            }));
        } else {
            // Multiple operations, create a batch operation
            const batchOperation: EditOperation = {
                id: generateOperationId(),
                timestamp: Date.now(),
                element_id: 'batch',
                description: description || `Batch operation (${operations.length} changes)`,
                type: 'BULK_REORDER', // This would need to be expanded for different batch types
                element_changes: operations.map(op => ({
                    element_id: op.element_id,
                    old_index: 0, // These would need to be populated based on operation type
                    new_index: 0,
                    old_sequence: 0,
                    new_sequence: 0
                }))
            } as any;
            
            setQueueState(prevState => ({
                queue: {
                    operations: [...prevState.queue.operations, batchOperation],
                    hasUnsavedChanges: true
                },
                currentIndex: -1,
                checkpoints: prevState.checkpoints
            }));
        }
        
        isBatching.current = false;
        batchOperations.current = [];
    }, [generateOperationId]);
    
    const getFormattedOperations = useCallback((allElements: ScriptElement[]) => {
        const activeOperations = queueState.currentIndex === -1 
            ? queueState.queue.operations
            : queueState.queue.operations.slice(0, queueState.currentIndex + 1);
            
        return activeOperations.map(operation => ({
            operation,
            formattedDescription: EditQueueFormatter.formatOperation(operation, allElements),
            timestamp: EditQueueFormatter.formatTimestamp(operation.timestamp)
        }));
    }, [queueState]);
    
    const getSummary = useCallback(() => {
        const activeOperations = queueState.currentIndex === -1 
            ? queueState.queue.operations
            : queueState.queue.operations.slice(0, queueState.currentIndex + 1);
            
        return EditQueueFormatter.formatOperationsSummary(activeOperations);
    }, [queueState]);

    // Checkpoint functions
    const createCheckpoint = useCallback((
        type: 'AUTO_SORT' | 'MANUAL',
        description: string,
        elements: ScriptElement[],
        scriptData?: any
    ): string => {
        const checkpointId = `checkpoint_${Date.now()}_${++operationIdCounter.current}`;
        
        // Create selective snapshots of only relevant fields
        const elementSnapshots: Record<string, ElementSnapshot> = {};
        elements.forEach(element => {
            elementSnapshots[element.element_id] = {
                element_id: element.element_id,
                sequence: element.sequence,
                offset_ms: element.offset_ms,
                element_name: element.element_name,
                cue_notes: element.cue_notes,
                custom_color: element.custom_color,
                location_details: element.location_details,
                parent_element_id: element.parent_element_id,
                group_level: element.group_level,
                is_collapsed: element.is_collapsed,
                _exists: true
            };
        });

        const scriptSnapshot: ScriptSnapshot | undefined = scriptData ? {
            script_id: scriptData.script_id,
            script_name: scriptData.script_name,
            venue_id: scriptData.venue_id,
            description: scriptData.description,
            auto_sort_cues: scriptData.auto_sort_cues
        } : undefined;

        const checkpoint: EditCheckpoint = {
            id: checkpointId,
            timestamp: Date.now(),
            type,
            description,
            elementSnapshots,
            scriptSnapshot,
            operationsSince: [...queueState.queue.operations], // Copy current operations
            totalElementCount: elements.length
        };

        setQueueState(prevState => ({
            ...prevState,
            checkpoints: [...prevState.checkpoints, checkpoint],
            activeCheckpoint: checkpointId
        }));

        return checkpointId;
    }, [queueState.queue.operations]);

    const revertToCheckpoint = useCallback((checkpointId: string): EditCheckpoint | null => {
        const checkpoint = queueState.checkpoints.find(cp => cp.id === checkpointId);
        if (!checkpoint) {
            return null;
        }

        // Clear current operations since we're reverting
        setQueueState(prevState => ({
            queue: {
                operations: [],
                hasUnsavedChanges: true // We have changes (the revert operation)
            },
            currentIndex: -1,
            checkpoints: prevState.checkpoints,
            activeCheckpoint: undefined // No active checkpoint after revert
        }));

        return checkpoint;
    }, [queueState.checkpoints]);

    const clearCheckpoints = useCallback(() => {
        setQueueState(prevState => ({
            ...prevState,
            checkpoints: [],
            activeCheckpoint: undefined
        }));
    }, []);
    
    return useMemo(() => ({
        // State
        operations: queueState.queue.operations,
        hasUnsavedChanges: queueState.queue.hasUnsavedChanges,
        canUndo: queueState.currentIndex >= 0 || queueState.queue.operations.length > 0,
        canRedo: queueState.currentIndex < queueState.queue.operations.length - 1,
        checkpoints: queueState.checkpoints,
        activeCheckpoint: queueState.activeCheckpoint,
        
        // Operations
        addOperation,
        undo,
        redo,
        clearQueue,
        revertToPoint,
        
        // Checkpoint operations
        createCheckpoint,
        revertToCheckpoint,
        clearCheckpoints,
        
        // Batch operations
        startBatch,
        endBatch,
        
        // Utilities
        getFormattedOperations,
        getSummary
    }), [
        queueState.queue.operations,
        queueState.queue.hasUnsavedChanges,
        queueState.currentIndex,
        queueState.checkpoints,
        queueState.activeCheckpoint,
        createCheckpoint,
        revertToCheckpoint,
        clearCheckpoints
    ]);
};
