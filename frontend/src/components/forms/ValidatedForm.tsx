// frontend/src/components/forms/ValidatedForm.tsx

import React, { ReactNode } from 'react';
import { VStack, StackProps } from '@chakra-ui/react';
import { useValidatedForm } from '../../hooks/useValidatedForm';
import { FormValidationConfig } from '../../types/validation';
import { getValidationSchema } from '../../validation/schemas';

interface ValidatedFormProps<T extends Record<string, any>> extends Omit<StackProps, 'onSubmit'> {
  // Form configuration
  initialData: T;
  validationDomain?: string;
  validationFormType?: string;
  customValidationConfig?: FormValidationConfig;
  
  // Form options
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showFieldErrorsInToast?: boolean;
  
  // Form content and actions
  children: (form: ReturnType<typeof useValidatedForm<T>>) => ReactNode;
  onSubmit?: (data: T, form: ReturnType<typeof useValidatedForm<T>>) => Promise<void> | void;
  
  // Container styling
  spacing?: StackProps['spacing'];
}

/**
 * Reusable form component with built-in validation
 * 
 * Usage examples:
 * 
 * // Using domain-based validation
 * <ValidatedForm
 *   initialData={{ script_name: '', script_status: 'DRAFT' }}
 *   validationDomain="show"
 *   validationFormType="script"
 *   onSubmit={handleSubmit}
 * >
 *   {(form) => (
 *     <>
 *       <FormInput form={form} name="script_name" label="Script Name" />
 *       <FormSelect form={form} name="script_status" label="Status" />
 *     </>
 *   )}
 * </ValidatedForm>
 * 
 * // Using custom validation
 * <ValidatedForm
 *   initialData={initialData}
 *   customValidationConfig={customConfig}
 *   onSubmit={handleSubmit}
 * >
 *   {(form) => <MyFormFields form={form} />}
 * </ValidatedForm>
 */
export function ValidatedForm<T extends Record<string, any>>({
  initialData,
  validationDomain,
  validationFormType,
  customValidationConfig,
  validateOnChange = false,
  validateOnBlur = true,
  showFieldErrorsInToast = false,
  children,
  onSubmit,
  spacing = 4,
  ...stackProps
}: ValidatedFormProps<T>) {
  
  // Get validation configuration
  const getValidationConfig = (): FormValidationConfig => {
    if (customValidationConfig) {
      return customValidationConfig;
    }
    
    if (validationDomain && validationFormType) {
      return getValidationSchema(validationDomain, validationFormType);
    }
    
    // No validation if neither custom config nor domain/type provided
    return {};
  };

  const validationConfig = getValidationConfig();

  // Initialize form with validation
  const form = useValidatedForm<T>(initialData, {
    validationConfig,
    validateOnChange,
    validateOnBlur,
    showFieldErrorsInToast
  });

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (onSubmit) {
      await onSubmit(form.formData, form);
    }
  };

  return (
    <VStack
      as="form"
      onSubmit={handleSubmit}
      spacing={spacing}
      align="stretch"
      {...stackProps}
    >
      {children(form)}
    </VStack>
  );
}

/**
 * Hook version for more control over form rendering
 * Useful when you need the form logic but want full control over the JSX structure
 */
export function useValidatedFormSchema<T extends Record<string, any>>(
  initialData: T,
  validationDomain?: string,
  validationFormType?: string,
  customValidationConfig?: FormValidationConfig,
  options?: {
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
    showFieldErrorsInToast?: boolean;
  }
) {
  const getValidationConfig = (): FormValidationConfig => {
    if (customValidationConfig) {
      return customValidationConfig;
    }
    
    if (validationDomain && validationFormType) {
      return getValidationSchema(validationDomain, validationFormType);
    }
    
    return {};
  };

  const validationConfig = getValidationConfig();

  return useValidatedForm<T>(initialData, {
    validationConfig,
    validateOnChange: options?.validateOnChange ?? false,
    validateOnBlur: options?.validateOnBlur ?? true,
    showFieldErrorsInToast: options?.showFieldErrorsInToast ?? false
  });
}