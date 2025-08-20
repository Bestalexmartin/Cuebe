// frontend/src/validation/schemas.ts

import { ValidationRules, FormValidationConfig } from '../types/validation';

/**
 * Common validation patterns used across the application
 * Centralized to ensure consistency and easier maintenance
 */

// Core validation rules for common field types
export const CommonValidationRules = {
  // Name fields (4+ characters when not empty)
  entityName: (minLength = 4, maxLength = 100, entityType = 'Name') => ({
    required: false, // Handle required validation manually for button state
    rules: [
      {
        validator: (value: string) => {
          if (!value || value.trim().length === 0) {
            return true; // Empty is valid
          }
          return value.trim().length >= minLength;
        },
        message: `${entityType} must be at least ${minLength} characters`,
        code: 'MIN_LENGTH'
      },
      ValidationRules.maxLength(maxLength, `${entityType} must be no more than ${maxLength} characters`)
    ]
  }),

  // Short name fields (3+ characters)
  shortName: (maxLength = 50, entityType = 'Name') => ({
    required: false,
    rules: [
      {
        validator: (value: string) => {
          if (!value || value.trim().length === 0) {
            return true;
          }
          return value.trim().length >= 3;
        },
        message: `${entityType} must be at least 3 characters`,
        code: 'MIN_LENGTH'
      },
      ValidationRules.maxLength(maxLength, `${entityType} must be no more than ${maxLength} characters`)
    ]
  }),

  // Notes/description fields
  notes: (maxLength = 500) => ({
    required: false,
    rules: [
      ValidationRules.maxLength(maxLength, `Notes must be no more than ${maxLength} characters`)
    ]
  }),

  // Description fields
  description: (maxLength = 200) => ({
    required: false,
    rules: [
      ValidationRules.maxLength(maxLength, `Description must be no more than ${maxLength} characters`)
    ]
  }),

  // Color fields
  color: () => ({
    required: false,
    rules: [
      {
        validator: (value: string) => {
          if (!value || value.trim().length === 0) {
            return true;
          }
          return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
        },
        message: 'Color must be a valid hex color (e.g., #FF0000)',
        code: 'INVALID_COLOR'
      }
    ]
  }),

  // Initials fields
  initials: (maxLength = 5) => ({
    required: false,
    rules: [
      {
        validator: (value: string) => {
          if (!value || value.trim().length === 0) {
            return true;
          }
          return value.trim().length >= 1;
        },
        message: 'Initials must be at least 1 character',
        code: 'MIN_LENGTH'
      },
      ValidationRules.maxLength(maxLength, `Initials must be no more than ${maxLength} characters`),
      ValidationRules.pattern(/^[A-Z]*$/i, 'Initials must contain only letters')
    ]
  }),

  // Email fields
  email: () => ({
    required: false,
    rules: [
      ValidationRules.email('Please enter a valid email address')
    ]
  }),

  // Phone fields
  phone: () => ({
    required: false,
    rules: [
      ValidationRules.phone('Please enter a valid phone number')
    ]
  }),

  // Time offset fields (for script elements)
  timeOffset: () => ({
    required: true,
    rules: [
      {
        validator: (value: number) => Number.isFinite(value),
        message: 'Time offset must be a valid time value',
        code: 'INVALID_TIME'
      }
    ]
  }),

  // Time input fields (MM:SS format)
  timeInput: () => ({
    required: true,
    rules: [
      {
        validator: (value: string) => {
          const timePattern = /^(\d{1,2}):([0-5]\d)$/;
          return timePattern.test(value);
        },
        message: 'Time must be in MM:SS format (e.g., 5:30)',
        code: 'INVALID_TIME_FORMAT'
      }
    ]
  }),

  // Capacity/number fields
  positiveNumber: (fieldName = 'Value') => ({
    required: false,
    rules: [
      {
        validator: (value: string) => !value || (!isNaN(Number(value)) && Number(value) > 0),
        message: `${fieldName} must be a positive number`,
        code: 'INVALID_NUMBER'
      }
    ]
  }),

  // State code fields (2 characters max)
  stateCode: () => ({
    required: false,
    rules: [
      ValidationRules.maxLength(2, 'State must be no more than 2 characters')
    ]
  }),

  // City fields
  city: () => ({
    required: false,
    rules: [
      ValidationRules.maxLength(50, 'City must be no more than 50 characters')
    ]
  }),

  // Required element name (for script elements)
  requiredElementName: (minLength = 3, maxLength = 200) => ({
    required: true,
    rules: [
      ValidationRules.minLength(minLength, `Element name must be at least ${minLength} characters`),
      ValidationRules.maxLength(maxLength, `Element name must be no more than ${maxLength} characters`)
    ]
  })
};

/**
 * Domain-specific validation schemas
 * Use these for consistent validation across related forms
 */

