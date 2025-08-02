// frontend/src/features/script/types/scriptElements.ts

// Base types and enums
export type ScriptElementType = 'CUE' | 'NOTE';

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
  elementID: string;
  scriptID: string;
  type: ScriptElementType;
  
  // Sequencing and timing
  sequence: number;                    // Order in script (auto-incrementing)
  timeOffsetMs: number;                // Milliseconds from script start
  triggerType: TriggerType;
  followsCueID?: string;               // If triggerType is 'follow'
  
  // Content and identification
  cueID?: string;                      // LX5, SND12, etc.
  description: string;
  cueNotes?: string;
  
  // Department and visual
  departmentID?: string;               // Link to department
  departmentName?: string;             // Department name from relationship
  departmentColor?: string;            // Department color from relationship
  departmentInitials?: string;         // Department initials from relationship
  customColor?: string;                // Custom row color for notes
  
  // Location and logistics
  location?: LocationArea;
  locationDetails?: string;            // Specific location description
  
  // Timing and execution
  duration?: number;                   // Runtime in milliseconds
  fadeIn?: number;                     // Fade in time in milliseconds
  fadeOut?: number;                    // Fade out time in milliseconds
  
  // Status and management
  isActive: boolean;                   // Can be disabled without deletion
  priority: PriorityLevel;
  executionStatus: ExecutionStatus;
  
  // Relationships and grouping
  parentElementID?: string;            // For groups and hierarchies
  groupLevel: number;                  // Depth level (0 = root)
  isCollapsed?: boolean;               // For group display state
  
  // Equipment and resources
  equipmentRequired?: string[];        // List of required equipment
  crewAssignments?: string[];          // Crew member IDs assigned
  performerAssignments?: string[];     // Actor IDs involved
  
  // Safety and conditions
  isSafetyCritical: boolean;
  safetyNotes?: string;
  conditionalRules?: ConditionalRule[];
  
  // Metadata
  createdBy: string;                   // User ID
  updatedBy: string;                   // User ID  
  dateCreated: string;                 // ISO timestamp
  dateUpdated: string;                 // ISO timestamp
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
  cueID: string;                       // Required for cues
  departmentID: string;                // Required for cues
  departmentName?: string;             // Department name from relationship
  departmentColor?: string;            // Department color from relationship
  departmentInitials?: string;         // Department initials from relationship
}

export interface NoteElement extends ScriptElementBase {
  type: 'NOTE';
  departmentID?: string;               // Optional for notes
  departmentName?: string;             // Department name from relationship
  departmentColor?: string;            // Department color from relationship
  departmentInitials?: string;         // Department initials from relationship
  customColor: string;                 // Required for visual distinction
}

// Union type for all elements
export type ScriptElement = CueElement | NoteElement;

// Department information for display
export interface Department {
  departmentID: string;
  name: string;
  shortName: string;                   // For cue IDs (LX, SND, etc.)
  color: string;                       // Hex color code
  description?: string;
}

// Script element collection with metadata
export interface ScriptElementCollection {
  scriptID: string;
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
  sortBy: 'sequence' | 'timeOffset' | 'department' | 'cueID';
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
  cueID?: string;
  description: string;
  cueNotes?: string;
  departmentID?: string;
  timeOffsetMs: number;
  triggerType: TriggerType;
  followsCueID?: string;
  duration?: number;
  fadeIn?: number;
  fadeOut?: number;
  location?: LocationArea;
  locationDetails?: string;
  priority: PriorityLevel;
  equipmentRequired?: string[];
  crewAssignments?: string[];
  performerAssignments?: string[];
  isSafetyCritical: boolean;
  safetyNotes?: string;
  customColor?: string;
  conditionalRules?: ConditionalRule[];
}

// Validation rules for form elements
export interface ElementValidationRules {
  cueID: {
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
  elementType: ScriptElementType;
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
  elementType?: ScriptElementType;
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

// Bulk operations for performance
export interface ScriptElementReorderItem {
  elementID: string;
  sequence: number;
}

export interface ScriptElementReorderRequest {
  elements: ScriptElementReorderItem[];
}

export interface ScriptElementBulkUpdate {
  elementIds: string[];
  departmentId?: string;
  priority?: PriorityLevel;
  executionStatus?: ExecutionStatus;
  location?: LocationArea;
  isSafetyCritical?: boolean;
  customColor?: string;
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
  isActive: boolean;
}

// Extended base interface with all relationships
export interface ScriptElementFull extends ScriptElementBase {
  equipment?: ScriptElementEquipment[];
  crewAssignments?: ScriptElementCrewAssignment[];
  conditionalRules?: ScriptElementConditionalRule[];
}

// Type aliases for backward compatibility
export type ElementType = ScriptElementType;
