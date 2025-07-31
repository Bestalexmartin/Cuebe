// frontend/src/pages/edit/EditCrewPage.tsx

import React, { useEffect, useState } from 'react';
import {
    Box, HStack, VStack, Text, Spinner, Flex,
    FormControl, FormLabel, Input, Textarea, Select, Badge, Avatar
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from '@clerk/clerk-react';
import { useCrew } from "../../hooks/useCrew";
import { useUser } from '@clerk/clerk-react';
import { useValidatedForm } from '../../hooks/useValidatedForm';
import { ValidationRules, FormValidationConfig } from '../../types/validation';
import { BaseEditPage } from '../../components/base/BaseEditPage';
import { ActionItem } from '../../components/ActionsMenu';
import { DeleteConfirmationModal } from '../../components/modals/DeleteConfirmationModal';
import { FinalDeleteConfirmationModal } from '../../components/modals/FinalDeleteConfirmationModal';
import { useEnhancedToast } from '../../utils/toastUtils';
import { formatDateTimeLocal } from '../../utils/dateTimeUtils';
import { useChangeDetection } from '../../hooks/useChangeDetection';
import { ErrorBoundary } from '../../components/ErrorBoundary';

// TypeScript interfaces
interface CrewFormData {
    fullnameFirst: string;
    fullnameLast: string;
    emailAddress: string;
    phoneNumber: string;
    userRole: string;
    notes: string;
}

interface UserRoleOption {
    value: string;
    label: string;
}

const INITIAL_FORM_STATE: CrewFormData = {
    fullnameFirst: '',
    fullnameLast: '',
    emailAddress: '',
    phoneNumber: '',
    userRole: '',
    notes: ''
};

const VALIDATION_CONFIG: FormValidationConfig = {
    fullnameFirst: {
        required: false,
        rules: [
            {
                validator: (value: string) => {
                    if (!value || value.trim().length === 0) {
                        return true; // Empty is valid
                    }
                    return value.trim().length >= 4; // Must have 4+ chars if not empty
                },
                message: 'First name must be at least 4 characters',
                code: 'MIN_LENGTH'
            },
            ValidationRules.maxLength(50, 'First name must be no more than 50 characters')
        ]
    },
    fullnameLast: {
        required: false,
        rules: [
            {
                validator: (value: string) => {
                    if (!value || value.trim().length === 0) {
                        return true; // Empty is valid
                    }
                    return value.trim().length >= 4; // Must have 4+ chars if not empty
                },
                message: 'Last name must be at least 4 characters',
                code: 'MIN_LENGTH'
            },
            ValidationRules.maxLength(50, 'Last name must be no more than 50 characters')
        ]
    },
    emailAddress: {
        required: false,
        rules: [
            ValidationRules.email('Please enter a valid email address')
        ]
    },
    phoneNumber: {
        required: false,
        rules: [
            ValidationRules.phone('Please enter a valid phone number')
        ]
    },
    notes: {
        required: false,
        rules: [
            ValidationRules.maxLength(1000, 'Notes must be no more than 1000 characters')
        ]
    }
};

// User role options based on typical theatre crew roles
const USER_ROLE_OPTIONS: UserRoleOption[] = [
    { value: 'crew', label: 'Crew' },
    { value: 'assistant_director', label: 'Assistant Director' },
    { value: 'stage_manager', label: 'Stage Manager' },
    { value: 'assistant_stage_manager', label: 'Assistant Stage Manager' },
    { value: 'technical_director', label: 'Technical Director' },
    { value: 'lighting_designer', label: 'Lighting Designer' },
    { value: 'sound_designer', label: 'Sound Designer' },
    { value: 'costume_designer', label: 'Costume Designer' },
    { value: 'set_designer', label: 'Set Designer' },
    { value: 'props_master', label: 'Props Master' },
    { value: 'electrician', label: 'Electrician' },
    { value: 'sound_technician', label: 'Sound Technician' },
    { value: 'wardrobe', label: 'Wardrobe' },
    { value: 'makeup_artist', label: 'Makeup Artist' },
    { value: 'hair_stylist', label: 'Hair Stylist' },
    { value: 'choreographer', label: 'Choreographer' },
    { value: 'music_director', label: 'Music Director' },
    { value: 'producer', label: 'Producer' },
    { value: 'director', label: 'Director' },
    { value: 'other', label: 'Other' }
];

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

    // Fetch the initial crew data
    const { crew, isLoading: isLoadingCrew, error: crewError } = useCrew(crewId);

    // Form management
    const form = useValidatedForm<CrewFormData>(INITIAL_FORM_STATE, {
        validationConfig: VALIDATION_CONFIG,
        validateOnChange: true,
        validateOnBlur: true,
        showFieldErrorsInToast: false
    });

    // Populate form when crew data loads
    useEffect(() => {
        if (crew) {
            form.setFormData({
                fullnameFirst: crew.fullnameFirst || '',
                fullnameLast: crew.fullnameLast || '',
                emailAddress: crew.emailAddress || '',
                phoneNumber: crew.phoneNumber || '',
                userRole: crew.userRole || '',
                notes: crew.relationshipNotes || '' // Use relationship notes, not user notes
            });
        }
    }, [crew, form.setFormData]);

    // Change detection for save button
    const initialData = crew ? {
        fullnameFirst: crew.fullnameFirst || '',
        fullnameLast: crew.fullnameLast || '',
        emailAddress: crew.emailAddress || '',
        phoneNumber: crew.phoneNumber || '',
        userRole: crew.userRole || '',
        notes: crew.relationshipNotes || ''
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

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!crewId) return;

        try {
            // Prepare data for API
            const updateData = {
                fullnameFirst: form.formData.fullnameFirst,
                fullnameLast: form.formData.fullnameLast,
                emailAddress: form.formData.emailAddress,
                phoneNumber: form.formData.phoneNumber || null,
                userRole: form.formData.userRole,
                notes: form.formData.notes || null,
            };

            await form.submitForm(
                `/api/crew/${crewId}`,
                'PATCH',
                `"${form.formData.fullnameFirst} ${form.formData.fullnameLast}" has been updated successfully`,
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
        return form.fieldErrors.length === 0 && 
            form.formData.fullnameFirst.trim().length >= 4 &&
            form.formData.fullnameLast.trim().length >= 4 &&
            form.formData.emailAddress.trim().length > 0 &&
            form.formData.userRole.trim().length > 0;
    };

    const canSave = (): boolean => {
        return isFormValid() && hasChanges;
    };

    const getFullName = (): string => {
        return `${form.formData.fullnameFirst} ${form.formData.fullnameLast}`.trim() || 'Crew';
    };

    const isVerifiedUser = (): boolean => {
        return crew?.userStatus === 'verified';
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
            const response = await fetch(`/api/crew-relationships/${crewId}`, {
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

    const formatRole = (role: string): string => {
        if (!role) return 'Crew';
        return role.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const getUserStatusBadge = () => {
        if (!crew) return null;
        const isVerified = crew.userStatus === 'verified';
        return (
            <Badge
                variant={isVerified ? "solid" : "outline"}
                colorScheme={isVerified ? "green" : "orange"}
                size="sm"
            >
                {isVerified ? "Verified" : "Guest"}
            </Badge>
        );
    };

    return (
        <ErrorBoundary context="Edit Crew Page">
            <BaseEditPage
                pageTitle={getFullName()}
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
                        {/* Profile Preview */}
                        <Box
                            p="4"
                            bg="gray.50"
                            _dark={{ bg: "gray.700" }}
                            borderRadius="md"
                        >
                            <HStack spacing="3" align="start">
                                <Avatar
                                    size="md"
                                    name={getFullName()}
                                    src={crew.profileImgURL}
                                />
                                <VStack align="start" spacing="1" flex="1">
                                    <HStack spacing="2" align="center">
                                        <Text fontWeight="medium">{getFullName()}</Text>
                                        {getUserStatusBadge()}
                                        {!crew.isActive && (
                                            <Badge variant="solid" colorScheme="red" size="sm">
                                                Inactive
                                            </Badge>
                                        )}
                                    </HStack>
                                    <HStack justify="space-between" width="100%">
                                        <Text fontSize="sm" color="detail.text">
                                            {formatRole(form.formData.userRole)}
                                        </Text>
                                         <Text fontSize="xs" color="detail.text">
                                            Updated: {formatDateTimeLocal(crew.dateUpdated)}
                                        </Text>
                                    </HStack>
                                    <HStack justify="space-between" width="100%">
                                        <Text fontSize="sm" color="detail.text">
                                            {form.formData.emailAddress}
                                        </Text>
                                        <Text fontSize="xs" color="detail.text">
                                            Created: {formatDateTimeLocal(crew.dateCreated)}
                                        </Text>
                                    </HStack>
                                </VStack>
                            </HStack>
                        </Box>

                        {/* Manager Notes Section - Move up above contact fields */}
                        {!isSelfEdit() && (
                            <FormControl>
                                <FormLabel>Manager Notes</FormLabel>
                                <Textarea
                                    value={form.formData.notes}
                                    onChange={(e) => handleChange('notes', e.target.value)}
                                    onBlur={() => form.validateField('notes')}
                                    placeholder="Your private notes about this crew"
                                    resize="vertical"
                                    minHeight="100px"
                                />
                            </FormControl>
                        )}

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
                            <FormControl isRequired={!(isVerifiedUser() && !isSelfEdit())}>
                                <FormLabel>First Name</FormLabel>
                                <Input
                                    value={form.formData.fullnameFirst}
                                    onChange={(e) => handleChange('fullnameFirst', e.target.value)}
                                    onBlur={() => form.validateField('fullnameFirst')}
                                    placeholder="Enter first name"
                                    isDisabled={isVerifiedUser() && !isSelfEdit()}
                                    bg={isVerifiedUser() && !isSelfEdit() ? 'gray.100' : undefined}
                                    _dark={{ bg: isVerifiedUser() && !isSelfEdit() ? 'gray.700' : undefined }}
                                />
                            </FormControl>
                            <FormControl isRequired={!(isVerifiedUser() && !isSelfEdit())}>
                                <FormLabel>Last Name</FormLabel>
                                <Input
                                    value={form.formData.fullnameLast}
                                    onChange={(e) => handleChange('fullnameLast', e.target.value)}
                                    onBlur={() => form.validateField('fullnameLast')}
                                    placeholder="Enter last name"
                                    isDisabled={isVerifiedUser() && !isSelfEdit()}
                                    bg={isVerifiedUser() && !isSelfEdit() ? 'gray.100' : undefined}
                                    _dark={{ bg: isVerifiedUser() && !isSelfEdit() ? 'gray.700' : undefined }}
                                />
                            </FormControl>
                        </HStack>

                        {/* Contact Information */}
                        <HStack spacing={4}>
                            <FormControl isRequired={!(isVerifiedUser() && !isSelfEdit())}>
                                <FormLabel>Email Address</FormLabel>
                                <Input
                                    type="email"
                                    value={form.formData.emailAddress}
                                    onChange={(e) => handleChange('emailAddress', e.target.value)}
                                    onBlur={() => form.validateField('emailAddress')}
                                    placeholder="crew@example.com"
                                    isDisabled={isVerifiedUser() && !isSelfEdit()}
                                    bg={isVerifiedUser() && !isSelfEdit() ? 'gray.100' : undefined}
                                    _dark={{ bg: isVerifiedUser() && !isSelfEdit() ? 'gray.700' : undefined }}
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Phone Number</FormLabel>
                                <Input
                                    type="tel"
                                    value={form.formData.phoneNumber}
                                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                                    onBlur={() => form.validateField('phoneNumber')}
                                    placeholder="(555) 123-4567"
                                    isDisabled={isVerifiedUser() && !isSelfEdit()}
                                    bg={isVerifiedUser() && !isSelfEdit() ? 'gray.100' : undefined}
                                    _dark={{ bg: isVerifiedUser() && !isSelfEdit() ? 'gray.700' : undefined }}
                                />
                            </FormControl>
                        </HStack>

                        {/* Role Selection */}
                        <FormControl isRequired={!(isVerifiedUser() && !isSelfEdit())}>
                            <FormLabel>Role</FormLabel>
                            <Select
                                value={form.formData.userRole}
                                onChange={(e) => handleChange('userRole', e.target.value)}
                                placeholder="Select role"
                                isDisabled={isVerifiedUser() && !isSelfEdit()}
                                bg={isVerifiedUser() && !isSelfEdit() ? 'gray.100' : undefined}
                                _dark={{ bg: isVerifiedUser() && !isSelfEdit() ? 'gray.700' : undefined }}
                            >
                                {USER_ROLE_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Personal Notes Section - Only for self-edit */}
                        {isSelfEdit() && (
                            <FormControl>
                                <FormLabel>Personal Notes</FormLabel>
                                <Textarea
                                    value={form.formData.notes}
                                    onChange={(e) => handleChange('notes', e.target.value)}
                                    onBlur={() => form.validateField('notes')}
                                    placeholder="Your personal notes"
                                    resize="vertical"
                                    minHeight="100px"
                                />
                            </FormControl>
                        )}
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
        </ErrorBoundary>
    );
};