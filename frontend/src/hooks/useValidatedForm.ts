// frontend/src/hooks/useValidatedForm.ts

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useEnhancedToast } from '../utils/toastUtils';
import { useErrorHandler } from './useErrorHandler';
import { 
  FormValidationConfig, 
  ValidationErrors, 
  FieldError, 
  FormValidationResult,
  parseBackendValidationErrors 
} from '../types/validation';

export interface FormData {
  [key: string]: any;
}

export interface UseValidatedFormOptions {
  validationConfig?: FormValidationConfig;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showFieldErrorsInToast?: boolean;
}

export interface UseValidatedFormReturn<T extends FormData> {
  // Form data
  formData: T;
  setFormData: (data: T | ((prev: T) => T)) => void;
  updateField: (field: keyof T, value: any) => void;
  
  // Validation
  errors: ValidationErrors;
  fieldErrors: FieldError[];
  isValid: boolean;
  validate: (fields?: string[]) => Promise<FormValidationResult>;
  validateField: (field: string) => Promise<string[]>;
  clearErrors: (fields?: string[]) => void;
  
  // Form submission
  isSubmitting: boolean;
  submitForm: (
    endpoint: string,
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    successMessage?: string,
    customData?: FormData | null
  ) => Promise<any>;
  
  // Utilities
  resetForm: () => void;
  getFieldError: (field: string) => string | undefined;
  hasFieldError: (field: string) => boolean;
  isFieldTouched: (field: string) => boolean;
  touchField: (field: string) => void;
}

