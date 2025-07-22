// frontend/src/types/validation.ts

export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationErrors {
  [fieldName: string]: string[];
}

export interface FormValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
  fieldErrors: FieldError[];
}

export interface ValidationRule<T = any> {
  validator: (value: T, formData?: any) => boolean | Promise<boolean>;
  message: string;
  code?: string;
}

export interface FieldValidationConfig<T = any> {
  required?: boolean;
  rules?: ValidationRule<T>[];
  dependencies?: string[]; // Other fields this validation depends on
}

export interface FormValidationConfig {
  [fieldName: string]: FieldValidationConfig;
}

// Common validation rules
export const ValidationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validator: (value) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined;
    },
    message,
    code: 'REQUIRED'
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validator: (value) => !value || value.length >= min,
    message: message || `Must be at least ${min} characters`,
    code: 'MIN_LENGTH'
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validator: (value) => !value || value.length <= max,
    message: message || `Must be no more than ${max} characters`,
    code: 'MAX_LENGTH'
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule<string> => ({
    validator: (value) => {
      if (!value) return true; // Let required rule handle empty values
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
    code: 'INVALID_EMAIL'
  }),

  phone: (message = 'Please enter a valid phone number'): ValidationRule<string> => ({
    validator: (value) => {
      if (!value) return true; // Let required rule handle empty values
      // Basic phone validation - adjust regex as needed
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
    },
    message,
    code: 'INVALID_PHONE'
  }),

  url: (message = 'Please enter a valid URL'): ValidationRule<string> => ({
    validator: (value) => {
      if (!value) return true; // Let required rule handle empty values
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
    code: 'INVALID_URL'
  }),

  min: (min: number, message?: string): ValidationRule<number> => ({
    validator: (value) => value === null || value === undefined || value >= min,
    message: message || `Must be at least ${min}`,
    code: 'MIN_VALUE'
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validator: (value) => value === null || value === undefined || value <= max,
    message: message || `Must be no more than ${max}`,
    code: 'MAX_VALUE'
  }),

  pattern: (pattern: RegExp, message = 'Invalid format'): ValidationRule<string> => ({
    validator: (value) => !value || pattern.test(value),
    message,
    code: 'PATTERN_MISMATCH'
  }),

  custom: <T>(
    validator: (value: T, formData?: any) => boolean | Promise<boolean>,
    message: string,
    code?: string
  ): ValidationRule<T> => ({
    validator,
    message,
    code: code || 'CUSTOM_VALIDATION'
  })
};

// Helper function to parse backend validation errors
export const parseBackendValidationErrors = (error: any): FieldError[] => {
  const fieldErrors: FieldError[] = [];

  // Handle different backend error formats
  if (error.details && Array.isArray(error.details)) {
    // FastAPI/Pydantic validation errors
    error.details.forEach((detail: any) => {
      if (detail.loc && detail.msg) {
        const field = Array.isArray(detail.loc) ? detail.loc.join('.') : detail.loc;
        fieldErrors.push({
          field,
          message: detail.msg,
          code: detail.type
        });
      }
    });
  } else if (error.errors && typeof error.errors === 'object') {
    // Generic field errors object
    Object.entries(error.errors).forEach(([field, messages]) => {
      if (Array.isArray(messages)) {
        messages.forEach((message: string) => {
          fieldErrors.push({ field, message });
        });
      } else if (typeof messages === 'string') {
        fieldErrors.push({ field, message: messages });
      }
    });
  } else if (error.fieldErrors && Array.isArray(error.fieldErrors)) {
    // Already in the correct format
    return error.fieldErrors;
  }

  return fieldErrors;
};