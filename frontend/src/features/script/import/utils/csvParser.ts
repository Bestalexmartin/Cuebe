// frontend/src/features/script/import/utils/csvParser.ts

import Papa from 'papaparse';
import { 
  CSVParseResult, 
  CSVColumnMapping, 
  CleanScriptImport, 
  ScriptElementImport,
  ValidationError,
  ImportValidationResult
} from '../types/importSchema';
import { parseTimeToMs } from '../../../../utils/timeUtils';
import { matchDepartment, type Department } from './departmentMatcher';

/**
 * Papa Parse configuration optimized for theater script CSVs
 */
const PAPA_CONFIG: Papa.ParseConfig = {
  header: true,                    // Use first row as column names
  skipEmptyLines: 'greedy',        // Skip completely empty rows
  dynamicTyping: false,            // Keep as strings for custom parsing
  delimitersToGuess: [',', ';', '\t'], // Common export formats
  fastMode: false,                 // More careful parsing
  preview: 0                       // Parse entire file
};

/**
 * Default column mappings for common CSV formats
 */
const DEFAULT_COLUMN_MAPPINGS: Record<string, keyof CSVColumnMapping> = {
  // Time columns
  'time': 'time',
  'timing': 'time',
  'offset': 'time',
  'start': 'time',
  'start_time': 'time',
  'cue_time': 'time',
  
  // Type columns
  'type': 'type',
  'element_type': 'type',
  'cue_type': 'type',
  'kind': 'type',
  
  // Name columns
  'name': 'element_name',
  'element_name': 'element_name',
  'cue_name': 'element_name',
  'title': 'element_name',
  'label': 'element_name',
  
  // Description columns
  'description': 'description',
  'desc': 'description',
  'notes': 'description',
  'cue_notes': 'description',
  'details': 'description',
  'content': 'description',
  
  // Department columns
  'department': 'department',
  'dept': 'department',
  'department_name': 'department',
  'team': 'department',
  'dept_group': 'department',
  
  // Priority columns
  'priority': 'priority',
  'importance': 'priority',
  'level': 'priority',
  
  // Location columns
  'location': 'location',
  'area': 'location',
  'position': 'location',
  'where': 'location',
  
  // Duration columns
  'duration': 'duration',
  'length': 'duration',
  'fade_time': 'duration',
  'fade': 'duration',
  
  // Color columns
  'color': 'color',
  'colour': 'color',
  'custom_color': 'color',
  
  // Group path columns  
  'group_path': 'group_path',
  'group': 'group_path',
  'hierarchy': 'group_path',
  'path': 'group_path',
  'section': 'group_path'
};

/**
 * Parse CSV file using Papa Parse
 */
export const parseCSVFile = (file: File): Promise<CSVParseResult> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      ...PAPA_CONFIG,
      complete: (results) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Convert Papa Parse errors to our format
        results.errors.forEach(error => {
          if (error.type === 'Quotes') {
            warnings.push(`Row ${error.row}: ${error.message}`);
          } else {
            errors.push(`Row ${error.row || 'unknown'}: ${error.message}`);
          }
        });
        
        // Validate we have data
        if (!results.data || results.data.length === 0) {
          errors.push('No data found in CSV file');
        }
        
        // Check for required columns
        if (results.meta.fields && results.meta.fields.length === 0) {
          errors.push('No column headers found');
        }
        
        resolve({
          success: errors.length === 0,
          data: results.data as Record<string, string>[],
          errors,
          warnings,
          meta: {
            delimiter: results.meta.delimiter,
            linebreak: results.meta.linebreak,
            aborted: results.meta.aborted,
            truncated: results.meta.truncated,
            cursor: results.meta.cursor,
            fields: results.meta.fields || []
          }
        });
      },
      error: (error) => {
        resolve({
          success: false,
          data: [],
          errors: [`Failed to parse CSV: ${error.message}`],
          warnings: [],
          meta: {
            delimiter: '',
            linebreak: '',
            aborted: true,
            truncated: false,
            cursor: 0,
            fields: []
          }
        });
      }
    });
  });
};

