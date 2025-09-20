// frontend/src/features/crew/pages/EditCrewPage.tsx

import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, HStack, VStack, Text, Spinner, Flex, Badge
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from '@clerk/clerk-react';
import { useCrew } from "../hooks/useCrew";
import { useUser } from '@clerk/clerk-react';
import { useValidatedFormSchema } from '../../../components/forms/ValidatedForm';
import { BaseEditPage } from '../../../components/base/BaseEditPage';
import { ActionItem } from '../../../components/ActionsMenu';
import { DeleteConfirmationModal } from '../../../components/modals/DeleteConfirmationModal';
import { FinalDeleteConfirmationModal } from '../../../components/modals/FinalDeleteConfirmationModal';
import { useEnhancedToast } from '../../../utils/toastUtils';
import { useChangeDetection } from '../../../hooks/useChangeDetection';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { USER_ROLE_OPTIONS, formatRoleBadge } from '../../../constants/userRoles';
import { CrewBioModal } from '../../shows/components/modals/CrewBioModal';
import { formatShowDateTime } from '../../../utils/timeUtils';
import { FloatingValidationErrorPanel } from '../../../components/base/FloatingValidationErrorPanel';
import { EditPageFormField } from '../../../components/base/EditPageFormField';
import { ResponsiveAssignmentList } from '../../../components/base/ResponsiveAssignmentList';
import { getApiUrl } from '../../../config/api';

// TypeScript interfaces
interface CrewFormData {
    fullname_first: string;
    fullname_last: string;
    email_address: string;
    phone_number: string;
    user_role: string;
    notes: string;
}


const INITIAL_FORM_STATE: CrewFormData = {
    fullname_first: '',
    fullname_last: '',
    email_address: '',
    phone_number: '',
    user_role: '',
    notes: ''
};



