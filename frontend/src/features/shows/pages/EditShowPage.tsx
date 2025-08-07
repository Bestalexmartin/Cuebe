// frontend/src/features/shows/pages/EditShowPage.tsx

import React, { useEffect, useState } from 'react';
import {
    Box, VStack, HStack, Text, Spinner, Flex,
    FormControl, FormLabel, Input, Textarea, Select
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from '@clerk/clerk-react';
import { useShow } from "../hooks/useShow";
import { useValidatedForm } from '../../../hooks/useValidatedForm';
import { useResource } from '../../../hooks/useResource';
import { ValidationRules, FormValidationConfig } from '../../../types/validation';
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

// TypeScript interfaces
interface ShowFormData {
    show_name: string;
    show_notes: string;
    show_date: string;
    show_duration: string;  // End Time of show
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
    show_duration: '',  // End Time of show
    deadline: '',
    venue_id: '',
    crew_assignments: []
};

const VALIDATION_CONFIG: FormValidationConfig = {
    show_name: {
        required: false, // Handle through custom minLength rule
        rules: [
            // Custom minLength rule that requires at least 4 characters (empty is allowed)
            {
                validator: (value: string) => {
                    if (!value || value.trim().length === 0) {
                        return true; // Empty is valid
                    }
                    return value.trim().length >= 4; // Must have 4+ chars if not empty
                },
                message: 'Show name must be at least 4 characters',
                code: 'MIN_LENGTH'
            },
            ValidationRules.maxLength(100, 'Show name must be no more than 100 characters')
        ]
    },
    show_notes: {
        required: false,
        rules: [
            ValidationRules.maxLength(500, 'Notes must be no more than 500 characters')
        ]
    }
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
    const form = useValidatedForm<ShowFormData>(INITIAL_FORM_STATE, {
        validationConfig: VALIDATION_CONFIG,
        validateOnChange: true, // Re-enabled with fixed timing
        validateOnBlur: true,
        showFieldErrorsInToast: false
    });

    // Populate form when show data loads
    useEffect(() => {
        if (show) {
            // Convert show crew assignments to CrewAssignmentRow format
            const crewAssignmentRows = show.crew?.map(assignment => ({
                id: assignment.assignment_id,
                department_id: assignment.department_id,
                crew_member_ids: [assignment.user_id],
                role: assignment.show_role || '',
                isNew: false as boolean,
                isSelected: false as boolean
            })) || [];

            form.setFormData({
                show_name: show.show_name || '',
                show_notes: show.show_notes || '',
                show_date: convertUTCToLocal(show.show_date),
                show_duration: '',
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
        show_duration: '',
        deadline: convertUTCToLocal(show.deadline),
        venue_id: show.venue?.venue_id || '',
        crew_assignments: show.crew?.map(assignment => ({
            id: assignment.assignment_id,
            department_id: assignment.department_id,
            crew_member_ids: [assignment.user_id],
            role: assignment.show_role || '',
            isNew: false as boolean,
            isSelected: false as boolean
        })) || []
    } : null;

    const { hasChanges, updateOriginalData } = useChangeDetection(
        initialData,
        {
            ...form.formData,
            crew_assignments: form.formData.crew_assignments.map(assignment => ({
                ...assignment,
                isNew: assignment.isNew || false,
                isSelected: assignment.isSelected || false
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
                show_duration: convertLocalToUTC(form.formData.show_duration),
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
                    isNew: assignment.isNew || false,
                    isSelected: assignment.isSelected || false
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
                            <FormControl isRequired>
                                <FormLabel>Show Name</FormLabel>
                                <Input
                                    value={form.formData.show_name}
                                    onChange={(e) => handleChange('show_name', e.target.value)}
                                    onPaste={() => handlePaste('show_name')}
                                    placeholder="Enter show title"
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel>Venue</FormLabel>
                                <Select
                                    value={form.formData.venue_id}
                                    onChange={(e) => handleChange('venue_id', e.target.value)}
                                    placeholder={isLoadingVenues ? "Loading venues..." : "Select venue"}
                                    disabled={isLoadingVenues}
                                >
                                    {venues?.map(venue => (
                                        <option key={venue.venue_id} value={venue.venue_id}>
                                            {venue.venue_name}
                                        </option>
                                    ))}
                                </Select>
                            </FormControl>
                        </HStack>

                        {/* Date fields side-by-side */}
                        <HStack spacing={4}>
                            <FormControl>
                                <FormLabel>Show Date</FormLabel>
                                <Input
                                    type="datetime-local"
                                    value={form.formData.show_date}
                                    onChange={(e) => handleChange('show_date', e.target.value)}
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>End Time</FormLabel>
                                <Input
                                    type="datetime-local"
                                    value={form.formData.show_duration}
                                    onChange={(e) => handleChange('show_duration', e.target.value)}
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Script Deadline</FormLabel>
                                <Input
                                    type="datetime-local"
                                    value={form.formData.deadline}
                                    onChange={(e) => handleChange('deadline', e.target.value)}
                                />
                            </FormControl>
                        </HStack>

                        {/* Notes textarea - 3 rows high */}
                        <FormControl>
                            <FormLabel>Notes</FormLabel>
                            <Textarea
                                value={form.formData.show_notes}
                                onChange={(e) => handleChange('show_notes', e.target.value)}
                                onBlur={() => form.validateField('show_notes')}
                                placeholder="Additional show information, special requirements, etc."
                                rows={3}
                                resize="vertical"
                            />
                        </FormControl>

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
