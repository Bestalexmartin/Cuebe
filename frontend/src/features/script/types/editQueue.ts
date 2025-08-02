// frontend/src/features/script/types/editQueue.ts

export interface BaseEditOperation {
    id: string;
    timestamp: number;
    elementId: string;
    description: string; // Human-readable description for UI
}

export interface ReorderOperation extends BaseEditOperation {
    type: 'REORDER';
    oldIndex: number;
    newIndex: number;
    oldSequence: number;
    newSequence: number;
}

export interface UpdateFieldOperation extends BaseEditOperation {
    type: 'UPDATE_FIELD';
    field: string;
    oldValue: any;
    newValue: any;
}

export interface CreateElementOperation extends BaseEditOperation {
    type: 'CREATE_ELEMENT';
    elementData: any;
    insertIndex?: number; // Optional - if provided, insert at this index
}

export interface DeleteElementOperation extends BaseEditOperation {
    type: 'DELETE_ELEMENT';
    elementData: any; // Store full element for undo
}

export interface UpdateTimeOffsetOperation extends BaseEditOperation {
    type: 'UPDATE_TIME_OFFSET';
    oldTimeOffsetMs: number;
    newTimeOffsetMs: number;
}

export interface BulkReorderOperation extends BaseEditOperation {
    type: 'BULK_REORDER';
    elementChanges: Array<{
        elementId: string;
        oldIndex: number;
        newIndex: number;
        oldSequence: number;
        newSequence: number;
    }>;
}

export interface EnableAutoSortOperation extends BaseEditOperation {
    type: 'ENABLE_AUTO_SORT';
    oldPreferenceValue: boolean;
    newPreferenceValue: boolean;
    elementMoves: Array<{
        elementId: string;
        oldIndex: number;
        newIndex: number;
        oldSequence: number;
        newSequence: number;
    }>;
}

export interface DisableAutoSortOperation extends BaseEditOperation {
    type: 'DISABLE_AUTO_SORT';
    oldPreferenceValue: boolean;
    newPreferenceValue: boolean;
}

export interface UpdateScriptInfoOperation extends BaseEditOperation {
    type: 'UPDATE_SCRIPT_INFO';
    changes: Record<string, {
        oldValue: any;
        newValue: any;
    }>;
}

export interface UpdateElementOperation extends BaseEditOperation {
    type: 'UPDATE_ELEMENT';
    changes: Record<string, {
        oldValue: any;
        newValue: any;
    }>;
}

export type EditOperation = 
    | ReorderOperation 
    | UpdateFieldOperation 
    | CreateElementOperation 
    | DeleteElementOperation 
    | UpdateTimeOffsetOperation
    | BulkReorderOperation
    | EnableAutoSortOperation
    | DisableAutoSortOperation
    | UpdateScriptInfoOperation
    | UpdateElementOperation;

export interface EditQueue {
    operations: EditOperation[];
    hasUnsavedChanges: boolean;
}

export interface EditQueueState {
    queue: EditQueue;
    currentIndex: number; // For undo/redo functionality
}