/**
 * Auto-detect column mappings based on headers
 */
export const detectColumnMappings = (headers: string[]): CSVColumnMapping => {
  const mappings: CSVColumnMapping = {};
  
  headers.forEach(header => {
    const normalized = header.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    const mappingKey = DEFAULT_COLUMN_MAPPINGS[normalized];
    
    if (mappingKey && !mappings[mappingKey]) {
      mappings[mappingKey] = header;
    }
  });
  
  return mappings;
};

/**
 * Validate element type
 */
const validateElementType = (typeString: string): { isValid: boolean; normalizedType?: string; error?: string } => {
  if (!typeString || typeof typeString !== 'string') {
    return { isValid: false, error: 'Element type is required' };
  }
  
  const normalized = typeString.toUpperCase().trim();
  const validTypes = ['CUE', 'NOTE', 'GROUP'];
  
  // Direct match
  if (validTypes.includes(normalized)) {
    return { isValid: true, normalizedType: normalized };
  }
  
  // Common aliases
  const aliases: Record<string, string> = {
    'Q': 'CUE',
    'QUEUE': 'CUE',
    'LIGHT': 'CUE',
    'LIGHTING': 'CUE',
    'SOUND': 'CUE',
    'SFX': 'CUE',
    'COMMENT': 'NOTE',
    'REMINDER': 'NOTE',
    'INFO': 'NOTE',
    'FOLDER': 'GROUP',
    'SECTION': 'GROUP'
  };
  
  const aliasMatch = aliases[normalized];
  if (aliasMatch) {
    return { isValid: true, normalizedType: aliasMatch };
  }
  
  return { 
    isValid: false, 
    error: `Invalid element type "${typeString}". Valid types: ${validTypes.join(', ')}` 
  };
};

/**
 * Validate priority level
 */
const validatePriority = (priorityString: string): { isValid: boolean; normalizedPriority?: string; error?: string } => {
  if (!priorityString || typeof priorityString !== 'string') {
    return { isValid: true, normalizedPriority: 'NORMAL' }; // Default to NORMAL
  }
  
  const normalized = priorityString.toUpperCase().trim();
  const validPriorities = ['SAFETY', 'CRITICAL', 'HIGH', 'NORMAL', 'LOW', 'OPTIONAL'];
  
  if (validPriorities.includes(normalized)) {
    return { isValid: true, normalizedPriority: normalized };
  }
  
  // Common aliases
  const aliases: Record<string, string> = {
    'URGENT': 'CRITICAL',
    'IMPORTANT': 'HIGH',
    'MEDIUM': 'NORMAL',
    'MED': 'NORMAL',
    'STANDARD': 'NORMAL',
    'MINOR': 'LOW',
    'SKIP': 'OPTIONAL',
    'MAYBE': 'OPTIONAL'
  };
  
  const aliasMatch = aliases[normalized];
  if (aliasMatch) {
    return { isValid: true, normalizedPriority: aliasMatch };
  }
  
  return { 
    isValid: false, 
    error: `Invalid priority "${priorityString}". Valid priorities: ${validPriorities.join(', ')}` 
  };
};

/**
 * Validate hex color
 */
const validateColor = (colorString: string): { isValid: boolean; normalizedColor?: string; error?: string } => {
  if (!colorString || typeof colorString !== 'string') {
    return { isValid: true }; // Color is optional
  }
  
  const trimmed = colorString.trim();
  if (trimmed === '') {
    return { isValid: true };
  }
  
  // Add # if missing
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  
  // Validate hex format (support 3 or 6 digits)
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (hexPattern.test(withHash)) {
    // Expand 3-digit hex to 6-digit to satisfy backend validator
    const hex = withHash.toUpperCase();
    if (hex.length === 4) {
      const r = hex[1];
      const g = hex[2];
      const b = hex[3];
      return { isValid: true, normalizedColor: `#${r}${r}${g}${g}${b}${b}` };
    }
    return { isValid: true, normalizedColor: hex };
  }
  
  return { 
    isValid: false, 
    error: `Invalid color format "${colorString}". Use hex format like #FF0000 or FF0000` 
  };
};

