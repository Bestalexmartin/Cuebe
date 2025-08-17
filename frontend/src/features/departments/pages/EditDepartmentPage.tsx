// frontend/src/features/departments/pages/EditDepartmentPage.tsx

import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, VStack, HStack, Text, Spinner, Flex,
    FormControl, FormLabel, Input, Textarea, Button,
    Avatar, Badge
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from '@clerk/clerk-react';
import { useDepartment } from "../hooks/useDepartment";
import { formatRoleBadge, getShareUrlSuffix } from '../../../constants/userRoles';
import { useValidatedForm } from '../../../hooks/useValidatedForm';
import { ValidationRules, FormValidationConfig } from '../../../types/validation';
import { BaseEditPage } from '../../../components/base/BaseEditPage';
import { ActionItem } from '../../../components/ActionsMenu';
import { DeleteConfirmationModal } from '../../../components/modals/DeleteConfirmationModal';
import { useEnhancedToast } from '../../../utils/toastUtils';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { useChangeDetection } from '../../../hooks/useChangeDetection';
import { CrewBioModal } from '../../shows/components/modals/CrewBioModal';
import { FloatingValidationErrorPanel } from '../../../components/base/FloatingValidationErrorPanel';
import { EditPageFormField } from '../../../components/base/EditPageFormField';
import { ResponsiveAssignmentList } from '../../../components/base/ResponsiveAssignmentList';

// TypeScript interfaces
interface DepartmentFormData {
    department_name: string;
    department_description: string;
    department_color: string;
    department_initials: string;
}

interface PresetColor {
    name: string;
    value: string;
}

const INITIAL_FORM_STATE: DepartmentFormData = {
    department_name: '',
    department_description: '',
    department_color: '#3182CE',
    department_initials: ''
};

