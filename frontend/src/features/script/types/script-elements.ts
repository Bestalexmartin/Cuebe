// frontend/src/features/script/types/script-elements.ts

// Script Element Types - Following the backend schema

export interface ScriptElement {
    elementID: string;
    scriptID: string;
    elementType: ElementType;
    sequence?: number;
    elementOrder: number; // Legacy field
    
    // Timing fields
    timeOffsetMs: number; // Timing in milliseconds
    duration?: number;
    fadeIn?: number;
    fadeOut?: number;
    
    // Trigger and execution
    triggerType: TriggerType;
    followsCueID?: string;
    executionStatus: ExecutionStatus;
    priority: PriorityLevel;
    
    // Content
    cueID?: string;
    cueNumber?: string; // Legacy field
    description: string;
    elementDescription?: string; // Legacy field
    cueNotes?: string;
    
    // Location and visual
    departmentID?: string;
    location?: LocationArea;
    locationDetails?: string;
    departmentColor?: string;
    customColor?: string;
    
    // Grouping and hierarchy
    parentElementID?: string;
    groupLevel: number;
    isCollapsed: boolean;
    
    // Safety and metadata
    isSafetyCritical: boolean;
    safetyNotes?: string;
    version: number;
    
    // System fields
    isActive: boolean;
    createdBy?: string;
    updatedBy?: string;
    dateCreated: string;
    dateUpdated: string;
    
    // Relationships
    equipment?: ScriptElementEquipment[];
    crew_assignments?: ScriptElementCrewAssignment[];
    conditional_rules?: ScriptElementConditionalRule[];
}

export type ElementType = 'CUE' | 'NOTE';

export type TriggerType = 'MANUAL' | 'TIME' | 'AUTO' | 'FOLLOW' | 'GO' | 'STANDBY';

export type ExecutionStatus = 'PENDING' | 'READY' | 'EXECUTING' | 'COMPLETED' | 'SKIPPED' | 'FAILED';

export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | 'OPTIONAL';

export type LocationArea = 
    | 'stage_left' | 'stage_right' | 'center_stage' | 'upstage' | 'downstage'
    | 'stage_left_up' | 'stage_right_up' | 'stage_left_down' | 'stage_right_down'
    | 'fly_gallery' | 'booth' | 'house' | 'backstage' | 'wings_left' | 'wings_right'
    | 'grid' | 'trap' | 'pit' | 'lobby' | 'dressing_room' | 'other';

export interface ScriptElementEquipment {
    equipmentName: string;
    isRequired: boolean;
    notes?: string;
}

export interface ScriptElementCrewAssignment {
    crewID: string;
    assignmentRole?: string;
    isLead: boolean;
}

export interface ScriptElementConditionalRule {
    ruleID: string;
    conditionType: 'weather' | 'cast' | 'equipment' | 'time' | 'custom';
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    conditionValue: string;
    description: string;
    isActive: boolean;
}

// Form data interfaces
export interface ScriptElementCreate {
    elementType: ElementType;
    sequence?: number;
    timeOffsetMs?: number;
    triggerType?: TriggerType;
    cueID?: string;
    description: string;
    cueNotes?: string;
    departmentID?: string;
    location?: LocationArea;
    locationDetails?: string;
    duration?: number;
    fadeIn?: number;
    fadeOut?: number;
    priority?: PriorityLevel;
    parentElementID?: string;
    groupLevel?: number;
    isSafetyCritical?: boolean;
    safetyNotes?: string;
    departmentColor?: string;
    customColor?: string;
}

export interface ScriptElementUpdate {
    elementType?: ElementType;
    sequence?: number;
    timeOffsetMs?: number;
    triggerType?: TriggerType;
    followsCueID?: string;
    cueID?: string;
    description?: string;
    cueNotes?: string;
    departmentID?: string;
    location?: LocationArea;
    locationDetails?: string;
    duration?: number;
    fadeIn?: number;
    fadeOut?: number;
    priority?: PriorityLevel;
    executionStatus?: ExecutionStatus;
    parentElementID?: string;
    groupLevel?: number;
    isCollapsed?: boolean;
    isSafetyCritical?: boolean;
    safetyNotes?: string;
    departmentColor?: string;
    customColor?: string;
}

// Bulk operations
export interface ScriptElementReorderItem {
    elementID: string;
    sequence: number;
}

export interface ScriptElementReorderRequest {
    elements: ScriptElementReorderItem[];
}

export interface ScriptElementBulkUpdate {
    element_ids: string[];
    department_id?: string;
    priority?: PriorityLevel;
    execution_status?: ExecutionStatus;
    location?: LocationArea;
    is_safety_critical?: boolean;
    custom_color?: string;
}
