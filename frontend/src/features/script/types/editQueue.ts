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
    old_offset_ms: number;
    new_offset_ms: number;
}

export interface UpdateGroupWithPropagationOperation extends BaseEditOperation {
    type: 'UPDATE_GROUP_WITH_PROPAGATION';
    field_updates: {
        element_name?: string;
        cue_notes?: string;
        custom_color?: string;
        offset_ms?: number;
    };
    old_values: {
        element_name?: string;
        cue_notes?: string;
        custom_color?: string;
        offset_ms?: number;
    };
    offset_delta_ms: number; // For propagating to children
    affected_children: string[]; // IDs of child elements that will be affected
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
    resequenced_elements: Array<{
        element_id: string;
        old_sequence: number;
        new_sequence: number;
    }>;
    total_elements: number; // For validation
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

export interface ToggleGroupCollapseOperation extends BaseEditOperation {
    type: 'TOGGLE_GROUP_COLLAPSE';
    target_collapsed_state: boolean;
}

export interface BatchCollapseGroupsOperation extends BaseEditOperation {
    type: 'BATCH_COLLAPSE_GROUPS';
    group_element_ids: string[];
    target_collapsed_state: boolean;
}

export interface CreateGroupOperation extends BaseEditOperation {
    type: 'CREATE_GROUP';
    group_name: string;
    background_color?: string;
    element_ids: string[];
}

export interface UngroupElementsOperation extends BaseEditOperation {
    type: 'UNGROUP_ELEMENTS';
    group_element_id: string;
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
    | UpdateElementOperation
    | ToggleGroupCollapseOperation
    | BatchCollapseGroupsOperation
    | CreateGroupOperation
    | UngroupElementsOperation
    | UpdateGroupWithPropagationOperation;

export interface EditQueue {
    operations: EditOperation[];
    hasUnsavedChanges: boolean;
}

// Selective checkpoint - only stores fields that changed
export interface ElementSnapshot {
    element_id: string;
    // Core sequencing fields
    sequence?: number;
    offset_ms?: number;
    
    // Content fields that can be edited
    element_name?: string;
    cue_notes?: string;
    custom_color?: string;
    location_details?: string;
    
    // Grouping fields
    parent_element_id?: string | null;
    group_level?: number;
    is_collapsed?: boolean;
    
    // Creation/deletion tracking
    _exists?: boolean; // false = element was deleted, true = element was created
}

export interface ScriptSnapshot {
    script_id: string;
    // Only capture script fields that can be edited via operations
    script_name?: string;
    venue_id?: string | null;
    description?: string;
    auto_sort_cues?: boolean;
}

export interface EditCheckpoint {
    id: string;
    timestamp: number;
    type: 'AUTO_SORT' | 'MANUAL'; // Type of checkpoint for different revert behaviors
    description: string; // Human-readable description like "Pre-Auto-Sort"
    
    // Selective snapshots - only fields that changed
    elementSnapshots: Record<string, ElementSnapshot>; // element_id -> snapshot
    scriptSnapshot?: ScriptSnapshot;
    
    // Context for restoration
    operationsSince: EditOperation[]; // Operations that led to this checkpoint
    totalElementCount: number; // For validation during restore
}

export interface EditQueueState {
    queue: EditQueue;
    currentIndex: number; // For undo/redo functionality
    checkpoints: EditCheckpoint[]; // Major state snapshots
    activeCheckpoint?: string; // ID of most recent checkpoint that can be reverted to
}
