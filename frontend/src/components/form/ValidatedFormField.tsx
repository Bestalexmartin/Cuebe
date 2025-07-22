// frontend/src/components/form/ValidatedFormField.tsx

import React from 'react';
import {
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Input,
  Textarea,
  Select,
  NumberInput,
  NumberInputField,
  Switch,
  Checkbox,
  Radio,
  RadioGroup,
  Stack,
  InputProps,
  TextareaProps,
  SelectProps,
  NumberInputProps
} from '@chakra-ui/react';

interface BaseFieldProps {
  label?: string;
  helperText?: string;
  isRequired?: boolean;
  error?: string;
  isInvalid?: boolean;
  onBlur?: () => void;
}

interface ValidatedInputProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'password' | 'url' | 'tel';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputProps?: Omit<InputProps, 'value' | 'onChange' | 'onBlur' | 'isInvalid'>;
}

interface ValidatedTextareaProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  textareaProps?: Omit<TextareaProps, 'value' | 'onChange' | 'onBlur' | 'isInvalid'>;
}

interface ValidatedSelectProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  children: React.ReactNode;
  selectProps?: Omit<SelectProps, 'value' | 'onChange' | 'onBlur' | 'isInvalid'>;
}

interface ValidatedNumberInputProps extends BaseFieldProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  numberInputProps?: Omit<NumberInputProps, 'value' | 'onChange' | 'onBlur' | 'isInvalid'>;
}

interface ValidatedSwitchProps extends BaseFieldProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

interface ValidatedCheckboxProps extends BaseFieldProps {
  value: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
}

interface ValidatedRadioGroupProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  direction?: 'row' | 'column';
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  label,
  helperText,
  isRequired,
  error,
  isInvalid,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  inputProps = {}
}) => {
  return (
    <FormControl isRequired={isRequired} isInvalid={isInvalid || !!error}>
      {label && <FormLabel>{label}</FormLabel>}
      <Input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        {...inputProps}
      />
      {error && <FormErrorMessage>{error}</FormErrorMessage>}
      {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export const ValidatedTextarea: React.FC<ValidatedTextareaProps> = ({
  label,
  helperText,
  isRequired,
  error,
  isInvalid,
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 3,
  textareaProps = {}
}) => {
  return (
    <FormControl isRequired={isRequired} isInvalid={isInvalid || !!error}>
      {label && <FormLabel>{label}</FormLabel>}
      <Textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        {...textareaProps}
      />
      {error && <FormErrorMessage>{error}</FormErrorMessage>}
      {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export const ValidatedSelect: React.FC<ValidatedSelectProps> = ({
  label,
  helperText,
  isRequired,
  error,
  isInvalid,
  value,
  onChange,
  onBlur,
  placeholder,
  children,
  selectProps = {}
}) => {
  return (
    <FormControl isRequired={isRequired} isInvalid={isInvalid || !!error}>
      {label && <FormLabel>{label}</FormLabel>}
      <Select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        {...selectProps}
      >
        {children}
      </Select>
      {error && <FormErrorMessage>{error}</FormErrorMessage>}
      {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export const ValidatedNumberInput: React.FC<ValidatedNumberInputProps> = ({
  label,
  helperText,
  isRequired,
  error,
  isInvalid,
  value,
  onChange,
  onBlur,
  min,
  max,
  step,
  precision,
  numberInputProps = {}
}) => {
  return (
    <FormControl isRequired={isRequired} isInvalid={isInvalid || !!error}>
      {label && <FormLabel>{label}</FormLabel>}
      <NumberInput
        value={value ?? ''}
        onChange={(valueString, valueNumber) => {
          onChange(isNaN(valueNumber) ? undefined : valueNumber);
        }}
        onBlur={onBlur}
        min={min}
        max={max}
        step={step}
        precision={precision}
        {...numberInputProps}
      >
        <NumberInputField />
      </NumberInput>
      {error && <FormErrorMessage>{error}</FormErrorMessage>}
      {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export const ValidatedSwitch: React.FC<ValidatedSwitchProps> = ({
  label,
  helperText,
  isRequired,
  error,
  isInvalid,
  value,
  onChange,
  onBlur
}) => {
  return (
    <FormControl isRequired={isRequired} isInvalid={isInvalid || !!error}>
      <Stack direction="row" align="center" spacing={3}>
        <Switch
          isChecked={value || false}
          onChange={(e) => onChange(e.target.checked)}
          onBlur={onBlur}
        />
        {label && <FormLabel mb={0}>{label}</FormLabel>}
      </Stack>
      {error && <FormErrorMessage>{error}</FormErrorMessage>}
      {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export const ValidatedCheckbox: React.FC<ValidatedCheckboxProps> = ({
  label,
  helperText,
  isRequired,
  error,
  isInvalid,
  value,
  onChange,
  onBlur,
  children
}) => {
  return (
    <FormControl isRequired={isRequired} isInvalid={isInvalid || !!error}>
      {label && <FormLabel>{label}</FormLabel>}
      <Checkbox
        isChecked={value || false}
        onChange={(e) => onChange(e.target.checked)}
        onBlur={onBlur}
      >
        {children}
      </Checkbox>
      {error && <FormErrorMessage>{error}</FormErrorMessage>}
      {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export const ValidatedRadioGroup: React.FC<ValidatedRadioGroupProps> = ({
  label,
  helperText,
  isRequired,
  error,
  isInvalid,
  value,
  onChange,
  onBlur,
  children,
  direction = 'column'
}) => {
  return (
    <FormControl isRequired={isRequired} isInvalid={isInvalid || !!error}>
      {label && <FormLabel>{label}</FormLabel>}
      <RadioGroup
        value={value || ''}
        onChange={onChange}
        onBlur={onBlur}
      >
        <Stack direction={direction}>
          {children}
        </Stack>
      </RadioGroup>
      {error && <FormErrorMessage>{error}</FormErrorMessage>}
      {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};