export const useValidatedForm = <T extends FormData>(
  initialState: T = {} as T,
  options: UseValidatedFormOptions = {}
): UseValidatedFormReturn<T> => {
  const {
    validationConfig = {},
    validateOnChange = false,
    validateOnBlur = true,
    showFieldErrorsInToast = true
  } = options;

  const [formData, setFormData] = useState<T>(initialState);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const { getToken } = useAuth();
  const { showSuccess, showError } = useEnhancedToast();
  const { handleError } = useErrorHandler();

  // Validate a single field
  const validateField = useCallback(async (field: string, newValue?: any): Promise<string[]> => {
    const config = validationConfig[field];
    if (!config) return [];

    const value = newValue !== undefined ? newValue : formData[field as keyof T];
    const fieldErrors: string[] = [];

    // Check required
    if (config.required) {
      const isEmpty = value === null || value === undefined || 
        (typeof value === 'string' && value.trim().length === 0) ||
        (Array.isArray(value) && value.length === 0);
      
      if (isEmpty) {
        fieldErrors.push('This field is required');
        return fieldErrors; // Skip other validations if required fails
      }
    }

    // Check custom rules
    if (config.rules) {
      for (const rule of config.rules) {
        try {
          const isValid = await rule.validator(value, formData);
          if (!isValid) {
            fieldErrors.push(rule.message);
          }
        } catch (error) {
          console.error(`Validation error for field ${field}:`, error);
          fieldErrors.push('Validation error occurred');
        }
      }
    }

    return fieldErrors;
  }, [formData, validationConfig]);

  // Validate entire form with optional new values for specific fields
  const validate = useCallback(async (fields?: string[], fieldValues?: Record<string, any>): Promise<FormValidationResult> => {
    const fieldsToValidate = fields || Object.keys(validationConfig);
    const newErrors: ValidationErrors = { ...errors };
    const newFieldErrors: FieldError[] = [];

    // Clear errors for fields being validated
    fieldsToValidate.forEach(field => {
      delete newErrors[field];
    });

    // Validate each field
    for (const field of fieldsToValidate) {
      const newValue = fieldValues?.[field];
      const fieldErrorMessages = await validateField(field, newValue);
      if (fieldErrorMessages.length > 0) {
        newErrors[field] = fieldErrorMessages;
        fieldErrorMessages.forEach(message => {
          newFieldErrors.push({ field, message });
        });
      }
    }

    setErrors(newErrors);
    setFieldErrors(newFieldErrors);

    const isValid = Object.keys(newErrors).length === 0;
    return {
      isValid,
      errors: newErrors,
      fieldErrors: newFieldErrors
    };
  }, [errors, validationConfig, validateField]);

  // Update field value
  const updateField = useCallback(async (field: keyof T, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Validate on change if enabled - pass new value directly to avoid timing issues
    if (validateOnChange && validationConfig[field as string]) {
      await validate([field as string], { [field as string]: value });
    }
  }, [validateOnChange, validationConfig, validate]);

  // Touch field (mark as interacted with)
  const touchField = useCallback((field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
    
    // Validate on blur if enabled
    if (validateOnBlur && validationConfig[field]) {
      validate([field]);
    }
  }, [validateOnBlur, validationConfig, validate]);

  // Clear errors
  const clearErrors = useCallback((fields?: string[]) => {
    if (fields) {
      setErrors(prev => {
        const newErrors = { ...prev };
        fields.forEach(field => delete newErrors[field]);
        return newErrors;
      });
      setFieldErrors(prev => prev.filter(error => !fields.includes(error.field)));
    } else {
      setErrors({});
      setFieldErrors([]);
    }
  }, []);

  // Submit form with validation
  const submitForm = useCallback(async (
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'POST',
    successMessage: string = 'Operation successful',
    customData: FormData | null = null
  ): Promise<any> => {
    setIsSubmitting(true);

    try {
      // Validate form before submission
      const validationResult = await validate();
      if (!validationResult.isValid) {
        if (showFieldErrorsInToast) {
          const errorMessage = `Please fix ${validationResult.fieldErrors.length} validation error(s)`;
          showError(errorMessage);
        }
        throw new Error('Form validation failed');
      }

      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const dataToSubmit = customData || formData;

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSubmit)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Parse backend validation errors
        const backendFieldErrors = parseBackendValidationErrors(errorData);
        if (backendFieldErrors.length > 0) {
          // Map backend errors to our error format
          const backendErrors: ValidationErrors = {};
          backendFieldErrors.forEach(error => {
            if (!backendErrors[error.field]) {
              backendErrors[error.field] = [];
            }
            backendErrors[error.field].push(error.message);
          });
          
          setErrors(prev => ({ ...prev, ...backendErrors }));
          setFieldErrors(prev => [...prev, ...backendFieldErrors]);

          if (showFieldErrorsInToast) {
            showError(`Server validation failed: ${backendFieldErrors.length} error(s)`);
          }
          
          throw new Error('Server validation failed');
        }

        // Generic error
        throw new Error(errorData.message || errorData.detail || `Failed to ${method.toLowerCase()} resource`);
      }

      const result = await response.json();
      
      showSuccess('Success', successMessage);
      
      return result;
    } catch (error) {
      if (error instanceof Error && error.message !== 'Form validation failed' && error.message !== 'Server validation failed') {
        // Handle other errors through error handler
        await handleError(error, `Form submission to ${endpoint}`, { suppressToast: false });
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validate, getToken, showSuccess, showError, handleError, showFieldErrorsInToast]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData(initialState);
    setErrors({});
    setFieldErrors([]);
    setIsSubmitting(false);
    setTouchedFields(new Set());
  }, [initialState]);

  // Helper functions
  const getFieldError = useCallback((field: string): string | undefined => {
    return errors[field]?.[0];
  }, [errors]);

  const hasFieldError = useCallback((field: string): boolean => {
    return !!(errors[field] && errors[field].length > 0);
  }, [errors]);

  const isFieldTouched = useCallback((field: string): boolean => {
    return touchedFields.has(field);
  }, [touchedFields]);

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  return useMemo(() => ({
    // Form data
    formData,
    setFormData,
    updateField,
    
    // Validation
    errors,
    fieldErrors,
    isValid,
    validate,
    validateField,
    clearErrors,
    
    // Form submission
    isSubmitting,
    submitForm,
    
    // Utilities
    resetForm,
    getFieldError,
    hasFieldError,
    isFieldTouched,
    touchField
  }), [
    formData,
    setFormData,
    updateField,
    errors,
    fieldErrors,
    isValid,
    validate,
    validateField,
    clearErrors,
    isSubmitting,
    submitForm,
    resetForm,
    getFieldError,
    hasFieldError,
    isFieldTouched,
    touchField
  ]);
};