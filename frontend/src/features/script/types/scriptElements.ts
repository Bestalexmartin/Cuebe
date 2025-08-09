// frontend/src/features/script/types/scriptElements.ts

// Base types and enums
export type ScriptElementType = 'CUE' | 'NOTE' | 'GROUP';


export type PriorityLevel = 'SAFETY' | 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | 'OPTIONAL';


// Core interfaces
export interface ScriptElementBase {
  // Primary identification
  element_id: string;
  script_id: string;
  element_type: ScriptElementType;
  
  // Sequencing and timing
  sequence: number;                    // Order in script (auto-incrementing)
  time_offset_ms: number;                // Milliseconds from script start
  
  // Content and identification
  description: string;
  cue_notes?: string;
  
  // Department and visual
  department_id?: string;               // Link to department
  department_name?: string;             // Department name from relationship
  department_initials?: string;         // Department initials from relationship
  department_color?: string;            // Department color from relationship
  custom_color?: string;                // Custom row color for notes
  
  // Location and logistics
  location_details?: string;            // Specific location description
  
  // Timing and execution
  duration?: number;                   // Runtime in milliseconds
  
  // Status and management
  priority: PriorityLevel;
  
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
  element_type: 'CUE';
  department_id: string;                // Required for cues
  department_name?: string;             // Department name from relationship
  department_initials?: string;         // Department initials from relationship
  department_color?: string;            // Department color from relationship
}

export interface NoteElement extends ScriptElementBase {
  element_type: 'NOTE';
  department_id?: string;               // Optional for notes
  department_name?: string;             // Department name from relationship
  department_initials?: string;         // Department initials from relationship
  custom_color: string;                 // Required for visual distinction
}

export interface GroupElement extends ScriptElementBase {
  element_type: 'GROUP';
  custom_color?: string;                // Optional group color
  // Groups don't require department
}

// Union type for all elements
export type ScriptElement = CueElement | NoteElement | GroupElement;

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
  filterByDepartment?: string[];
  filterByType?: ScriptElementType[];
  filterByPriority?: PriorityLevel[];
  sortBy: 'sequence' | 'timeOffset' | 'department';
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
  element_type: ScriptElementType;
  description: string;
  cue_notes?: string;
  department_id?: string;
  time_offset_ms: number;
  duration?: number;
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
  description: string;
  cue_notes?: string;
  department_id?: string;
  location_details?: string;
  duration?: number;
  priority?: PriorityLevel;
  parent_element_id?: string;
  group_level?: number;
  isSafetyCritical?: boolean;
  safetyNotes?: string;
  custom_color?: string;
}

export interface ScriptElementUpdate {
  element_type?: ScriptElementType;
  sequence?: number;
  time_offset_ms?: number;
  description?: string;
  cue_notes?: string;
  department_id?: string;
  location_details?: string;
  duration?: number;
  priority?: PriorityLevel;
  parent_element_id?: string;
  group_level?: number;
  is_collapsed?: boolean;
  isSafetyCritical?: boolean;
  safetyNotes?: string;
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
}

// Extended base interface with all relationships populated
export interface ScriptElementFull extends Omit<ScriptElementBase, 'crewAssignments' | 'conditionalRules'> {
  equipment?: ScriptElementEquipment[];
  crewAssignments?: ScriptElementCrewAssignment[]; // Populated crew data
  conditionalRules?: ScriptElementConditionalRule[]; // Populated conditional rules
  // Keep the original crew IDs field from base
  crew_assignment_ids?: string[];
  // Keep the original conditional rule IDs from base  
  conditional_rule_ids?: string[];
}

// Type aliases for backward compatibility
export type ElementType = ScriptElementType;