// Show-related validation schemas
export const ShowValidationSchemas = {
  // Create/Edit Show forms
  show: {
    show_name: CommonValidationRules.entityName(4, 100, 'Show name'),
    show_notes: CommonValidationRules.notes(500)
  } as FormValidationConfig,

  // Create Script form
  script: {
    script_name: CommonValidationRules.entityName(4, 100, 'Script name')
  } as FormValidationConfig
};

// Department-related validation schemas
export const DepartmentValidationSchemas = {
  // Create/Edit Department forms
  department: {
    department_name: CommonValidationRules.shortName(50, 'Department name'),
    department_description: CommonValidationRules.description(200),
    department_color: CommonValidationRules.color(),
    department_initials: CommonValidationRules.initials(5)
  } as FormValidationConfig
};

// Venue-related validation schemas
export const VenueValidationSchemas = {
  // Create Venue modal
  venue: {
    venue_name: CommonValidationRules.entityName(4, 100, 'Venue name'),
    city: CommonValidationRules.city(),
    state: CommonValidationRules.stateCode()
  } as FormValidationConfig,

  // Edit Venue page (expanded fields)
  venueEdit: {
    venue_name: CommonValidationRules.entityName(4, 100, 'Venue name'),
    contact_email: CommonValidationRules.email(),
    contact_phone: CommonValidationRules.phone(),
    capacity: CommonValidationRules.positiveNumber('Capacity'),
    venue_notes: CommonValidationRules.notes(1000)
  } as FormValidationConfig
};

// Crew-related validation schemas
export const CrewValidationSchemas = {
  // Create Crew modal
  crew: {
    email_address: CommonValidationRules.email(),
    fullname_first: CommonValidationRules.entityName(4, 50, 'First name'),
    fullname_last: CommonValidationRules.entityName(4, 50, 'Last name')
  } as FormValidationConfig,

  // Edit Crew page (expanded fields)
  crewEdit: {
    fullname_first: CommonValidationRules.entityName(4, 50, 'First name'),
    fullname_last: CommonValidationRules.entityName(4, 50, 'Last name'),
    email_address: CommonValidationRules.email(),
    phone_number: CommonValidationRules.phone(),
    notes: CommonValidationRules.notes(1000)
  } as FormValidationConfig
};

// Script Element validation schemas
export const ScriptElementValidationSchemas = {
  // Add Script Element modal
  element: {
    element_name: CommonValidationRules.requiredElementName(3, 200),
    offset_ms: CommonValidationRules.timeOffset(),
    cue_notes: CommonValidationRules.notes(500)
  } as FormValidationConfig,

  // Duplicate Element modal  
  duplicateElement: {
    element_name: CommonValidationRules.requiredElementName(3, 200),
    timeOffsetInput: CommonValidationRules.timeInput()
  } as FormValidationConfig,

  // Script info form (used in ManageScriptPage)
  scriptInfo: {
    script_name: CommonValidationRules.entityName(4, 100, 'Script name'),
    script_notes: CommonValidationRules.notes(500)
  } as FormValidationConfig
};

// Test validation schemas
export const TestValidationSchemas = {
  // Form validation test (used in test tools)
  formTest: {
    email: {
      required: true,
      rules: [ValidationRules.email('Please enter a valid email address')]
    },
    name: {
      required: true,
      rules: [ValidationRules.minLength(4, 'Name must be at least 4 characters')]
    },
    age: {
      required: false,
      rules: [
        ValidationRules.min(18, 'Must be at least 18 years old'),
        ValidationRules.max(120, 'Age seems unrealistic')
      ]
    }
  } as FormValidationConfig
};

/**
 * Helper function to get validation config for a specific form
 * Usage: const config = getValidationSchema('show', 'script');
 */
export const getValidationSchema = (domain: string, formType: string): FormValidationConfig => {
  const schemas: Record<string, Record<string, FormValidationConfig>> = {
    show: ShowValidationSchemas,
    department: DepartmentValidationSchemas,
    venue: VenueValidationSchemas,
    crew: CrewValidationSchemas,
    scriptElement: ScriptElementValidationSchemas,
    test: TestValidationSchemas
  };

  const domainSchemas = schemas[domain];
  if (!domainSchemas) {
    throw new Error(`Unknown validation domain: ${domain}`);
  }

  const schema = domainSchemas[formType];
  if (!schema) {
    throw new Error(`Unknown form type: ${formType} in domain: ${domain}`);
  }

  return schema;
};

/**
 * Utility to merge multiple validation configs
 * Useful for forms that need validation from multiple schemas
 */
export const mergeValidationConfigs = (...configs: FormValidationConfig[]): FormValidationConfig => {
  return configs.reduce((merged, config) => ({
    ...merged,
    ...config
  }), {});
};