const VALIDATION_CONFIG: FormValidationConfig = {
    department_name: {
        required: false,
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
            ValidationRules.maxLength(100, 'Department name must be no more than 100 characters')
        ]
    },
    department_description: {
        required: false,
        rules: [
            ValidationRules.maxLength(500, 'Description must be no more than 500 characters')
        ]
    },
    department_color: {
        required: false,
        rules: [
            {
                validator: (value: string) => !value || /^#[0-9A-Fa-f]{6}$/.test(value),
                message: 'Please enter a valid color code (e.g., #3182CE)',
                code: 'INVALID_COLOR'
            }
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
    
    // Crew bio modal state
    const [isCrewBioModalOpen, setIsCrewBioModalOpen] = useState(false);
    const [selectedCrewMember, setSelectedCrewMember] = useState<any>(null);

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
                department_name: department.department_name || '',
                department_description: department.department_description || '',
                department_color: department.department_color || '#3182CE',
                department_initials: department.department_initials || ''
            });
        }
    }, [department, form.setFormData]);

    // Change detection for save button - same pattern as EditShowPage
    const initialData = department ? {
        department_name: department.department_name || '',
        department_description: department.department_description || '',
        department_color: department.department_color || '#3182CE',
        department_initials: department.department_initials || ''
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
                department_name: form.formData.department_name,
                department_description: form.formData.department_description || null,
                department_color: form.formData.department_color,
                department_initials: form.formData.department_initials || null,
            };

            await form.submitForm(
                `/api/departments/${departmentId}`,
                'PATCH',
                `"${form.formData.department_name}" has been updated successfully`,
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
            form.formData.department_name.trim().length >= 3 &&
            form.formData.department_color.trim().length > 0;
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

            showSuccess('Department Deleted', `"${department.department_name}" has been deleted successfully`);

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

    // Handle opening crew bio modal
    const handleCrewBioClick = useCallback((assignment: any) => {
        // Convert assignment data to crew member format for the modal
        const crewMemberData = {
            user_id: assignment.user_id,
            fullname_first: assignment.fullname_first,
            fullname_last: assignment.fullname_last,
            email_address: assignment.email_address,
            phone_number: assignment.phone_number,
            profile_img_url: assignment.profile_img_url,
            show_id: assignment.show_id, // Include show_id for QR code generation
            // Use actual user data from the assignment
            user_role: assignment.user_role || 'crew',
            user_status: assignment.user_status || 'verified',
            is_active: assignment.is_active ?? true,
            date_created: assignment.date_created || '',
            date_updated: assignment.date_updated || ''
        };
        setSelectedCrewMember(crewMemberData);
        setIsCrewBioModalOpen(true);
    }, []);

    const handleCrewBioModalClose = useCallback(() => {
        setIsCrewBioModalOpen(false);
        setSelectedCrewMember(null);
    }, []);

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
                pageTitle={department?.department_name || 'Department'}
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

                        {/* Basic Information */}
                        <HStack spacing={6} align="start">
                            <EditPageFormField
                                type="input"
                                label="Department Name"
                                value={form.formData.department_name}
                                onChange={(value) => handleChange('department_name', value)}
                                onBlur={() => form.validateField('department_name')}
                                placeholder="Enter department name"
                                isRequired
                                flex="2"
                            />
                            
                            <EditPageFormField
                                type="input"
                                label="Initials"
                                value={form.formData.department_initials}
                                onChange={(value) => handleChange('department_initials', value.toUpperCase())}
                                onBlur={() => form.validateField('department_initials')}
                                placeholder="LX"
                                maxLength={5}
                                flex="1"
                            />
                        </HStack>

                        {/* Color Selection */}
                        <FormControl isRequired>
                            <FormLabel requiredIndicator={<></>}>Department Color</FormLabel>
                            <HStack spacing={2} align="center">
                                <Input
                                    type="color"
                                    value={form.formData.department_color}
                                    onChange={(e) => handleChange('department_color', e.target.value)}
                                    width="80px"
                                    height="40px"
                                    padding="4px"
                                    border="2px solid"
                                    borderColor="gray.300"
                                    borderRadius="md"
                                    cursor="pointer"
                                />
                                <Input
                                    value={form.formData.department_color}
                                    onChange={(e) => handleChange('department_color', e.target.value)}
                                    onBlur={() => form.validateField('department_color')}
                                    placeholder="#3182CE"
                                    width="120px"
                                    fontFamily="mono"
                                />
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
                                        onClick={() => handleChange('department_color', color.value)}
                                        _hover={{ transform: 'scale(1.1)' }}
                                        title={color.name}
                                        tabIndex={-1}
                                    />
                                ))}
                            </HStack>
                        </FormControl>

                        {/* Department Description */}
                        <EditPageFormField
                            type="textarea"
                            label="Department Description"
                            value={form.formData.department_description}
                            onChange={(value) => handleChange('department_description', value)}
                            onBlur={() => form.validateField('department_description')}
                            placeholder="Describe this department's role and responsibilities"
                            minHeight="120px"
                        />

                        {/* Crew Assignments */}
                        {department?.crew_assignments && department.crew_assignments.length > 0 && (
                            <ResponsiveAssignmentList
                                title="Crew Assignments"
                                assignments={department.crew_assignments}
                                onAssignmentClick={handleCrewBioClick}
                                showCrewInfo={true}
                                formatRoleBadge={formatRoleBadge}
                                getShareUrlSuffix={getShareUrlSuffix}
                            />
                        )}
                    </VStack>
                )}
                
                {/* Floating Validation Error Panel */}
                <FloatingValidationErrorPanel fieldErrors={form.fieldErrors} />
            </BaseEditPage>

            {/* Crew Bio Modal */}
            <CrewBioModal
                isOpen={isCrewBioModalOpen}
                onClose={handleCrewBioModalClose}
                crewMember={selectedCrewMember}
                showId={selectedCrewMember?.show_id || ''}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteDepartment}
                isLoading={isDeleting}
                entityType="Department"
                entityName={department?.department_name || ''}
            />
        </ErrorBoundary>
    );
};
