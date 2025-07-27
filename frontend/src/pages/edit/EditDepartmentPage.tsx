// frontend/src/EditDepartmentPage.tsx

import React, { useEffect, useState } from 'react';
import {
    Box, VStack, HStack, Text, Spinner, Flex,
    FormControl, FormLabel, Input, Textarea, Button
} from "@chakra-ui/react";
import { formatDateTimeLocal } from '../../utils/dateTimeUtils';
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from '@clerk/clerk-react';
import { useDepartment } from "../../hooks/useDepartment";
import { useValidatedForm } from '../../hooks/useValidatedForm';
import { ValidationRules, FormValidationConfig } from '../../types/validation';
import { BaseEditPage } from '../../components/base/BaseEditPage';
import { ActionItem } from '../../components/ActionsMenu';
import { DeleteConfirmationModal } from '../../components/modals/DeleteConfirmationModal';
import { useEnhancedToast } from '../../utils/toastUtils';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useChangeDetection } from '../../hooks/useChangeDetection';

// TypeScript interfaces
interface DepartmentFormData {
    departmentName: string;
    departmentDescription: string;
    departmentColor: string;
}

interface PresetColor {
    name: string;
    value: string;
}

const INITIAL_FORM_STATE: DepartmentFormData = {
    departmentName: '',
    departmentDescription: '',
    departmentColor: '#3182CE'
};

const VALIDATION_CONFIG: FormValidationConfig = {
    departmentName: {
        required: false,
        rules: [
            {
                validator: (value: string) => {
                    if (!value || value.trim().length === 0) {
                        return true; // Empty is valid
                    }
                    return value.trim().length >= 4; // Must have 4+ chars if not empty
                },
                message: 'Department name must be at least 4 characters',
                code: 'MIN_LENGTH'
            },
            ValidationRules.maxLength(100, 'Department name must be no more than 100 characters')
        ]
    },
    departmentDescription: {
        required: false,
        rules: [
            ValidationRules.maxLength(500, 'Description must be no more than 500 characters')
        ]
    },
    departmentColor: {
        required: false,
        rules: [
            {
                validator: (value: string) => !value || /^#[0-9A-Fa-f]{6}$/.test(value),
                message: 'Please enter a valid color code (e.g., #3182CE)',
                code: 'INVALID_COLOR'
            }
        ]
    }
};

// Predefined color options for quick selection (same as CreateDepartmentModal)
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

