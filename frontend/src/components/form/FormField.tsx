// frontend/src/components/form/FormField.tsx

import React from 'react';
import { UseValidatedFormReturn, FormData } from '../../hooks/useValidatedForm';
import {
  ValidatedInput,
  ValidatedTextarea,
  ValidatedSelect,
  ValidatedNumberInput,
  ValidatedSwitch,
  ValidatedCheckbox,
  ValidatedRadioGroup
} from './ValidatedFormField';

interface BaseFormFieldProps<T extends FormData> {
  form: UseValidatedFormReturn<T>;
  name: keyof T;
  label?: string;
  helperText?: string;
  isRequired?: boolean;
}

interface FormInputProps<T extends FormData> extends BaseFormFieldProps<T> {
  type?: 'text' | 'email' | 'password' | 'url' | 'tel' | 'datetime-local';
  placeholder?: string;
  showFieldError?: boolean;
}

interface FormTextareaProps<T extends FormData> extends BaseFormFieldProps<T> {
  placeholder?: string;
  rows?: number;
}

interface FormSelectProps<T extends FormData> extends BaseFormFieldProps<T> {
  placeholder?: string;
  children: React.ReactNode;
}

interface FormNumberInputProps<T extends FormData> extends BaseFormFieldProps<T> {
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
}

interface FormSwitchProps<T extends FormData> extends BaseFormFieldProps<T> {}

interface FormCheckboxProps<T extends FormData> extends BaseFormFieldProps<T> {
  children: React.ReactNode;
}

interface FormRadioGroupProps<T extends FormData> extends BaseFormFieldProps<T> {
  children: React.ReactNode;
  direction?: 'row' | 'column';
}

export const FormInput = <T extends FormData>({
  form,
  name,
  label,
  helperText,
  isRequired,
  type = 'text',
  placeholder,
  showFieldError = false
}: FormInputProps<T>) => {
  const fieldName = name as string;
  const value = form.formData[name] as string;
  const error = form.getFieldError(fieldName);
  
  return (
    <ValidatedInput
      label={label}
      helperText={helperText}
      isRequired={isRequired}
      error={error}
      type={type}
      value={value}
      onChange={(newValue) => form.updateField(name, newValue)}
      onBlur={() => form.touchField(fieldName)}
      placeholder={placeholder}
      showFieldError={showFieldError}
    />
  );
};

export const FormTextarea = <T extends FormData>({
  form,
  name,
  label,
  helperText,
  isRequired,
  placeholder,
  rows
}: FormTextareaProps<T>) => {
  const fieldName = name as string;
  const value = form.formData[name] as string;
  const error = form.getFieldError(fieldName);
  
  return (
    <ValidatedTextarea
      label={label}
      helperText={helperText}
      isRequired={isRequired}
      error={error}
      value={value}
      onChange={(newValue) => form.updateField(name, newValue)}
      onBlur={() => form.touchField(fieldName)}
      placeholder={placeholder}
      rows={rows}
    />
  );
};

export const FormSelect = <T extends FormData>({
  form,
  name,
  label,
  helperText,
  isRequired,
  placeholder,
  children
}: FormSelectProps<T>) => {
  const fieldName = name as string;
  const value = form.formData[name] as string;
  const error = form.getFieldError(fieldName);
  
  return (
    <ValidatedSelect
      label={label}
      helperText={helperText}
      isRequired={isRequired}
      error={error}
      value={value}
      onChange={(newValue) => form.updateField(name, newValue)}
      onBlur={() => form.touchField(fieldName)}
      placeholder={placeholder}
    >
      {children}
    </ValidatedSelect>
  );
};

export const FormNumberInput = <T extends FormData>({
  form,
  name,
  label,
  helperText,
  isRequired,
  min,
  max,
  step,
  precision
}: FormNumberInputProps<T>) => {
  const fieldName = name as string;
  const value = form.formData[name] as number | undefined;
  const error = form.getFieldError(fieldName);
  
  return (
    <ValidatedNumberInput
      label={label}
      helperText={helperText}
      isRequired={isRequired}
      error={error}
      value={value}
      onChange={(newValue) => form.updateField(name, newValue)}
      onBlur={() => form.touchField(fieldName)}
      min={min}
      max={max}
      step={step}
      precision={precision}
    />
  );
};

export const FormSwitch = <T extends FormData>({
  form,
  name,
  label,
  helperText,
  isRequired
}: FormSwitchProps<T>) => {
  const fieldName = name as string;
  const value = form.formData[name] as boolean;
  const error = form.getFieldError(fieldName);
  
  return (
    <ValidatedSwitch
      label={label}
      helperText={helperText}
      isRequired={isRequired}
      error={error}
      value={value}
      onChange={(newValue) => form.updateField(name, newValue)}
      onBlur={() => form.touchField(fieldName)}
    />
  );
};

export const FormCheckbox = <T extends FormData>({
  form,
  name,
  label,
  helperText,
  isRequired,
  children
}: FormCheckboxProps<T>) => {
  const fieldName = name as string;
  const value = form.formData[name] as boolean;
  const error = form.getFieldError(fieldName);
  
  return (
    <ValidatedCheckbox
      label={label}
      helperText={helperText}
      isRequired={isRequired}
      error={error}
      value={value}
      onChange={(newValue) => form.updateField(name, newValue)}
      onBlur={() => form.touchField(fieldName)}
    >
      {children}
    </ValidatedCheckbox>
  );
};

export const FormRadioGroup = <T extends FormData>({
  form,
  name,
  label,
  helperText,
  isRequired,
  children,
  direction
}: FormRadioGroupProps<T>) => {
  const fieldName = name as string;
  const value = form.formData[name] as string;
  const error = form.getFieldError(fieldName);
  
  return (
    <ValidatedRadioGroup
      label={label}
      helperText={helperText}
      isRequired={isRequired}
      error={error}
      value={value}
      onChange={(newValue) => form.updateField(name, newValue)}
      onBlur={() => form.touchField(fieldName)}
      direction={direction}
    >
      {children}
    </ValidatedRadioGroup>
  );
};