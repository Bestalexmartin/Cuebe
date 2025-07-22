// frontend/src/EditShowPage.tsx

import React, { useEffect, useState } from 'react';
import {
    Flex, Box, Heading, HStack, VStack, Button, Text, Spinner,
    FormControl, FormLabel, Input, Textarea, Select, Divider
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from '@clerk/clerk-react';
import { useShow } from "./hooks/useShow";
import { useValidatedForm } from './hooks/useValidatedForm';
import { useResource } from './hooks/useResource';
import { ValidationRules, FormValidationConfig } from './types/validation';
import { AppIcon } from './components/AppIcon';
import { ActionsMenu, ActionItem } from './components/ActionsMenu';
import { DeleteConfirmationModal } from './components/modals/DeleteConfirmationModal';
import { FinalDeleteConfirmationModal } from './components/modals/FinalDeleteConfirmationModal';
import { useEnhancedToast } from './utils/toastUtils';
import { convertUTCToLocal, convertLocalToUTC } from './utils/dateTimeUtils';

// TypeScript interfaces
interface ShowFormData {
    showName: string;
    showNotes: string;
    showDate: string;
    deadline: string;
    venueID: string;
}

interface Venue {
    venueID: string;
    venueName: string;
}

const INITIAL_FORM_STATE: ShowFormData = {
    showName: '',
    showNotes: '',
    showDate: '',
    deadline: '',
    venueID: ''
};

const VALIDATION_CONFIG: FormValidationConfig = {
    showName: {
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
    showNotes: {
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
            form.setFormData({
                showName: show.showName || '',
                showNotes: show.showNotes || '',
                showDate: convertUTCToLocal(show.showDate),
                deadline: convertUTCToLocal(show.deadline),
                venueID: show.venue?.venueID || ''
            });
        }
    }, [show, form.setFormData]);

    // Handle form field changes
    const handleChange = (field: keyof ShowFormData, value: string) => {
        form.updateField(field, value);
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
            // Prepare data for API (convert venueID to integer if provided)
            const updateData = {
                ...form.formData,
                venueID: form.formData.venueID || null,
                showDate: convertLocalToUTC(form.formData.showDate),
                deadline: convertLocalToUTC(form.formData.deadline),
                showNotes: form.formData.showNotes || null,
            };

            await form.submitForm(
                `/api/shows/${showId}`,
                'PATCH',
                `"${form.formData.showName}" has been updated successfully`,
                updateData
            );

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
        return form.fieldErrors.length === 0 && form.formData.showName.trim().length >= 4;
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

            showSuccess('Show Deleted', `"${show?.showName}" and all associated scripts have been permanently deleted`);

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
        <Flex
            as="form"
            onSubmit={handleSubmit}
            width="100%"
            height="100%"
            p="2rem"
            flexDirection="column"
            boxSizing="border-box"
        >
            {/* Header Section */}
            <Flex justify="space-between" align="center" flexShrink={0}>
                <HStack spacing="2" align="center">
                    <AppIcon name="edit" boxSize="20px" />
                    <Heading as="h2" size="md">
                        {isLoadingShow ? 'Loading...' : `${show?.showName}`}
                    </Heading>
                </HStack>
                <HStack spacing="2">
                    <ActionsMenu actions={actionItems} />
                    <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />
                    <Button
                        onClick={handleClose}
                        size="xs"
                        _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
                    >
                        Cancel
                    </Button>
                    <Button
                        bg="blue.400"
                        color="white"
                        size="xs"
                        _hover={{ bg: 'orange.400' }}
                        type="submit"
                        isLoading={form.isSubmitting}
                        isDisabled={!isFormValid()}
                    >
                        Save Changes
                    </Button>
                </HStack>
            </Flex>

            {/* Form Content Box */}
            <Box
                mt="4"
                border="1px solid"
                borderColor="container.border"
                p="4"
                pb="8"
                borderRadius="md"
                flexGrow={1}
                overflowY="auto"
                className="hide-scrollbar edit-form-container"
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
                        <FormControl isRequired>
                            <FormLabel>Show Name</FormLabel>
                            <Input
                                value={form.formData.showName}
                                onChange={(e) => handleChange('showName', e.target.value)}
                                onPaste={() => handlePaste('showName')}
                                placeholder="Enter show title"
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel>Venue</FormLabel>
                            <Select
                                value={form.formData.venueID}
                                onChange={(e) => handleChange('venueID', e.target.value)}
                                placeholder={isLoadingVenues ? "Loading venues..." : "Select venue"}
                                disabled={isLoadingVenues}
                            >
                                {venues?.map(venue => (
                                    <option key={venue.venueID} value={venue.venueID}>
                                        {venue.venueName}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Date fields side-by-side */}
                        <HStack spacing={4}>
                            <FormControl>
                                <FormLabel>Show Date</FormLabel>
                                <Input
                                    type="datetime-local"
                                    value={form.formData.showDate}
                                    onChange={(e) => handleChange('showDate', e.target.value)}
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

                        {/* Expandable notes textarea */}
                        <FormControl>
                            <FormLabel>Notes</FormLabel>
                            <Textarea
                                value={form.formData.showNotes}
                                onChange={(e) => handleChange('showNotes', e.target.value)}
                                onBlur={() => form.validateField('showNotes')}
                                placeholder="Additional show information, special requirements, etc."
                                minHeight="120px"
                                resize="vertical"
                            />
                        </FormControl>
                    </VStack>
                )}
            </Box>
            
            {/* Floating Validation Error Panel */}
            {form.fieldErrors.length > 0 && (
                <Box
                    mt="4"
                    bg="red.500"
                    color="white"
                    p={4}
                    borderRadius="md"
                    boxShadow="lg"
                    flexShrink={0}
                >
                    <Text fontWeight="semibold" fontSize="sm" display="inline">
                        Validation Errors: 
                    </Text>
                    <Text fontSize="sm" display="inline" ml={1}>
                        {form.fieldErrors.map((error, i) => (
                            <Text key={i} as="span">
                                {i > 0 && '; '}{error.message}
                            </Text>
                        ))}
                    </Text>
                </Box>
            )}

            {/* Delete Confirmation Modals */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={handleDeleteCancel}
                onConfirm={handleInitialDeleteConfirm}
                entityType="Show"
                entityName={show?.showName || ''}
            />

            <FinalDeleteConfirmationModal
                isOpen={isFinalDeleteModalOpen}
                onClose={handleDeleteCancel}
                onConfirm={handleFinalDeleteConfirm}
                isLoading={isDeleting}
                entityType="Show"
                entityName={show?.showName || ''}
                warningMessage={`Deleting this show will also delete ${show?.scripts?.length || 0} ${(show?.scripts?.length || 0) === 1 ? 'script' : 'scripts'} and all related venue, department and crew assignments.`}
            />
        </Flex>
    );
};