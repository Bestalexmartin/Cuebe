// frontend/src/features/script/import/types/importSchema.ts

export interface CleanScriptImport {
  script_metadata: ScriptMetadata;
  script_elements: ScriptElementImport[];
  import_metadata: ImportMetadata;
}

export interface ScriptMetadata {
  script_name: string;
  script_status: 'DRAFT' | 'COPY' | 'WORKING' | 'FINAL' | 'IMPORTED' | 'BACKUP';
  start_time?: string; // ISO 8601 format
  end_time?: string;   // ISO 8601 format
  script_notes?: string;
}

export interface ScriptElementImport {
  // Core element data
  element_type: 'CUE' | 'NOTE' | 'GROUP';
  element_name: string;
  cue_notes?: string;
  
  // Timing information
  offset_ms: number;           // Required: timing in milliseconds
  duration_ms?: number;        // Optional: duration in milliseconds
  sequence?: number;           // Optional: will be auto-calculated if not provided
  
  // Department association
  department_id?: string;      // UUID if known
  department_name?: string;    // Name for lookup/creation
  
  // Visual and location
  priority?: 'SAFETY' | 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | 'OPTIONAL';
  location_details?: string;
  custom_color?: string;       // Hex color (e.g., "#FF0000")
  
  // Grouping (for future use)
  parent_element_id?: string;
  group_level?: number;
}

export interface ImportMetadata {
  source_file: string;
  import_timestamp: string;
  total_elements: number;
  warnings?: string[];
  confidence_scores?: Record<string, number>; // Future AI integration
  has_group_hierarchy?: boolean; // Indicates if import includes group paths
}

// CSV parsing types
export interface CSVParseResult {
  success: boolean;
  data: Record<string, string>[];
  errors: string[];
  warnings: string[];
  meta: {
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    truncated: boolean;
    cursor: number;
    fields: string[];
  };
}

export interface CSVColumnMapping {
  time?: string;
  type?: string;
  element_name?: string;
  description?: string;
  department?: string;
  priority?: string;
  location?: string;
  duration?: string;
  color?: string;
  group_path?: string;
}

// Validation types
export interface ValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportValidationResult {
  isValid: boolean;
  cleanImport?: CleanScriptImport;
  errors: ValidationError[];
  warnings: ValidationError[];
}