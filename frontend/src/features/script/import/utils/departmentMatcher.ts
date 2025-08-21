// frontend/src/features/script/import/utils/departmentMatcher.ts

/**
 * Common department name aliases used in theater
 */
const DEPARTMENT_ALIASES: Record<string, string> = {
  // Lighting aliases
  'LX': 'Lighting',
  'Lights': 'Lighting',
  'Electric': 'Lighting',
  'Electrics': 'Lighting',
  
  // Sound aliases
  'SFX': 'Sound',
  'Audio': 'Sound',
  'QLab': 'Sound',
  'Music': 'Sound',
  
  // Props aliases
  'Props': 'Properties',
  'Prop': 'Properties',
  
  // Set/Scenic aliases
  'Set': 'Scenic',
  'Scenery': 'Scenic',
  'Deck': 'Scenic',
  
  // Costume aliases
  'Costume': 'Costumes',
  'Wardrobe': 'Costumes',
  
  // Hair & Makeup aliases
  'Hair': 'Hair & Makeup',
  'Makeup': 'Hair & Makeup',
  'H&M': 'Hair & Makeup',
  'HMU': 'Hair & Makeup',
  
  // Stage Management aliases
  'SM': 'Stage Management',
  'Stage Manager': 'Stage Management',
  'ASM': 'Stage Management',
  
  // Video/Projection aliases
  'Video': 'Video & Projection',
  'Projection': 'Video & Projection',
  'Media': 'Video & Projection',
  
  // General aliases
  'All': 'All Departments',
  'General': 'All Departments',
  'Everyone': 'All Departments'
};

export interface DepartmentMatchResult {
  matched: boolean;
  departmentName?: string;
  confidence: 'exact' | 'alias' | 'fuzzy' | 'none';
  suggestion?: string;
}

export interface Department {
  department_id: string;
  department_name: string;
  department_initials?: string;
  department_color?: string;
}

/**
 * Match a department name from CSV against existing departments
 */
export const matchDepartment = (
  csvDepartmentName: string, 
  existingDepartments: Department[]
): DepartmentMatchResult => {
  if (!csvDepartmentName || typeof csvDepartmentName !== 'string') {
    return { matched: false, confidence: 'none' };
  }

  const trimmed = csvDepartmentName.trim();
  if (trimmed === '') {
    return { matched: false, confidence: 'none' };
  }

  // 1. Exact match (case-insensitive)
  const exactMatch = existingDepartments.find(
    dept => dept.department_name.toLowerCase() === trimmed.toLowerCase()
  );
  if (exactMatch) {
    return {
      matched: true,
      departmentName: exactMatch.department_name,
      confidence: 'exact'
    };
  }

  // 2. Alias match
  const aliasKey = Object.keys(DEPARTMENT_ALIASES).find(
    alias => alias.toLowerCase() === trimmed.toLowerCase()
  );
  if (aliasKey) {
    const aliasTarget = DEPARTMENT_ALIASES[aliasKey];
    const aliasMatch = existingDepartments.find(
      dept => dept.department_name.toLowerCase() === aliasTarget.toLowerCase()
    );
    if (aliasMatch) {
      return {
        matched: true,
        departmentName: aliasMatch.department_name,
        confidence: 'alias'
      };
    }
  }

  // 3. Initials match
  const initialsMatch = existingDepartments.find(
    dept => dept.department_initials?.toLowerCase() === trimmed.toLowerCase()
  );
  if (initialsMatch) {
    return {
      matched: true,
      departmentName: initialsMatch.department_name,
      confidence: 'alias'
    };
  }

  // 4. Fuzzy match (partial string matching)
  const fuzzyMatch = existingDepartments.find(dept => {
    const deptName = dept.department_name.toLowerCase();
    const input = trimmed.toLowerCase();
    
    // Check if input is contained in department name or vice versa
    return deptName.includes(input) || input.includes(deptName);
  });
  
  if (fuzzyMatch) {
    return {
      matched: true,
      departmentName: fuzzyMatch.department_name,
      confidence: 'fuzzy'
    };
  }

  // 5. No match - suggest based on alias if available
  const suggestion = DEPARTMENT_ALIASES[trimmed] || DEPARTMENT_ALIASES[trimmed.toUpperCase()];
  
  return {
    matched: false,
    confidence: 'none',
    suggestion
  };
};

/**
 * Get all department aliases for documentation/help
 */
export const getDepartmentAliases = (): Record<string, string> => {
  return { ...DEPARTMENT_ALIASES };
};

/**
 * Validate department name and provide suggestions
 */
export const validateDepartmentName = (
  departmentName: string,
  existingDepartments: Department[]
): {
  isValid: boolean;
  matchResult: DepartmentMatchResult;
  message: string;
} => {
  if (!departmentName || departmentName.trim() === '') {
    return {
      isValid: true, // Empty is valid (optional field)
      matchResult: { matched: false, confidence: 'none' },
      message: 'No department specified'
    };
  }

  const matchResult = matchDepartment(departmentName, existingDepartments);
  
  switch (matchResult.confidence) {
    case 'exact':
      return {
        isValid: true,
        matchResult,
        message: `Matched to existing department: ${matchResult.departmentName}`
      };
      
    case 'alias':
      return {
        isValid: true,
        matchResult,
        message: `Mapped "${departmentName}" to "${matchResult.departmentName}"`
      };
      
    case 'fuzzy':
      return {
        isValid: true,
        matchResult,
        message: `Fuzzy matched to: ${matchResult.departmentName}`
      };
      
    case 'none':
    default:
      const suggestion = matchResult.suggestion 
        ? ` Did you mean "${matchResult.suggestion}"?`
        : '';
      return {
        isValid: false,
        matchResult,
        message: `Department "${departmentName}" not found.${suggestion}`
      };
  }
};

/**
 * Normalize department name for consistent display
 */
export const normalizeDepartmentName = (departmentName: string): string => {
  if (!departmentName) return '';
  
  const trimmed = departmentName.trim();
  
  // Check if it's an alias we should expand
  const alias = DEPARTMENT_ALIASES[trimmed] || DEPARTMENT_ALIASES[trimmed.toUpperCase()];
  if (alias) {
    return alias;
  }
  
  // Otherwise return cleaned up version
  return trimmed;
};