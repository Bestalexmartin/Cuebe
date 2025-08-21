// frontend/src/features/script/import/utils/departmentMappingStorage.ts

export interface DepartmentMapping {
  incomingName: string;
  mappedTo: { department_id: string; department_name: string; department_color?: string } | null;
}

const DEPARTMENT_MAPPINGS_KEY = 'script-import-department-mappings';

/**
 * Load saved department mappings from session storage
 */
export const loadSavedDepartmentMappings = (): DepartmentMapping[] => {
  try {
    const saved = sessionStorage.getItem(DEPARTMENT_MAPPINGS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.warn('Failed to load saved department mappings:', error);
    return [];
  }
};

/**
 * Save department mappings to session storage
 */
export const saveDepartmentMappings = (mappings: DepartmentMapping[]): void => {
  try {
    sessionStorage.setItem(DEPARTMENT_MAPPINGS_KEY, JSON.stringify(mappings));
  } catch (error) {
    console.warn('Failed to save department mappings:', error);
  }
};

/**
 * Clear saved department mappings from session storage
 */
export const clearSavedDepartmentMappings = (): void => {
  try {
    sessionStorage.removeItem(DEPARTMENT_MAPPINGS_KEY);
  } catch (error) {
    console.warn('Failed to clear saved department mappings:', error);
  }
};

/**
 * Check if there are any saved department mappings
 */
export const hasSavedDepartmentMappings = (): boolean => {
  const saved = loadSavedDepartmentMappings();
  return saved.length > 0;
};