// frontend/src/features/script/types/scriptElements.ts

// Base types and enums
export type ScriptElementType = 'CUE' | 'NOTE' | 'GROUP';

export type TriggerType = 
  | 'MANUAL'        // Operator triggered
  | 'TIME'          // At specific time offset
  | 'AUTO'          // Auto-follows previous cue
  | 'FOLLOW'        // Follows specific cue ID
  | 'GO'            // On "GO" command
  | 'STANDBY';      // On "STANDBY" command

export type ExecutionStatus = 
  | 'PENDING'       // Not yet executed
  | 'READY'         // Ready to execute
  | 'EXECUTING'     // Currently executing
  | 'COMPLETED'     // Successfully executed
  | 'SKIPPED'       // Skipped during performance
  | 'FAILED';       // Execution failed

export type PriorityLevel = 'SAFETY' | 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | 'OPTIONAL';

export type LocationArea = 
  | 'stage_left' | 'stage_right' | 'center_stage' | 'upstage' | 'downstage'
  | 'stage_left_up' | 'stage_right_up' | 'stage_left_down' | 'stage_right_down'
  | 'fly_gallery' | 'booth' | 'house' | 'backstage' | 'wings_left' | 'wings_right'
  | 'grid' | 'trap' | 'pit' | 'lobby' | 'dressing_room' | 'other';

// Core interfaces
export interface ScriptElementBase {
  // Primary identification
  element_id: string;
  script_id: string;
  type: ScriptElementType;
  
  // Sequencing and timing
  sequence: number;                    // Order in script (auto-incrementing)
  time_offset_ms: number;                // Milliseconds from script start
  trigger_type: TriggerType;
  follows_cue_id?: string;               // If trigger_type is 'follow'
  
  // Content and identification
  cue_id?: string;                      // LX5, SND12, etc.
  description: string;
  cue_notes?: string;
  
  // Department and visual
  department_id?: string;               // Link to department
  department_name?: string;             // Department name from relationship
  department_color?: string;            // Department color from relationship
  department_initials?: string;         // Department initials from relationship
  custom_color?: string;                // Custom row color for notes
  
  // Location and logistics
  location?: LocationArea;
  location_details?: string;            // Specific location description
  
  // Timing and execution
  duration?: number;                   // Runtime in milliseconds
  fade_in?: number;                     // Fade in time in milliseconds
  fade_out?: number;                    // Fade out time in milliseconds
  
  // Status and management
  is_active: boolean;                   // Can be disabled without deletion
  priority: PriorityLevel;
  execution_status: ExecutionStatus;
  
  // Relationships and grouping
  parent_element_id?: string;            // For groups and hierarchies
  group_level: number;                  // Depth level (0 = root)
  is_collapsed?: boolean;               // For group display state
  
  // Equipment and resources
  equipmentRequired?: string[];        // List of required equipment
  crewAssignments?: string[];          // Crew member IDs assigned
  performerAssignments?: string[];     // Actor IDs involved
  
  // Safety and conditions
  isSafetyCritical: boolean;
  safetyNotes?: string;
  conditionalRules?: ConditionalRule[];
  
  // Metadata
  created_by: string;                   // User ID
  updated_by: string;                   // User ID  
  date_created: string;                 // ISO timestamp
  date_updated: string;                 // ISO timestamp
  version: number;                     // For change tracking
}

// Conditional execution rules
export interface ConditionalRule {
  id: string;
  condition: 'weather' | 'cast' | 'equipment' | 'time' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string;
  description: string;
}

// Specific element types extending the base
export interface CueElement extends ScriptElementBase {
  type: 'CUE';
  cue_id: string;                       // Required for cues
  department_id: string;                // Required for cues
  department_name?: string;             // Department name from relationship
  department_color?: string;            // Department color from relationship
  department_initials?: string;         // Department initials from relationship
}

export interface NoteElement extends ScriptElementBase {
  type: 'NOTE';
  department_id?: string;               // Optional for notes
  department_name?: string;             // Department name from relationship
  department_color?: string;            // Department color from relationship
  department_initials?: string;         // Department initials from relationship
  custom_color: string;                 // Required for visual distinction
}

// Union type for all elements
export type ScriptElement = CueElement | NoteElement;

// Department information for display
export interface Department {
  department_id: string;
  name: string;
  shortName: string;                   // For cue IDs (LX, SND, etc.)
  color: string;                       // Hex color code
  description?: string;
}

