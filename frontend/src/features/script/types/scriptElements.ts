// frontend/src/features/script/types/scriptElements.ts

// Base types and enums
export type ScriptElementType = 'cue' | 'note';

export type TriggerType = 
  | 'manual'        // Operator triggered
  | 'time'          // At specific time offset
  | 'auto'          // Auto-follows previous cue
  | 'follow'        // Follows specific cue ID
  | 'go'            // On "GO" command
  | 'standby';      // On "STANDBY" command

export type ExecutionStatus = 
  | 'pending'       // Not yet executed
  | 'ready'         // Ready to execute
  | 'executing'     // Currently executing
  | 'completed'     // Successfully executed
  | 'skipped'       // Skipped during performance
  | 'failed';       // Execution failed

export type PriorityLevel = 'critical' | 'high' | 'normal' | 'low' | 'optional';

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
  type: 'cue';
  cueID: string;                       // Required for cues
  departmentID: string;                // Required for cues
  departmentName?: string;             // Department name from relationship
  departmentColor?: string;            // Department color from relationship
  departmentInitials?: string;         // Department initials from relationship
}

export interface NoteElement extends ScriptElementBase {
  type: 'note';
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