/**
 * Parse group path into hierarchy levels
 * E.g., "Act 1/Scene 1" -> ["Act 1", "Scene 1"]
 */
const parseGroupPath = (groupPathString: string): string[] => {
  if (!groupPathString || typeof groupPathString !== 'string') {
    return [];
  }
  
  return groupPathString
    .split('/')
    .map(part => part.trim())
    .filter(part => part.length > 0);
};

/**
 * Generate default group color based on nesting level
 * blue.400 -> blue.600 -> blue.800 -> blue.900
 */
const getGroupColor = (groupLevel: number): string => {
  const baseColorValue = 400;
  const increment = 200;
  const maxColorValue = 900;
  
  const colorValue = Math.min(baseColorValue + (groupLevel * increment), maxColorValue);
  
  // Map color values to Chakra UI blue colors
  const colorMap: Record<number, string> = {
    400: '#3182CE', // blue.400
    600: '#2C5282', // blue.600  
    800: '#1A365D', // blue.800
    900: '#1A202C'  // blue.900
  };
  
  return colorMap[colorValue] || colorMap[900];
};

/**
 * Generate group elements for a hierarchy path
 * Returns array of GROUP elements that need to be created
 * Note: parent_element_id will be resolved during import by the backend
 */
const generateGroupElements = (
  groupPath: string[], 
  baseOffset: number,
  existingGroups: Map<string, ScriptElementImport>
): ScriptElementImport[] => {
  const groupElements: ScriptElementImport[] = [];
  
  for (let i = 0; i < groupPath.length; i++) {
    const currentPath = groupPath.slice(0, i + 1).join('/');
    const groupName = groupPath[i];
    
    // Skip if this group already exists
    if (existingGroups.has(currentPath)) {
      continue;
    }
    
    // Create group element with color based on nesting level
    const groupElement: ScriptElementImport = {
      element_type: 'GROUP',
      element_name: groupName,
      offset_ms: baseOffset, // Groups inherit timing from context
      group_level: i,
      custom_color: getGroupColor(i)
      // parent_element_id will be resolved by backend after all elements are created
      // sequence will be assigned during processing
    };
    
    groupElements.push(groupElement);
    
    // Add to existing groups map for next iteration
    existingGroups.set(currentPath, groupElement);
  }
  
  return groupElements;
};

/**
 * Convert CSV data to CleanScriptImport format
 */