// Script element collection with metadata
export interface ScriptElementCollection {
  script_id: string;
  elements: ScriptElement[];
  departments: Department[];
  lastUpdated: string;
  version: number;
}

// Display and filtering options
export interface ElementDisplayOptions {
  showInactive: boolean;
  filterByDepartment?: string[];
  filterByType?: ScriptElementType[];
  filterByPriority?: PriorityLevel[];
  sortBy: 'sequence' | 'timeOffset' | 'department' | 'cue_id';
  sortDirection: 'asc' | 'desc';
  groupBy?: 'department' | 'type' | 'none';
}

// For real-time playback and tracking
export interface PlaybackState {
  currentElementID?: string;
  nextElementID?: string;
  elapsedTime: number;                 // Milliseconds since script start
  isPlaying: boolean;
  isPaused: boolean;
  playbackSpeed: number;               // 1.0 = normal speed
}

// Form data interfaces for editing
export interface ScriptElementFormData {
  type: ScriptElementType;
  cue_id?: string;
  description: string;
  cue_notes?: string;
  department_id?: string;
  time_offset_ms: number;
  trigger_type: TriggerType;
  follows_cue_id?: string;
  duration?: number;
  fade_in?: number;
  fade_out?: number;
  location?: LocationArea;
  location_details?: string;
  priority: PriorityLevel;
  equipmentRequired?: string[];
  crewAssignments?: string[];
  performerAssignments?: string[];
  isSafetyCritical: boolean;
  safetyNotes?: string;
  custom_color?: string;
  conditionalRules?: ConditionalRule[];
}

// Validation rules for form elements
export interface ElementValidationRules {
  cue_id: {
    required: boolean;
    pattern?: RegExp;
    maxLength: number;
  };
  description: {
    required: boolean;
    maxLength: number;
  };
  timeOffset: {
    min: number;
    max: number;
  };
  duration: {
    min: number;
    max: number;
  };
}

// ============================================================================
// BACKEND API INTEGRATION TYPES
// ============================================================================

// Create/Update interfaces for API calls (snake_case to match backend)
export interface ScriptElementCreate {
  element_type: ScriptElementType;
  sequence?: number;
  time_offset_ms?: number;
  trigger_type?: TriggerType;
  cue_id?: string;
  description: string;
  cue_notes?: string;
  department_id?: string;
  location?: LocationArea;
  location_details?: string;
  duration?: number;
  fade_in?: number;
  fade_out?: number;
  priority?: PriorityLevel;
  parent_element_id?: string;
  group_level?: number;
  isSafetyCritical?: boolean;
  safetyNotes?: string;
  department_color?: string;
  custom_color?: string;
}

export interface ScriptElementUpdate {
  element_type?: ScriptElementType;
  sequence?: number;
  time_offset_ms?: number;
  trigger_type?: TriggerType;
  follows_cue_id?: string;
  cue_id?: string;
  description?: string;
  cue_notes?: string;
  department_id?: string;
  location?: LocationArea;
  location_details?: string;
  duration?: number;
  fade_in?: number;
  fade_out?: number;
  priority?: PriorityLevel;
  execution_status?: ExecutionStatus;
  parent_element_id?: string;
  group_level?: number;
  is_collapsed?: boolean;
  isSafetyCritical?: boolean;
  safetyNotes?: string;
  department_color?: string;
  custom_color?: string;
}

// Bulk operations for performance
export interface ScriptElementReorderItem {
  element_id: string;
  sequence: number;
}

export interface ScriptElementReorderRequest {
  elements: ScriptElementReorderItem[];
}

export interface ScriptElementBulkUpdate {
  elementIds: string[];
  departmentId?: string;
  priority?: PriorityLevel;
  execution_status?: ExecutionStatus;
  location?: LocationArea;
  isSafetyCritical?: boolean;
  custom_color?: string;
}

// Equipment and crew assignments
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
  is_active: boolean;
}

// Extended base interface with all relationships
export interface ScriptElementFull extends ScriptElementBase {
  equipment?: ScriptElementEquipment[];
  crewAssignments?: ScriptElementCrewAssignment[];
  conditionalRules?: ScriptElementConditionalRule[];
}

// Type aliases for backward compatibility
export type ElementType = ScriptElementType;
