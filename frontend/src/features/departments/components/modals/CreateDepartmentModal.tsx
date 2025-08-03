// frontend/src/features/departments/components/modals/CreateDepartmentModal.tsx

import React from 'react';
import {
    Button,
    FormControl,
    FormLabel,
    Input,
    Textarea,
    VStack,
    HStack,
    Box,
    Text,
} from '@chakra-ui/react';
import { useValidatedForm } from '../../../../hooks/useValidatedForm';
import { ValidationRules, FormValidationConfig } from '../../../../types/validation';
import { FormInput } from '../../../../components/form/FormField';
import { BaseModal } from '../../../../components/base/BaseModal';
import { useStandardFormValidation } from '../../../../hooks/useFormValidation';

// TypeScript interfaces
interface DepartmentFormData {
    department_name: string;
    department_description: string;
    department_color: string;
    department_initials: string;
}

interface CreateDepartmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDepartmentCreated: () => void;
}

interface PresetColor {
    name: string;
    value: string;
}

const INITIAL_FORM_STATE: DepartmentFormData = {
    department_name: '',
    department_description: '',
    department_color: '#6495ED',
    department_initials: '',
};

const VALIDATION_CONFIG: FormValidationConfig = {
    department_name: {
        required: false, // Handle required validation manually for button state
        rules: [
            {
                validator: (value: string) => {
                    if (!value || value.trim().length === 0) {
                        return true; // Empty is valid
                    }
                    return value.trim().length >= 3; // Must have 3+ chars if not empty
                },
                message: 'Department name must be at least 3 characters',
                code: 'MIN_LENGTH'
            },
            ValidationRules.maxLength(50, 'Department name must be no more than 50 characters')
        ]
    },
    department_description: {
        required: false,
        rules: [
            ValidationRules.maxLength(200, 'Description must be no more than 200 characters')
        ]
    },
    department_color: {
        required: false, // Handle required validation manually for button state
        rules: [
            ValidationRules.pattern(/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color code')
        ]
    },
    department_initials: {
        required: false,
        rules: [
            ValidationRules.maxLength(5, 'Initials must be no more than 5 characters'),
            ValidationRules.pattern(/^[A-Z]*$/i, 'Initials must contain only letters')
        ]
    }
};

const PRESET_COLORS: PresetColor[] = [
    { name: 'Blue', value: '#6495ED' },
    { name: 'Orange', value: '#e79e40' },
    { name: 'Green', value: '#48BB78' },
    { name: 'Red', value: '#F56565' },
    { name: 'Purple', value: '#9F7AEA' },
    { name: 'Teal', value: '#38B2AC' },
    { name: 'Pink', value: '#ED64A6' },
    { name: 'Yellow', value: '#ECC94B' },
];

export const CreateDepartmentModal: React.FC<CreateDepartmentModalProps> = ({
    isOpen,
    onClose,
    onDepartmentCreated
}) => {
    const form = useValidatedForm<DepartmentFormData>(INITIAL_FORM_STATE, {
        validationConfig: VALIDATION_CONFIG,
        validateOnBlur: true,
        showFieldErrorsInToast: false // Only show validation errors in red alert box
    });

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            const departmentData = {
                department_name: form.formData.department_name,
                department_color: form.formData.department_color,
                ...(form.formData.department_description.trim() && {
                    department_description: form.formData.department_description.trim()
                }),
                ...(form.formData.department_initials.trim() && {
                    department_initials: form.formData.department_initials.trim().toUpperCase()
                }),
            };

            await form.submitForm(
                '/api/me/departments',
                'POST',
                `"${form.formData.department_name}" department has been created`,
                departmentData
            );

            handleModalClose();
            onDepartmentCreated();

        } catch (error) {
            // Error handling is done in submitForm
        }
    };

    const handleModalClose = () => {
        form.resetForm();
        onClose();
    };

    const handleColorButtonClick = (colorValue: string) => {
        form.updateField('department_color', colorValue);
    };

    const handleDepartmentNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        form.updateField('department_name', newName);
        
        // Auto-populate initials if they haven't been manually set
        if (!form.formData.department_initials || 
            form.formData.department_initials === generateInitials(form.formData.department_name)) {
            const newInitials = generateInitials(newName);
            form.updateField('department_initials', newInitials);
        }
    };

    const generateInitials = (name: string): string => {
        return name.trim().substring(0, 2).toUpperCase();
    };

    const { canSubmit } = useStandardFormValidation(form, ['department_name']);

    return (
        <BaseModal
            title="Create New Department"
            isOpen={isOpen}
            onClose={handleModalClose}
            onCloseComplete={form.resetForm}
            onSubmit={handleSubmit}
            primaryAction={{
                label: "Create Department",
                variant: "primary",
                onClick: () => handleSubmit({} as React.FormEvent<HTMLFormElement>),
                isLoading: form.isSubmitting,
                isDisabled: !canSubmit
            }}
            validationErrors={form.fieldErrors}
            showValidationErrors={form.fieldErrors.length > 0}
            errorBoundaryContext="CreateDepartmentModal"
        >
            <VStack spacing={4} align="stretch">
                <FormControl isRequired>
                    <FormLabel>Department Name</FormLabel>
                    <Input
                        value={form.formData.department_name}
                        onChange={handleDepartmentNameChange}
                        onBlur={() => form.validateField('department_name')}
                        placeholder="Enter department name"
                    />
                </FormControl>

                <HStack spacing={4} align="start">
                    <FormControl flex="2">
                        <FormLabel>Department Color</FormLabel>
                        <VStack align="stretch" spacing={3}>
                            <HStack spacing={2} align="center">
                                <Input
                                    type="color"
                                    value={form.formData.department_color}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.updateField('department_color', e.target.value)}
                                    width="60px"
                                    height="40px"
                                    padding="1"
                                    cursor="pointer"
                                />
                                <Input
                                    value={form.formData.department_color}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.updateField('department_color', e.target.value)}
                                    placeholder="#6495ED"
                                    width="120px"
                                />
                            </HStack>
                            <HStack spacing={2} align="center">
                                {PRESET_COLORS.map((color) => (
                                    <Button
                                        key={color.value}
                                        size="sm"
                                        height="30px"
                                        width="30px"
                                        minWidth="30px"
                                        backgroundColor={color.value}
                                        border={form.formData.department_color === color.value ? '3px solid' : '1px solid'}
                                        borderColor={form.formData.department_color === color.value ? 'white' : 'gray.300'}
                                        onClick={() => handleColorButtonClick(color.value)}
                                        _hover={{ transform: 'scale(1.1)' }}
                                        title={color.name}
                                        tabIndex={-1}
                                    />
                                ))}
                            </HStack>
                        </VStack>
                    </FormControl>
                    
                    <FormControl flex="1">
                        <FormLabel>Initials</FormLabel>
                        <Input
                            value={form.formData.department_initials}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.updateField('department_initials', e.target.value.toUpperCase())}
                            onBlur={() => form.validateField('department_initials')}
                            placeholder="LX"
                            maxLength={5}
                        />
                    </FormControl>
                </HStack>


                <FormControl>
                    <FormLabel>Description</FormLabel>
                    <Textarea
                        placeholder="Describe the department's role and responsibilities"
                        value={form.formData.department_description}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => form.updateField('department_description', e.target.value)}
                        onBlur={() => form.validateField('department_description')}
                        rows={2}
                        resize="vertical"
                    />
                </FormControl>
            </VStack>
        </BaseModal>
    );
};
