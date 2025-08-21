// frontend/src/features/shows/pages/EditShowPage.tsx

import React, { useEffect, useState } from 'react';
import {
    Box, VStack, HStack, Text, Spinner, Flex
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from '@clerk/clerk-react';
import { useShow } from "../hooks/useShow";
import { useResource } from '../../../hooks/useResource';
import { useValidatedFormSchema } from '../../../components/forms/ValidatedForm';
import { BaseEditPage } from '../../../components/base/BaseEditPage';
import { ActionItem } from '../../../components/ActionsMenu';
import { DeleteConfirmationModal } from '../../../components/modals/DeleteConfirmationModal';
import { FinalDeleteConfirmationModal } from '../../../components/modals/FinalDeleteConfirmationModal';
import { useEnhancedToast } from '../../../utils/toastUtils';
import { convertUTCToLocal, convertLocalToUTC } from '../../../utils/dateTimeUtils';
import { useChangeDetection } from '../../../hooks/useChangeDetection';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { CrewAssignmentSection } from '../components/CrewAssignmentSection';
import { CrewAssignmentRow } from '../types/crewAssignments';
import { FloatingValidationErrorPanel } from '../../../components/base/FloatingValidationErrorPanel';
import { EditPageFormField } from '../../../components/base/EditPageFormField';

// TypeScript interfaces
interface ShowFormData {
    show_name: string;
    show_notes: string;
    show_date: string;
    show_end: string;  // End Time of show
    deadline: string;
    venue_id: string;
    crew_assignments: CrewAssignmentRow[];
}

interface Venue {
    venue_id: string;
    venue_name: string;
}

const INITIAL_FORM_STATE: ShowFormData = {
    show_name: '',
    show_notes: '',
    show_date: '',
    show_end: '',  // End Time of show
    deadline: '',
    venue_id: '',
    crew_assignments: []
};


export const EditShowPage: React.FC = () => {
    const { showId } = useParams<{ showId: string }>();
    const navigate = useNavigate();
    const { showSuccess, showError } = useEnhancedToast();
    const { getToken } = useAuth();

    // Delete state management
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isFinalDeleteModalOpen, setIsFinalDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Remove separate crew assignments state - now part of form data

    // Fetch the initial show data
    const { show, isLoading: isLoadingShow, error: showLoadError } = useShow(showId);

    // Fetch venues for the dropdown
    const {
        data: venues,
        isLoading: isLoadingVenues
    } = useResource<Venue>('/api/me/venues');

    // Form management
    const form = useValidatedFormSchema<ShowFormData>(
        INITIAL_FORM_STATE,
        'show',
        'show',
        undefined,
        {
            validateOnBlur: true,
            showFieldErrorsInToast: false
        }
    );

    // Populate form when show data loads
    useEffect(() => {
        if (show) {
            // Convert show crew assignments to CrewAssignmentRow format
            const crewAssignmentRows = show.crew?.map(assignment => ({
                id: assignment.assignment_id,
                department_id: assignment.department_id,
                crew_member_ids: [assignment.user_id],
                role: assignment.show_role || '',
                isNew: false as boolean
            })) || [];

            form.setFormData({
                show_name: show.show_name || '',
                show_notes: show.show_notes || '',
                show_date: convertUTCToLocal(show.show_date),
                show_end: convertUTCToLocal(show.show_end) || '',
                deadline: convertUTCToLocal(show.deadline),
                venue_id: show.venue?.venue_id || '',
                crew_assignments: crewAssignmentRows
            });
        }
    }, [show, form.setFormData]);

    // Change detection for save button
    const initialData = show ? {
        show_name: show.show_name || '',
        show_notes: show.show_notes || '',
        show_date: convertUTCToLocal(show.show_date),
        show_end: convertUTCToLocal(show.show_end) || '',
        deadline: convertUTCToLocal(show.deadline),
        venue_id: show.venue?.venue_id || '',
        crew_assignments: show.crew?.map(assignment => ({
            id: assignment.assignment_id,
            department_id: assignment.department_id,
            crew_member_ids: [assignment.user_id],
            role: assignment.show_role || '',
            isNew: false as boolean
        })) || []
    } : null;

    const { hasChanges, updateOriginalData } = useChangeDetection(
        initialData,
        {
            ...form.formData,
            crew_assignments: form.formData.crew_assignments.map(assignment => ({
                ...assignment,
                isNew: assignment.isNew || false
            }))
        },
        true // Always active for show editing
    );

    // Handle form field changes
    const handleChange = (field: keyof ShowFormData, value: string) => {
        form.updateField(field, value);
    };

    // Handle crew assignment changes
    const handleCrewAssignmentsChange = (assignments: CrewAssignmentRow[]) => {
        form.updateField('crew_assignments', assignments);
    };
    
    // Handle paste events specifically
    const handlePaste = (field: keyof ShowFormData) => {
        // Use a small delay to ensure paste content is processed
        setTimeout(() => {
            form.validateField(field as string);
        }, 10);
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!showId) return;

        try {
            // Prepare show data for API (exclude crew_assignments)
            const showUpdateData = {
                show_name: form.formData.show_name,
                show_notes: form.formData.show_notes || null,
                show_date: convertLocalToUTC(form.formData.show_date),
                show_end: convertLocalToUTC(form.formData.show_end),
                deadline: convertLocalToUTC(form.formData.deadline),
                venue_id: form.formData.venue_id || null,
            };

            // Prepare crew assignments for API
            const crewAssignmentsData = form.formData.crew_assignments.map(assignment => ({
                assignment_id: assignment.isNew ? undefined : assignment.id,
                show_id: showId,
                user_id: assignment.crew_member_ids[0],
                department_id: assignment.department_id,
                show_role: assignment.role || null,
                is_active: true
            }));

            // Save show data
            await form.submitForm(
                `/api/shows/${showId}`,
                'PATCH',
                `"${form.formData.show_name}" has been updated successfully`,
                showUpdateData
            );

            // Save crew assignments separately
            if (crewAssignmentsData.length > 0) {
                const token = await getToken();
                const response = await fetch(`/api/shows/${showId}/crew-assignments`, {
                    method: 'PUT', // Use PUT to replace all assignments
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ assignments: crewAssignmentsData })
                });

                if (!response.ok) {
                    throw new Error('Failed to save crew assignments');
                }

            }

            // Update original data to reflect the new saved state
            updateOriginalData({
                ...form.formData,
                crew_assignments: form.formData.crew_assignments.map(assignment => ({
                    ...assignment,
                    isNew: assignment.isNew || false
                }))
            });

            // Navigate back to dashboard on success
            navigate('/dashboard', {
                state: {
                    view: 'shows',
                    selectedShowId: showId,
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
                view: 'shows',
                selectedShowId: showId,
                returnFromEdit: true
            }
        });
    };

    const isFormValid = (): boolean => {
        // Now rely entirely on the validation system
        return form.fieldErrors.length === 0 && form.formData.show_name.trim().length >= 4;
    };

    const canSave = (): boolean => {
        return isFormValid() && hasChanges;
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
        if (!showId) return;

        setIsDeleting(true);
        try {
            const token = await getToken();
            if (!token) {
                throw new Error('Authentication token not available');
            }

            const response = await fetch(`/api/shows/${showId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete show');
            }

            showSuccess('Show Deleted', `"${show?.show_name}" and all associated scripts have been permanently deleted`);

            // Navigate back to dashboard
            navigate('/dashboard', {
                state: { view: 'shows' }
            });

        } catch (error) {
            console.error('Error deleting show:', error);
            showError('Failed to delete show. Please try again.');
        } finally {
            setIsDeleting(false);
            setIsFinalDeleteModalOpen(false);
        }
    };

    const handleDeleteCancel = () => {
        setIsDeleteModalOpen(false);
        setIsFinalDeleteModalOpen(false);
    };

    // Actions menu items
    const actionItems: ActionItem[] = [
        {
            id: 'delete',
            label: 'Delete Show',
            onClick: handleDeleteClick,
            isDestructive: true
        }
    ];

    const isLoading = isLoadingShow || isLoadingVenues;

    return (
        <ErrorBoundary context="Edit Show Page">
            <BaseEditPage
                pageTitle={show?.show_name || 'Show'}
                onSubmit={handleSubmit}
                isLoading={isLoadingShow}
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
                {isLoading && (
                    <Flex justify="center" align="center" height="200px">
                        <Spinner />
                    </Flex>
                )}

                {/* Error State */}
                {showLoadError && (
                    <Text color="red.500" textAlign="center" p="4">
                        {showLoadError}
                    </Text>
                )}

                {/* Form Content */}
                {!isLoading && show && (
                    <VStack spacing={4} align="stretch">
                        {/* Show Name and Venue on same line */}
                        <HStack spacing={4}>
                            <EditPageFormField
                                type="input"
                                label="Show Name"
                                value={form.formData.show_name}
                                onChange={(value) => handleChange('show_name', value)}
                                onPaste={() => handlePaste('show_name')}
                                placeholder="Enter show title"
                                isRequired
                            />

                            <EditPageFormField
                                type="select"
                                label="Venue"
                                value={form.formData.venue_id}
                                onChange={(value) => handleChange('venue_id', value)}
                                placeholder={isLoadingVenues ? "Loading venues..." : "Select venue"}
                                options={venues?.map(venue => ({ value: venue.venue_id, label: venue.venue_name })) || []}
                                isDisabled={isLoadingVenues}
                            />
                        </HStack>

                        {/* Date fields side-by-side */}
                        <HStack spacing={4}>
                            <EditPageFormField
                                type="input"
                                inputType="datetime-local"
                                label="Show Date"
                                value={form.formData.show_date}
                                onChange={(value) => handleChange('show_date', value)}
                            />
                            <EditPageFormField
                                type="input"
                                inputType="datetime-local"
                                label="End Time"
                                value={form.formData.show_end}
                                onChange={(value) => handleChange('show_end', value)}
                            />
                            <EditPageFormField
                                type="input"
                                inputType="datetime-local"
                                label="Script Deadline"
                                value={form.formData.deadline}
                                onChange={(value) => handleChange('deadline', value)}
                            />
                        </HStack>

                        {/* Notes textarea - 3 rows high */}
                        <EditPageFormField
                            type="textarea"
                            label="Notes"
                            value={form.formData.show_notes}
                            onChange={(value) => handleChange('show_notes', value)}
                            onBlur={() => form.validateField('show_notes')}
                            placeholder="Additional show information, special requirements, etc."
                            rows={3}
                        />

                        {/* Crew Assignments Section */}
                        <Box mt={6}>
                            <CrewAssignmentSection
                                showId={showId || ''}
                                assignments={form.formData.crew_assignments}
                                onAssignmentsChange={handleCrewAssignmentsChange}
                            />
                        </Box>
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
                entityType="Show"
                entityName={show?.show_name || ''}
            />

            <FinalDeleteConfirmationModal
                isOpen={isFinalDeleteModalOpen}
                onClose={handleDeleteCancel}
                onConfirm={handleFinalDeleteConfirm}
                isLoading={isDeleting}
                entityType="Show"
                entityName={show?.show_name || ''}
                warningMessage={`Deleting this show will also delete ${show?.scripts?.length || 0} ${(show?.scripts?.length || 0) === 1 ? 'script' : 'scripts'} and all related venue, department and crew assignments.`}
            />
        </ErrorBoundary>
    );
};
