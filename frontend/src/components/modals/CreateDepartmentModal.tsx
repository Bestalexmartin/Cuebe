// frontend/src/components/modals/CreateDepartmentModal.tsx

import React from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
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
import { ErrorBoundary } from '../ErrorBoundary';

// TypeScript interfaces
interface DepartmentFormData {
    departmentName: string;
    departmentDescription: string;
    departmentColor: string;
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
};

const VALIDATION_CONFIG: FormValidationConfig = {
    departmentName: {
        required: false, // Handle required validation manually for button state
        rules: [
            ValidationRules.minLength(2, 'Department name must be at least 2 characters'),
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

    const isFormValid = (): boolean => {
        return form.formData.departmentName.trim() !== '';
    };

    return (
        <ErrorBoundary context="CreateDepartmentModal">
            <Modal isOpen={isOpen} onClose={handleModalClose} onCloseComplete={form.resetForm}>
                <ModalOverlay />
                <ModalContent
                    as="form"
                    onSubmit={handleSubmit}
                    bg="page.background"
                    border="2px solid"
                    borderColor="gray.600"
                >
                    <ModalHeader>Create New Department</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <VStack spacing={4} align="stretch">
                            <FormInput
                                form={form}
                                name="departmentName"
                                label="Department Name"
                                placeholder="Enter department name"
                                isRequired
                            />

                        <FormControl>
                            <FormLabel>Department Color</FormLabel>
                            <VStack align="stretch" spacing={3}>
                                <HStack>
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
                                        flex="1"
                                    />
                                </HStack>
                                <Box>
                                    <Text fontSize="sm" color="gray.500" mb={2}>
                                        Quick Colors:
                                    </Text>
                                    <HStack spacing={2} flexWrap="wrap">
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
                                            />
                                        ))}
                                    </HStack>
                                </Box>
                            </VStack>
                        </FormControl>

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

                            {/* Show form-level validation errors */}
                            {form.fieldErrors.length > 0 && (
                                <Box p={3} bg="red.500" color="white" borderRadius="md">
                                    <Text fontWeight="semibold">Validation Errors:</Text>
                                    {form.fieldErrors.map((error, i) => (
                                        <Text key={i} fontSize="sm">
                                            • {error.field}: {error.message}
                                        </Text>
                                    ))}
                                </Box>
                            )}

                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <Button
                        size="sm"
                        mr={3}
                        onClick={handleModalClose}
                        _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
                    >
                        Cancel
                    </Button>
                    <Button
                        bg="blue.400"
                        color="white"
                        size="sm"
                        type="submit"
                        isLoading={form.isSubmitting}
                        isDisabled={!isFormValid()}
                        _hover={{ bg: 'orange.400' }}
                    >
                        Create Department
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
        </ErrorBoundary>
    );
};