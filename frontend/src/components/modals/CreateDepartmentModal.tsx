// frontend/src/components/modals/CreateDepartmentModal.tsx

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
import { useValidatedForm } from '../../hooks/useValidatedForm';
import { ValidationRules, FormValidationConfig } from '../../types/validation';
import { FormInput } from '../form/FormField';
import { BaseModal } from '../base/BaseModal';
import { useStandardFormValidation } from '../../hooks/useFormValidation';

// TypeScript interfaces
interface DepartmentFormData {
    departmentName: string;
    departmentDescription: string;
    departmentColor: string;
    departmentInitials: string;
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
    departmentName: '',
    departmentDescription: '',
    departmentColor: '#6495ED',
    departmentInitials: '',
};

const VALIDATION_CONFIG: FormValidationConfig = {
    departmentName: {
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
    departmentDescription: {
        required: false,
        rules: [
            ValidationRules.maxLength(200, 'Description must be no more than 200 characters')
        ]
    },
    departmentColor: {
        required: false, // Handle required validation manually for button state
        rules: [
            ValidationRules.pattern(/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color code')
        ]
    },
    departmentInitials: {
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
                departmentName: form.formData.departmentName,
                departmentColor: form.formData.departmentColor,
                ...(form.formData.departmentDescription.trim() && {
                    departmentDescription: form.formData.departmentDescription.trim()
                }),
                ...(form.formData.departmentInitials.trim() && {
                    departmentInitials: form.formData.departmentInitials.trim().toUpperCase()
                }),
            };

            await form.submitForm(
                '/api/me/departments',
                'POST',
                `"${form.formData.departmentName}" department has been created`,
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
        form.updateField('departmentColor', colorValue);
    };

    const handleDepartmentNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        form.updateField('departmentName', newName);
        
        // Auto-populate initials if they haven't been manually set
        if (!form.formData.departmentInitials || 
            form.formData.departmentInitials === generateInitials(form.formData.departmentName)) {
            const newInitials = generateInitials(newName);
            form.updateField('departmentInitials', newInitials);
        }
    };

    const generateInitials = (name: string): string => {
        return name.trim().substring(0, 2).toUpperCase();
    };

    const { canSubmit } = useStandardFormValidation(form, ['departmentName']);

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
                        value={form.formData.departmentName}
                        onChange={handleDepartmentNameChange}
                        onBlur={() => form.validateField('departmentName')}
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
                                    value={form.formData.departmentColor}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.updateField('departmentColor', e.target.value)}
                                    width="60px"
                                    height="40px"
                                    padding="1"
                                    cursor="pointer"
                                />
                                <Input
                                    value={form.formData.departmentColor}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.updateField('departmentColor', e.target.value)}
                                    placeholder="#6495ED"
                                    width="120px"
                                />
                                {PRESET_COLORS.map((color) => (
                                    <Button
                                        key={color.value}
                                        size="sm"
                                        height="30px"
                                        width="30px"
                                        minWidth="30px"
                                        backgroundColor={color.value}
                                        border={form.formData.departmentColor === color.value ? '3px solid' : '1px solid'}
                                        borderColor={form.formData.departmentColor === color.value ? 'white' : 'gray.300'}
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
                            value={form.formData.departmentInitials}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.updateField('departmentInitials', e.target.value.toUpperCase())}
                            onBlur={() => form.validateField('departmentInitials')}
                            placeholder="LX"
                            maxLength={5}
                        />
                        <Text fontSize="xs" color="gray.500" mt={1}>
                            Optional
                        </Text>
                    </FormControl>
                </HStack>


                <FormControl>
                    <FormLabel>Description</FormLabel>
                    <Textarea
                        placeholder="Describe the department's role and responsibilities"
                        value={form.formData.departmentDescription}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => form.updateField('departmentDescription', e.target.value)}
                        onBlur={() => form.validateField('departmentDescription')}
                        rows={2}
                        resize="vertical"
                    />
                </FormControl>
            </VStack>
        </BaseModal>
    );
};