export const EditDepartmentPage: React.FC = () => {
    const { departmentId } = useParams<{ departmentId: string }>();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const { showSuccess, showError } = useEnhancedToast();

    // Delete confirmation modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch the initial department data
    const { department, isLoading: isLoadingDepartment, error: departmentError } = useDepartment(departmentId);

    // Form management
    const form = useValidatedForm<DepartmentFormData>(INITIAL_FORM_STATE, {
        validationConfig: VALIDATION_CONFIG,
        validateOnChange: true,
        validateOnBlur: true,
        showFieldErrorsInToast: false
    });

    // Populate form when department data loads
    useEffect(() => {
        if (department) {
            form.setFormData({
                departmentName: department.departmentName || '',
                departmentDescription: department.departmentDescription || '',
                departmentColor: department.departmentColor || '#3182CE'
            });
        }
    }, [department, form.setFormData]);

    // Change detection for save button - same pattern as EditShowPage
    const initialData = department ? {
        departmentName: department.departmentName || '',
        departmentDescription: department.departmentDescription || '',
        departmentColor: department.departmentColor || '#3182CE'
    } : null;

    const { hasChanges, updateOriginalData } = useChangeDetection(
        initialData,
        form.formData,
        true // Always active for department edit
    );

    // Handle form field changes
    const handleChange = (field: keyof DepartmentFormData, value: string) => {
        form.updateField(field, value);
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!departmentId) return;

        try {
            // Prepare data for API
            const updateData = {
                departmentName: form.formData.departmentName,
                departmentDescription: form.formData.departmentDescription || null,
                departmentColor: form.formData.departmentColor,
            };

            await form.submitForm(
                `/api/departments/${departmentId}`,
                'PATCH',
                `"${form.formData.departmentName}" has been updated successfully`,
                updateData
            );

            // Update original data to reflect the changes
            updateOriginalData(form.formData);

            // Navigate back to dashboard on success
            navigate('/dashboard', {
                state: {
                    view: 'departments',
                    selectedDepartmentId: departmentId,
                    returnFromEdit: true
                }
            });

        } catch (error) {
            // Error handled by submitForm
        }
    };

    const handleClose = () => {
        navigate('/dashboard', {
            state: {
                view: 'departments',
                selectedDepartmentId: departmentId,
                returnFromEdit: true
            }
        });
    };

    const isFormValid = (): boolean => {
        return form.fieldErrors.length === 0 &&
            form.formData.departmentName.trim().length >= 4 &&
            form.formData.departmentColor.trim().length > 0;
    };

    // Handle department deletion
    const handleDeleteDepartment = async () => {
        if (!departmentId || !department) return;

        setIsDeleting(true);
        try {
            const token = await getToken();
            const response = await fetch(`/api/departments/${departmentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete department');
            }

            showSuccess('Department Deleted', `"${department.departmentName}" has been deleted successfully`);

            // Navigate back to dashboard
            navigate('/dashboard', {
                state: {
                    view: 'departments',
                    returnFromEdit: true
                }
            });

        } catch (error) {
            console.error('Error deleting department:', error);
            showError('Failed to delete department. Please try again.');
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    // Configure actions menu
    const actions: ActionItem[] = [
        {
            id: 'delete-department',
            label: 'Delete Department',
            onClick: () => setIsDeleteModalOpen(true),
            isDestructive: true,
            isDisabled: form.isSubmitting || isDeleting
        }
    ];

    return (
        <ErrorBoundary context="Edit Department Page">
            <BaseEditPage
                pageTitle={department?.departmentName || 'Department'}
                onSubmit={handleSubmit}
                isLoading={isLoadingDepartment}
                primaryAction={{
                    label: "Save Changes",
                    variant: "primary",
                    type: "submit",
                    isLoading: form.isSubmitting,
                    isDisabled: !isFormValid() || !hasChanges
                }}
                secondaryActions={[
                    {
                        label: "Cancel",
                        variant: "outline",
                        onClick: handleClose
                    }
                ]}
                menuActions={actions}
            >
                {/* Loading State */}
                {isLoadingDepartment && (
                    <Flex justify="center" align="center" height="200px">
                        <Spinner />
                    </Flex>
                )}

                {/* Error State */}
                {departmentError && (
                    <Text color="red.500" textAlign="center" p="4">
                        {departmentError}
                    </Text>
                )}

                {/* Form Content */}
                {!isLoadingDepartment && department && (
                    <VStack spacing={6} align="stretch">
                        {/* Department Profile Preview */}
                        <Box
                            p="4"
                            bg="gray.50"
                            _dark={{ bg: "gray.700" }}
                            borderRadius="md"
                        >
                            <HStack spacing="3" align="start">
                                <Box
                                    w="48px"
                                    h="48px"
                                    borderRadius="full"
                                    bg={form.formData.departmentColor}
                                    border="2px solid"
                                    borderColor="gray.300"
                                    _dark={{ borderColor: "gray.600" }}
                                    flexShrink={0}
                                />
                                <VStack align="start" spacing="1" flex="1">
                                    <HStack spacing="2" align="center">
                                        <Text fontWeight="medium">{form.formData.departmentName || 'Department Name'}</Text>
                                    </HStack>
                                    <HStack justify="space-between" width="100%">
                                        <Text fontSize="sm" color="detail.text">
                                            Crew Members: 0
                                        </Text>
                                        <Text fontSize="xs" color="detail.text">
                                            Updated: {formatDateTimeLocal(department.dateUpdated)}
                                        </Text>
                                    </HStack>
                                    <HStack justify="space-between" width="100%">
                                        <Text fontSize="sm" color="detail.text">
                                            Shows Assigned: 0
                                        </Text>
                                        <Text fontSize="xs" color="detail.text">
                                            Created: {formatDateTimeLocal(department.dateCreated)}
                                        </Text>
                                    </HStack>
                                </VStack>
                            </HStack>
                        </Box>

                        {/* Basic Information */}
                        <FormControl isRequired>
                            <FormLabel>Department Name</FormLabel>
                            <Input
                                value={form.formData.departmentName}
                                onChange={(e) => handleChange('departmentName', e.target.value)}
                                onBlur={() => form.validateField('departmentName')}
                                placeholder="Enter department name"
                            />
                        </FormControl>

                        {/* Color Selection */}
                        <FormControl isRequired>
                            <FormLabel>Department Color</FormLabel>
                            <VStack align="stretch" spacing="3">
                                <HStack spacing="4" align="center">
                                    <Input
                                        type="color"
                                        value={form.formData.departmentColor}
                                        onChange={(e) => handleChange('departmentColor', e.target.value)}
                                        width="80px"
                                        height="40px"
                                        padding="4px"
                                        border="2px solid"
                                        borderColor="gray.300"
                                        borderRadius="md"
                                        cursor="pointer"
                                    />
                                    <Input
                                        value={form.formData.departmentColor}
                                        onChange={(e) => handleChange('departmentColor', e.target.value)}
                                        onBlur={() => form.validateField('departmentColor')}
                                        placeholder="#3182CE"
                                        maxWidth="120px"
                                        fontFamily="mono"
                                    />
                                </HStack>

                                {/* Preset Color Options */}
                                <Box>
                                    <Text fontSize="sm" color="detail.text" mb={2}>
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
                                                onClick={() => handleChange('departmentColor', color.value)}
                                                _hover={{ transform: 'scale(1.1)' }}
                                                title={color.name}
                                            />
                                        ))}
                                    </HStack>
                                </Box>
                            </VStack>
                        </FormControl>

                        {/* Department Description */}
                        <FormControl>
                            <FormLabel>Department Description</FormLabel>
                            <Textarea
                                value={form.formData.departmentDescription}
                                onChange={(e) => handleChange('departmentDescription', e.target.value)}
                                onBlur={() => form.validateField('departmentDescription')}
                                placeholder="Describe this department's role and responsibilities"
                                resize="vertical"
                                minHeight="120px"
                            />
                        </FormControl>
                    </VStack>
                )}
                
                {/* Floating Validation Error Panel */}
                {form.fieldErrors.length > 0 && (
                    <Box
                        position="fixed"
                        bottom="20px"
                        left="50%"
                        transform="translateX(-50%)"
                        bg="red.500"
                        color="white"
                        px="8"
                        py="6"
                        borderRadius="lg"
                        boxShadow="xl"
                        flexShrink={0}
                        minWidth="450px"
                    >
                        <Text fontWeight="semibold" fontSize="md" display="inline">
                            Validation Errors:
                        </Text>
                        <Text fontSize="md" display="inline" ml={1}>
                            {form.fieldErrors.map((error, i) => (
                                <Text key={i} as="span">
                                    {i > 0 && '; '}{error.message}
                                </Text>
                            ))}
                        </Text>
                    </Box>
                )}
            </BaseEditPage>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteDepartment}
                isLoading={isDeleting}
                entityType="Department"
                entityName={department?.departmentName || ''}
            />
        </ErrorBoundary>
    );
};