export const convertCSVToCleanImport = (
  csvData: Record<string, string>[],
  columnMappings: CSVColumnMapping,
  scriptMetadata: {
    script_name: string;
    script_status: 'DRAFT' | 'COPY' | 'WORKING' | 'FINAL' | 'IMPORTED' | 'BACKUP';
    start_time?: string;
    end_time?: string;
    script_notes?: string;
  },
  existingDepartments: Department[] = [],
  sourceFileName: string
): ImportValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const elements: ScriptElementImport[] = [];
  const existingGroups = new Map<string, ScriptElementImport>();
  
  csvData.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because index is 0-based and we skip header row
    
    // Get values from mapped columns
    const timeValue = columnMappings.time ? row[columnMappings.time] : '';
    const typeValue = columnMappings.type ? row[columnMappings.type] : '';
    const nameValue = columnMappings.element_name ? row[columnMappings.element_name] : '';
    const descriptionValue = columnMappings.description ? row[columnMappings.description] : '';
    const departmentValue = columnMappings.department ? row[columnMappings.department] : '';
    const priorityValue = columnMappings.priority ? row[columnMappings.priority] : '';
    const locationValue = columnMappings.location ? row[columnMappings.location] : '';
    const durationValue = columnMappings.duration ? row[columnMappings.duration] : '';
    const colorValue = columnMappings.color ? row[columnMappings.color] : '';
    const groupPathValue = columnMappings.group_path ? row[columnMappings.group_path] : '';
    
    
    // Skip completely empty rows
    const hasAnyData = Object.values(row).some(value => value && value.trim() !== '');
    if (!hasAnyData) {
      return;
    }
    
    // Validate required fields
    if (!nameValue || nameValue.trim() === '') {
      errors.push({
        row: rowNumber,
        field: 'element_name',
        value: nameValue,
        message: 'Element name is required',
        severity: 'error'
      });
      return; // Skip this row
    }
    
    // Validate and convert time
    const timeMs = parseTimeToMs(timeValue);
    if (timeMs === null) {
      errors.push({
        row: rowNumber,
        field: 'time',
        value: timeValue,
        message: 'Invalid time format',
        severity: 'error'
      });
      return; // Skip this row
    }
    
    // Validate element type
    const typeResult = validateElementType(typeValue);
    if (!typeResult.isValid) {
      errors.push({
        row: rowNumber,
        field: 'type',
        value: typeValue,
        message: typeResult.error || 'Invalid element type',
        severity: 'error'
      });
      return; // Skip this row
    }
    
    // Validate priority (warnings only)
    const priorityResult = validatePriority(priorityValue);
    if (!priorityResult.isValid) {
      warnings.push({
        row: rowNumber,
        field: 'priority',
        value: priorityValue,
        message: priorityResult.error || 'Invalid priority, defaulting to NORMAL',
        severity: 'warning'
      });
    }
    
    // Validate color (warnings only)
    const colorResult = validateColor(colorValue);
    if (!colorResult.isValid) {
      warnings.push({
        row: rowNumber,
        field: 'color',
        value: colorValue,
        message: colorResult.error || 'Invalid color format',
        severity: 'warning'
      });
    }
    
    // Validate duration if provided
    let durationMs: number | undefined;
    if (durationValue && durationValue.trim() !== '') {
      const parsedDurationMs = parseTimeToMs(durationValue);
      if (parsedDurationMs === null) {
        warnings.push({
          row: rowNumber,
          field: 'duration',
          value: durationValue,
          message: 'Invalid duration format, ignoring',
          severity: 'warning'
        });
      } else {
        durationMs = parsedDurationMs;
      }
    }
    
    // Match department (skip for NOTEs and GROUPs - they don't have departments)
    let departmentName: string | undefined;
    if (typeResult.normalizedType !== 'NOTE' && typeResult.normalizedType !== 'GROUP' && departmentValue && departmentValue.trim() !== '') {
      const departmentResult = matchDepartment(departmentValue, existingDepartments);
      if (departmentResult.matched) {
        departmentName = departmentResult.departmentName;
        if (departmentResult.confidence === 'fuzzy') {
          warnings.push({
            row: rowNumber,
            field: 'department',
            value: departmentValue,
            message: `Fuzzy matched to "${departmentName}"`,
            severity: 'warning'
          });
        }
      } else {
        departmentName = departmentValue.trim();
        // Note: No warning needed here since unmapped departments will be handled 
        // in the department mapping step of the import workflow
      }
    }
    // NOTEs and GROUPs with department data are silently ignored - no warning needed
    
    // Process group path if provided
    const groupPath = parseGroupPath(groupPathValue);
    let groupLevel = 0;
    
    // For GROUP elements, always process them even if Group Path is empty
    if (typeResult.normalizedType === 'GROUP') {
      // For explicit GROUP elements, use the element name as the group path
      // This handles cases where Group Path column is empty for GROUP rows
      const groupName = nameValue.trim();
      const actualGroupPath = groupPath.length > 0 ? groupPath : [groupName];
      groupLevel = actualGroupPath.length - 1; // Groups are one level higher than their children
      
      // Add this group to the existing groups map using the actual group name
      const fullPath = actualGroupPath.join('/');
      const groupElement: ScriptElementImport = {
        element_type: 'GROUP',
        element_name: groupName,
        offset_ms: timeMs,
        group_level: groupLevel
      };
      existingGroups.set(fullPath, groupElement);
    } else if (groupPath.length > 0) {
      // Only auto-generate groups for non-GROUP elements that have a group path
      // Generate any missing GROUP elements
      const groupElements = generateGroupElements(groupPath, timeMs, existingGroups);
      
      // Add group elements to the results (they'll be inserted before this element)
      groupElements.forEach(groupElement => {
        elements.push(groupElement);
      });
      
      // Set this element's group level
      groupLevel = groupPath.length;
    }
    
    // Determine custom color - use provided color, or default for GROUP elements
    let customColor = colorResult.normalizedColor;
    if (typeResult.normalizedType === 'GROUP' && !customColor) {
      customColor = getGroupColor(groupLevel);
    }
    
    // Create element
    const element: ScriptElementImport = {
      element_type: typeResult.normalizedType as 'CUE' | 'NOTE' | 'GROUP',
      element_name: nameValue.trim(),
      offset_ms: timeMs,
      cue_notes: descriptionValue?.trim() || undefined,
      department_name: departmentName,
      priority: (priorityResult.normalizedPriority as 'SAFETY' | 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | 'OPTIONAL') || 'NORMAL',
      location_details: locationValue?.trim() || undefined,
      duration_ms: durationMs,
      custom_color: customColor,
      group_level: groupLevel
      // parent_element_id will be resolved by backend based on group hierarchy
      // sequence will be assigned after all elements are processed
    };
    
    elements.push(element);
  });
  
  // Sort elements to ensure group children follow their parents
  // This ensures proper parent-child relationships in the backend
  const sortedElements = [...elements].sort((a, b) => {
    // First sort by offset time
    if (a.offset_ms !== b.offset_ms) {
      return a.offset_ms - b.offset_ms;
    }
    
    // For elements at the same time, ensure GROUP elements come before their children
    if (a.element_type === 'GROUP' && b.element_type !== 'GROUP' && (b.group_level ?? 0) > 0) {
      return -1; // GROUP comes first
    }
    if (b.element_type === 'GROUP' && a.element_type !== 'GROUP' && (a.group_level ?? 0) > 0) {
      return 1; // GROUP comes first
    }
    
    // For non-group elements, higher group_level (more nested) comes after lower group_level
    const aLevel = a.group_level ?? 0;
    const bLevel = b.group_level ?? 0;
    if (aLevel !== bLevel) {
      return aLevel - bLevel;
    }
    
    // Maintain original processing order for elements at same level
    return 0;
  });
  
  // Assign sequence numbers to all elements in sorted order
  sortedElements.forEach((element, index) => {
    element.sequence = index + 1;
  });
  
  // Check if any group hierarchy was detected
  const hasGroupHierarchy = sortedElements.some(e => (e.group_level ?? 0) > 0 || e.element_type === 'GROUP');
  
  // Create clean import object
  const cleanImport: CleanScriptImport = {
    script_metadata: scriptMetadata,
    script_elements: sortedElements,
    import_metadata: {
      source_file: sourceFileName,
      import_timestamp: new Date().toISOString(),
      total_elements: sortedElements.length,
      warnings: warnings.map(w => w.message),
      has_group_hierarchy: hasGroupHierarchy
    }
  };
  
  return {
    isValid: errors.length === 0,
    cleanImport: errors.length === 0 ? cleanImport : undefined,
    errors,
    warnings
  };
};

/**
 * Get column mapping suggestions based on CSV headers
 */
export const getColumnMappingSuggestions = (headers: string[]): { 
  suggestions: CSVColumnMapping; 
  confidence: Record<keyof CSVColumnMapping, number>;
} => {
  const suggestions = detectColumnMappings(headers);
  const confidence: Record<keyof CSVColumnMapping, number> = {
    time: 0,
    type: 0, 
    element_name: 0,
    description: 0,
    department: 0,
    priority: 0,
    location: 0,
    duration: 0,
    color: 0,
    group_path: 0
  };
  
  // Calculate confidence scores based on exact vs fuzzy matches
  Object.entries(suggestions).forEach(([key, value]) => {
    if (value) {
      const normalized = value.toLowerCase();
      const exactMatch = Object.keys(DEFAULT_COLUMN_MAPPINGS).includes(normalized);
      confidence[key as keyof CSVColumnMapping] = exactMatch ? 1.0 : 0.7;
    }
  });
  
  return { suggestions, confidence };
};
