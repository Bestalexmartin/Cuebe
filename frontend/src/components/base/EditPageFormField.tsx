// frontend/src/components/base/EditPageFormField.tsx

import React from 'react';
import {
    FormControl,
    FormLabel,
    Input,
    Textarea,
    Select,
    InputProps,
    TextareaProps,
} from '@chakra-ui/react';

interface BaseEditPageFormFieldProps {
    label: string;
    isRequired?: boolean;
    isDisabled?: boolean;
    flexBasis?: string | number;
    flex?: string | number;
    error?: string;
}

interface InputFieldProps extends BaseEditPageFormFieldProps {
    type: 'input';
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    onPaste?: () => void;
    placeholder?: string;
    inputType?: InputProps['type'];
    maxLength?: number;
    bg?: string;
    _dark?: { bg?: string };
}

interface TextareaFieldProps extends BaseEditPageFormFieldProps {
    type: 'textarea';
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    rows?: number;
    minHeight?: string;
    resize?: TextareaProps['resize'];
}

interface SelectFieldProps extends BaseEditPageFormFieldProps {
    type: 'select';
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    options: Array<{ value: string; label: string }>;
    bg?: string;
    _dark?: { bg?: string };
}

type EditPageFormFieldProps = InputFieldProps | TextareaFieldProps | SelectFieldProps;

export const EditPageFormField: React.FC<EditPageFormFieldProps> = (props) => {
    const {
        label,
        isRequired = false,
        isDisabled = false,
        flexBasis,
        flex,
        error
    } = props;

    const formControlProps = {
        isRequired,
        isInvalid: !!error,
        ...(flexBasis && { flexBasis }),
        ...(flex && { flex })
    };

    if (props.type === 'input') {
        const {
            value,
            onChange,
            onBlur,
            onPaste,
            placeholder,
            inputType = 'text',
            maxLength,
            bg,
            _dark
        } = props;

        return (
            <FormControl {...formControlProps}>
                <FormLabel>{label}</FormLabel>
                <Input
                    type={inputType}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    onPaste={onPaste}
                    placeholder={placeholder}
                    isDisabled={isDisabled}
                    maxLength={maxLength}
                    bg={bg}
                    _dark={_dark}
                />
            </FormControl>
        );
    }

    if (props.type === 'textarea') {
        const {
            value,
            onChange,
            onBlur,
            placeholder,
            rows,
            minHeight,
            resize = 'vertical'
        } = props;

        return (
            <FormControl {...formControlProps}>
                <FormLabel>{label}</FormLabel>
                <Textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    isDisabled={isDisabled}
                    rows={rows}
                    minHeight={minHeight}
                    resize={resize}
                />
            </FormControl>
        );
    }

    if (props.type === 'select') {
        const {
            value,
            onChange,
            placeholder,
            options,
            bg,
            _dark
        } = props;

        return (
            <FormControl {...formControlProps}>
                <FormLabel>{label}</FormLabel>
                <Select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    isDisabled={isDisabled}
                    bg={bg}
                    _dark={_dark}
                >
                    {options.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>
            </FormControl>
        );
    }

    return null;
};