export const EditCrewPage: React.FC = () => {
    const { crewId } = useParams<{ crewId: string }>();
    const navigate = useNavigate();
    const { showSuccess, showError } = useEnhancedToast();
    const { getToken } = useAuth();
    const { user: clerkUser } = useUser();

    // Delete state management
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isFinalDeleteModalOpen, setIsFinalDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Crew bio modal state
    const [isCrewBioModalOpen, setIsCrewBioModalOpen] = useState(false);
    const [selectedCrewMember, setSelectedCrewMember] = useState<any>(null);
    
    // Track share URL updates to override stale data
    const [shareUrlOverrides, setShareUrlOverrides] = useState<Record<string, string>>({});

    // Fetch the initial crew data
    const { crew, isLoading: isLoadingCrew, error: crewError } = useCrew(crewId);

    // Form management
    const form = useValidatedFormSchema<CrewFormData>(
        INITIAL_FORM_STATE,
        'crew',
        'crewEdit',
        undefined,
        {
            validateOnBlur: true,
            showFieldErrorsInToast: false
        }
    );

    // Populate form when crew data loads
    useEffect(() => {
        if (crew) {
            form.setFormData({
                fullname_first: crew.fullname_first || '',
                fullname_last: crew.fullname_last || '',
                email_address: crew.email_address || '',
                phone_number: crew.phone_number || '',
                user_role: crew.user_role || '',
                notes: crew.relationship_notes || '' // Use relationship notes, not user notes
            });
        }
    }, [crew, form.setFormData]);

    // Change detection for save button
    const initialData = crew ? {
        fullname_first: crew.fullname_first || '',
        fullname_last: crew.fullname_last || '',
        email_address: crew.email_address || '',
        phone_number: crew.phone_number || '',
        user_role: crew.user_role || '',
        notes: crew.relationship_notes || ''
    } : null;

    const { hasChanges, updateOriginalData } = useChangeDetection(
        initialData,
        form.formData,
        true // Always active for crew editing
    );

    // Handle form field changes
    const handleChange = (field: keyof CrewFormData, value: string) => {
        form.updateField(field, value);
    };

    // Helper function to get field error message
    const getFieldError = (fieldName: string): string | undefined => {
        const error = form.fieldErrors.find(err => err.field === fieldName);
        return error?.message;
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!crewId) return;

        try {
            // Prepare data for API
            const updateData = {
                fullname_first: form.formData.fullname_first,
                fullname_last: form.formData.fullname_last,
                email_address: form.formData.email_address,
                phone_number: form.formData.phone_number || null,
                user_role: form.formData.user_role,
                notes: form.formData.notes || null,
            };

            await form.submitForm(
                `/api/crew/${crewId}`,
                'PATCH',
                `"${form.formData.fullname_first} ${form.formData.fullname_last}" has been updated successfully`,
                updateData
            );

            // Update original data to reflect the new saved state
            updateOriginalData(form.formData);

            // Navigate back to dashboard on success
            navigate('/dashboard', {
                state: {
                    view: 'crew',
                    selectedCrewId: crewId,
                    returnFromEdit: true
                }
            });

        } catch (error) {
            // Error handling is done in submitForm
        }
    };

    const handleClose = () => {
        navigate('/dashboard', {
            state: {
                view: 'crew',
                selectedCrewId: crewId,
                returnFromEdit: true
            }
        });
    };

    const isFormValid = (): boolean => {
        // Check if there are any validation errors
        if (form.fieldErrors.length > 0) {
            return false;
        }

        // Check required fields have minimum content
        const requiredFieldsValid =
            form.formData.fullname_first.trim().length >= 4 &&
            form.formData.fullname_last.trim().length >= 4 &&
            form.formData.email_address.trim().length > 0 &&
            form.formData.user_role.trim().length > 0;

        return requiredFieldsValid;
    };

    const canSave = (): boolean => {
        return isFormValid() && hasChanges;
    };

    const getFullName = (): string => {
        return `${form.formData.fullname_first} ${form.formData.fullname_last}`.trim() || 'Crew';
    };

    const isVerifiedUser = (): boolean => {
        return crew?.user_status === 'verified';
    };

    const isSelfEdit = (): boolean => {
        if (!clerkUser || !crew) return false;
        return crew.clerk_user_id === clerkUser.id;
    };

    // Delete functionality
    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    const handleInitialDeleteConfirm = () => {
        setIsDeleteModalOpen(false);
        setIsFinalDeleteModalOpen(true);
    };

    const handleFinalDeleteConfirm = async () => {
        if (!crewId) return;

        setIsDeleting(true);
        try {
            const token = await getToken();
            if (!token) {
                throw new Error('Authentication token not available');
            }

            // DELETE the crew relationship (not the user)
            const response = await fetch(getApiUrl(`/api/crew-relationships/${crewId}`), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to remove crew');
            }

            showSuccess('Crew Removed', `"${getFullName()}" has been removed from your crew`);

            // Navigate back to dashboard crew view
            navigate('/dashboard', {
                state: { 
                    view: 'crew',
                    returnFromEdit: true 
                }
            });

        } catch (error) {
            console.error('Error removing crew:', error);
            showError('Failed to remove crew. Please try again.');
        } finally {
            setIsDeleting(false);
            setIsFinalDeleteModalOpen(false);
        }
    };

    const handleDeleteCancel = () => {
        setIsDeleteModalOpen(false);
        setIsFinalDeleteModalOpen(false);
    };

    // Handle opening crew bio modal
    const handleCrewBioClick = useCallback((assignment: any) => {
        // Convert assignment data to crew member format for the modal
        const crewMemberData = {
            user_id: crew?.user_id,
            fullname_first: crew?.fullname_first,
            fullname_last: crew?.fullname_last,
            email_address: crew?.email_address,
            phone_number: crew?.phone_number,
            profile_img_url: crew?.profile_img_url,
            show_id: assignment.show_id, // Include show_id for QR code generation
            // Use actual user data from the crew
            user_role: crew?.user_role || 'crew',
            user_status: crew?.user_status || 'verified',
            is_active: crew?.is_active ?? true,
            date_created: crew?.date_created || '',
            date_updated: crew?.date_updated || ''
        };
        setSelectedCrewMember(crewMemberData);
        setIsCrewBioModalOpen(true);
    }, [crew]);

    const handleCrewBioModalClose = useCallback(() => {
        setIsCrewBioModalOpen(false);
        setSelectedCrewMember(null);
    }, []);

    // Handle share URL refresh - update the specific assignment's share_url
    const handleShareUrlRefresh = useCallback(async () => {
        if (!selectedCrewMember?.show_id || !crew?.user_id) return;
        
        try {
            const token = await getToken();
            if (!token) return;
            
            // Force refresh the share token
            const response = await fetch(getApiUrl(`/api/shows/${selectedCrewMember.show_id}/crew/${crew.user_id}/share?force_refresh=true`), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const shareData = await response.json();
                // Store the updated share URL for this assignment (using show_id as key for crew assignments)
                setShareUrlOverrides(prev => ({
                    ...prev,
                    [selectedCrewMember.show_id]: shareData.share_url
                }));
                
                showSuccess(
                    "Link Refreshed",
                    `A new sharing link has been ${shareData.action}`
                );
            }
        } catch (error) {
            console.error('Error refreshing link:', error);
            showError("Failed to refresh sharing link. Please try again.");
        }
    }, [selectedCrewMember, crew, getToken, showSuccess, showError]);

    // Actions menu items
    const actionItems: ActionItem[] = [
        {
            id: 'remove',
            label: 'Remove from Crew',
            onClick: handleDeleteClick,
            isDestructive: true,
            isDisabled: isSelfEdit()
        }
    ];


    const getUserStatusBadge = () => {
        if (!crew) return null;
        const isVerified = crew.user_status === 'verified';
        return (
            <Badge
                variant={isVerified ? "solid" : "outline"}
                colorScheme={isVerified ? "green" : "orange"}
                size="md"
                fontSize="sm"
            >
                {isVerified ? "Verified" : "Guest"}
            </Badge>
        );
    };

    return (
        <ErrorBoundary context="Edit Crew Page">
            <BaseEditPage
                pageTitle={getFullName()}
                headerBadge={getUserStatusBadge()}
                onSubmit={handleSubmit}
                isLoading={isLoadingCrew}
                primaryAction={{
                    label: "Save Changes",
                    variant: "primary",
                    type: "submit",
                    isLoading: form.isSubmitting,
                    isDisabled: !canSave()
                }}
                secondaryActions={[
                    {
                        label: "Cancel",
                        variant: "outline",
                        onClick: handleClose
                    }
                ]}
                menuActions={actionItems}
            >
                {/* Loading State */}
                {isLoadingCrew && (
                    <Flex justify="center" align="center" height="200px">
                        <Spinner />
                    </Flex>
                )}

                {/* Error State */}
                {crewError && (
                    <Text color="red.500" textAlign="center" p="4">
                        {crewError}
                    </Text>
                )}

                {/* Form Content */}
                {!isLoadingCrew && crew && (
                    <VStack spacing={6} align="stretch">

                        {/* Contact Information Explanation for Verified Users (Manager Edit Only) */}
                        {isVerifiedUser() && !isSelfEdit() && (
                            <Box
                                p="3"
                                bg="blue.400"
                                borderRadius="md"
                            >
                                <Text fontSize="sm" color="white" fontWeight="medium" textAlign="center">
                                    <strong>Verified User: Personal information is managed by the user and cannot be edited.</strong>
                                </Text>
                            </Box>
                        )}

                        {/* Basic Information */}
                        <HStack spacing={4}>
                            <EditPageFormField
                                type="input"
                                label="First Name"
                                value={form.formData.fullname_first}
                                onChange={(value) => handleChange('fullname_first', value)}
                                onBlur={() => form.touchField('fullname_first')}
                                placeholder="Enter first name"
                                isRequired={!(isVerifiedUser() && !isSelfEdit())}
                                isDisabled={isVerifiedUser() && !isSelfEdit()}
                                bg={isVerifiedUser() && !isSelfEdit() ? 'gray.100' : undefined}
                                _dark={{ bg: isVerifiedUser() && !isSelfEdit() ? 'gray.700' : undefined }}
                                error={getFieldError('fullname_first')}
                            />
                            <EditPageFormField
                                type="input"
                                label="Last Name"
                                value={form.formData.fullname_last}
                                onChange={(value) => handleChange('fullname_last', value)}
                                onBlur={() => form.touchField('fullname_last')}
                                placeholder="Enter last name"
                                isRequired={!(isVerifiedUser() && !isSelfEdit())}
                                isDisabled={isVerifiedUser() && !isSelfEdit()}
                                bg={isVerifiedUser() && !isSelfEdit() ? 'gray.100' : undefined}
                                _dark={{ bg: isVerifiedUser() && !isSelfEdit() ? 'gray.700' : undefined }}
                                error={getFieldError('fullname_last')}
                            />
                        </HStack>

                        {/* Contact Information */}
                        <HStack spacing={4}>
                            <EditPageFormField
                                type="input"
                                inputType="email"
                                label="Email Address"
                                value={form.formData.email_address}
                                onChange={(value) => handleChange('email_address', value)}
                                onBlur={() => form.touchField('email_address')}
                                placeholder="crew@example.com"
                                isRequired={!(isVerifiedUser() && !isSelfEdit())}
                                isDisabled={isVerifiedUser() && !isSelfEdit()}
                                bg={isVerifiedUser() && !isSelfEdit() ? 'gray.100' : undefined}
                                _dark={{ bg: isVerifiedUser() && !isSelfEdit() ? 'gray.700' : undefined }}
                                error={getFieldError('email_address')}
                            />
                            <EditPageFormField
                                type="input"
                                inputType="tel"
                                label="Phone Number"
                                value={form.formData.phone_number}
                                onChange={(value) => handleChange('phone_number', value)}
                                onBlur={() => form.touchField('phone_number')}
                                placeholder="(555) 123-4567"
                                isDisabled={isVerifiedUser() && !isSelfEdit()}
                                bg={isVerifiedUser() && !isSelfEdit() ? 'gray.100' : undefined}
                                _dark={{ bg: isVerifiedUser() && !isSelfEdit() ? 'gray.700' : undefined }}
                                error={getFieldError('phone_number')}
                            />
                        </HStack>

                        {/* Role Selection */}
                        <EditPageFormField
                            type="select"
                            label="Role"
                            value={form.formData.user_role}
                            onChange={(value) => handleChange('user_role', value)}
                            placeholder="Select role"
                            options={USER_ROLE_OPTIONS}
                            isRequired={!(isVerifiedUser() && !isSelfEdit())}
                            isDisabled={isVerifiedUser() && !isSelfEdit()}
                            bg={isVerifiedUser() && !isSelfEdit() ? 'gray.100' : undefined}
                            _dark={{ bg: isVerifiedUser() && !isSelfEdit() ? 'gray.700' : undefined }}
                            error={getFieldError('user_role')}
                        />

                        {/* Notes Section - Personal notes for self-edit, Manager notes for manager edit */}
                        <EditPageFormField
                            type="textarea"
                            label={isSelfEdit() ? 'Personal Notes' : 'Manager Notes'}
                            value={form.formData.notes}
                            onChange={(value) => handleChange('notes', value)}
                            onBlur={() => form.touchField('notes')}
                            placeholder={isSelfEdit() ? "Your personal notes" : "Your private notes about this crew"}
                            minHeight="100px"
                            error={getFieldError('notes')}
                        />

                        {/* Department Assignments */}
                        {crew?.department_assignments && crew.department_assignments.length > 0 && (
                            <ResponsiveAssignmentList
                                title="Department Assignments"
                                assignments={crew.department_assignments.map(assignment => ({
                                    ...assignment,
                                    share_url: shareUrlOverrides[assignment.show_id] || ''
                                }))}
                                onAssignmentClick={handleCrewBioClick}
                                showDepartmentInfo={true}
                                formatRoleBadge={formatRoleBadge}
                                formatDateTime={formatShowDateTime}
                            />
                        )}
                    </VStack>
                )}
                
                {/* Floating Validation Error Panel */}
                <FloatingValidationErrorPanel fieldErrors={form.fieldErrors} />
            </BaseEditPage>

            {/* Delete Confirmation Modals */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={handleDeleteCancel}
                onConfirm={handleInitialDeleteConfirm}
                entityType="Crew"
                entityName={getFullName()}
            />

            <FinalDeleteConfirmationModal
                isOpen={isFinalDeleteModalOpen}
                onClose={handleDeleteCancel}
                onConfirm={handleFinalDeleteConfirm}
                isLoading={isDeleting}
                entityType="Crew"
                entityName={getFullName()}
                warningMessage={`Removing this crew will delete their relationship to your account and remove them from any show assignments.`}
            />

            {/* Crew Bio Modal */}
            <CrewBioModal
                isOpen={isCrewBioModalOpen}
                onClose={handleCrewBioModalClose}
                crewMember={selectedCrewMember}
                showId={selectedCrewMember?.show_id || ''}
                onShareUrlRefresh={handleShareUrlRefresh}
            />
        </ErrorBoundary>
    );
};
