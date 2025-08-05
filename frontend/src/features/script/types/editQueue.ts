// frontend/src/features/script/types/editQueue.ts

export interface BaseEditOperation {
    id: string;
    timestamp: number;
    element_id: string; // Database field - snake_case
    description: string; // Human-readable description for UI
}

export interface ReorderOperation extends BaseEditOperation {
    type: 'REORDER';
    old_index: number;
    new_index: number;
    old_sequence: number;
    new_sequence: number;
}

export interface UpdateFieldOperation extends BaseEditOperation {
    type: 'UPDATE_FIELD';
    field: string;
    old_value: any;
    new_value: any;
}

export interface CreateElementOperation extends BaseEditOperation {
    type: 'CREATE_ELEMENT';
    element_data: any; // Database field - snake_case
    insert_index?: number; // Optional - if provided, insert at this index
}

export interface DeleteElementOperation extends BaseEditOperation {
    type: 'DELETE_ELEMENT';
    element_data: any; // Store full element for undo - snake_case
}

export interface UpdateTimeOffsetOperation extends BaseEditOperation {
    type: 'UPDATE_TIME_OFFSET';
    old_time_offset_ms: number;
    new_time_offset_ms: number;
}

export interface BulkReorderOperation extends BaseEditOperation {
    type: 'BULK_REORDER';
    element_changes: Array<{
        element_id: string;
        old_index: number;
        new_index: number;
        old_sequence: number;
        new_sequence: number;
    }>;
}

export interface EnableAutoSortOperation extends BaseEditOperation {
    type: 'ENABLE_AUTO_SORT';
    old_preference_value: boolean;
    new_preference_value: boolean;
    element_moves: Array<{
        element_id: string;
        old_index: number;
        new_index: number;
        old_sequence: number;
        new_sequence: number;
    }>;
}

export interface DisableAutoSortOperation extends BaseEditOperation {
    type: 'DISABLE_AUTO_SORT';
    old_preference_value: boolean;
    new_preference_value: boolean;
}

export interface UpdateScriptInfoOperation extends BaseEditOperation {
    type: 'UPDATE_SCRIPT_INFO';
    changes: Record<string, {
        old_value: any;
        new_value: any;
    }>;
}

export interface UpdateElementOperation extends BaseEditOperation {
    type: 'UPDATE_ELEMENT';
    changes: Record<string, {
        old_value: any;
        new_value: any;
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
