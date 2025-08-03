// frontend/src/hooks/useFormValidation.ts

import { useMemo } from 'react';
import { UseValidatedFormReturn } from './useValidatedForm';

interface FormData {
  [key: string]: any;
}

export interface UseFormValidationOptions {
  requiredFields: string[];
  customValidation?: (formData: FormData) => boolean;
  allowEmptyOptionalFields?: boolean;
}

export interface UseFormValidationReturn {
  isFormValid: boolean;
  hasRequiredFields: boolean;
  hasValidationErrors: boolean;
  canSubmit: boolean;
}

export const useFormValidation = <T extends FormData>(
  form: UseValidatedFormReturn<T>,
  options: UseFormValidationOptions
): UseFormValidationReturn => {
  const { 
    requiredFields, 
    customValidation, 
    allowEmptyOptionalFields = true 
  } = options;

  const validationResult = useMemo(() => {
    // Check if all required fields have values
    const hasRequiredFields = requiredFields.every(field => {
      const value = form.formData[field];
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim() !== '';
      if (Array.isArray(value)) return value.length > 0;
      return true;
    });

    // Check if there are any field validation errors
    const hasValidationErrors = form.fieldErrors.length > 0;

    // Check custom validation if provided
    const passesCustomValidation = customValidation 
      ? customValidation(form.formData)
      : true;

    // Overall form validity
    const isFormValid = hasRequiredFields && 
                       !hasValidationErrors && 
                       passesCustomValidation;

    // Can submit (same as isFormValid but explicit for clarity)
    const canSubmit = isFormValid && !form.isSubmitting;

    return {
      isFormValid,
      hasRequiredFields,
      hasValidationErrors,
      canSubmit
    };
  }, [
    form.formData, 
    form.fieldErrors, 
    form.isSubmitting,
    requiredFields, 
    customValidation
  ]);

  return validationResult;
};

// Helper hook for common form validation patterns
export const useStandardFormValidation = <T extends FormData>(
  form: UseValidatedFormReturn<T>,
  requiredFields: string[]
) => {
  return useFormValidation(form, { requiredFields });
};

// Helper hook for forms with additional venue creation logic
export const useVenueFormValidation = <T extends FormData & { venue_name: string }>(
  form: UseValidatedFormReturn<T>,
  isAddingNewVenue: boolean,
  newVenueName: string
) => {
  return useFormValidation(form, {
    requiredFields: ['venue_name'],
    customValidation: (formData) => {
      // If adding new venue, ensure newVenueName is provided
      if (isAddingNewVenue) {
        return newVenueName.trim() !== '';
      }
      return true;
    }
  });
};