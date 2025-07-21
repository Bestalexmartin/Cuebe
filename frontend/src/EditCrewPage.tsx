// frontend/src/EditCrewPage.tsx

import React, { useEffect, useState } from 'react';
import {
    Flex, Box, Heading, HStack, VStack, Button, Text, Spinner,
    FormControl, FormLabel, Input, Textarea, Select, Badge, Avatar, useToast, Divider
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from '@clerk/clerk-react';
import { useCrew } from "./hooks/useCrew";
import { useUser } from '@clerk/clerk-react';
import { useFormManager } from './hooks/useFormManager';
import { AppIcon } from './components/AppIcon';
import { ActionsMenu, ActionItem } from './components/ActionsMenu';
import { DeleteConfirmationModal } from './components/modals/DeleteConfirmationModal';
import { FinalDeleteConfirmationModal } from './components/modals/FinalDeleteConfirmationModal';
import { toastConfig } from './ChakraTheme';

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

// User role options based on typical theatre crew roles
const USER_ROLE_OPTIONS: UserRoleOption[] = [
    { value: 'crew', label: 'Crew Member' },
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
    const toast = useToast();
    const { getToken } = useAuth();
    const { user: clerkUser } = useUser();

    // Delete state management
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isFinalDeleteModalOpen, setIsFinalDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch the initial crew data
    const { crew, isLoading: isLoadingCrew, error: crewError } = useCrew(crewId);

    // Form management
    const {
        formData,
        isSubmitting,
        updateField,
        setFormData,
        submitForm,
    } = useFormManager<CrewFormData>(INITIAL_FORM_STATE);

    // Populate form when crew data loads
    useEffect(() => {
        if (crew) {
            setFormData({
                fullnameFirst: crew.fullnameFirst || '',
                fullnameLast: crew.fullnameLast || '',
                emailAddress: crew.emailAddress || '',
                phoneNumber: crew.phoneNumber || '',
                userRole: crew.userRole || '',
                notes: crew.relationshipNotes || '' // Use relationship notes, not user notes
            });
        }
    }, [crew, setFormData]);

    // Handle form field changes
    const handleChange = (field: keyof CrewFormData, value: string) => {
        updateField(field, value);
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!crewId) return;

        try {
            // Prepare data for API
            const updateData = {
                fullnameFirst: formData.fullnameFirst,
                fullnameLast: formData.fullnameLast,
                emailAddress: formData.emailAddress,
                phoneNumber: formData.phoneNumber || null,
                userRole: formData.userRole,
                notes: formData.notes || null,
            };

            await submitForm(
                `/api/crew/${crewId}`,
                'PATCH',
                `"${formData.fullnameFirst} ${formData.fullnameLast}" has been updated successfully`,
                updateData
            );

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
        return formData.fullnameFirst.trim().length > 0 &&
            formData.fullnameLast.trim().length > 0 &&
            formData.emailAddress.trim().length > 0 &&
            formData.userRole.trim().length > 0;
    };

    const getFullName = (): string => {
        return `${formData.fullnameFirst} ${formData.fullnameLast}`.trim() || 'Crew';
    };

    const isVerifiedUser = (): boolean => {
        return crew?.userStatus === 'verified';
    };

    const isSelfEdit = (): boolean => {
        // Check if the current Clerk user ID matches the crew member's Clerk user ID
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
                throw new Error('Failed to remove crew member');
            }

            toast({
                title: 'Crew Member Removed',
                description: `"${getFullName()}" has been removed from your crew`,
                status: 'success',
                ...toastConfig,
            });

            // Navigate back to dashboard crew view
            navigate('/dashboard', {
                state: { 
                    view: 'crew',
                    returnFromEdit: true 
                }
            });

        } catch (error) {
            console.error('Error removing crew member:', error);
            toast({
                title: 'Error',
                description: 'Failed to remove crew member. Please try again.',
                status: 'error',
                ...toastConfig,
            });
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
                        {isLoadingCrew ? 'Loading...' : getFullName()}
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
                        isLoading={isSubmitting}
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
                borderRadius="md"
                flexGrow={1}
                overflowY="auto"
                className="hide-scrollbar"
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
                    <VStack spacing={6} align="stretch" height="100%">
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
                                            {formatRole(formData.userRole)}
                                        </Text>
                                        <Text fontSize="xs" color="detail.text">
                                            Added: {new Date(crew.dateCreated).toLocaleDateString()}
                                        </Text>
                                    </HStack>
                                    <HStack justify="space-between" width="100%">
                                        <Text fontSize="sm" color="detail.text">
                                            {formData.emailAddress}
                                        </Text>
                                        <Text fontSize="xs" color="detail.text">
                                            Updated: {new Date(crew.dateUpdated).toLocaleDateString()}
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
                                    value={formData.notes}
                                    onChange={(e) => handleChange('notes', e.target.value)}
                                    placeholder="Your private notes about this crew member"
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
                                    value={formData.fullnameFirst}
                                    onChange={(e) => handleChange('fullnameFirst', e.target.value)}
                                    placeholder="Enter first name"
                                    isDisabled={isVerifiedUser() && !isSelfEdit()}
                                    bg={isVerifiedUser() && !isSelfEdit() ? 'gray.100' : undefined}
                                    _dark={{ bg: isVerifiedUser() && !isSelfEdit() ? 'gray.700' : undefined }}
                                />
                            </FormControl>
                            <FormControl isRequired={!(isVerifiedUser() && !isSelfEdit())}>
                                <FormLabel>Last Name</FormLabel>
                                <Input
                                    value={formData.fullnameLast}
                                    onChange={(e) => handleChange('fullnameLast', e.target.value)}
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
                                    value={formData.emailAddress}
                                    onChange={(e) => handleChange('emailAddress', e.target.value)}
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
                                    value={formData.phoneNumber}
                                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
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
                                value={formData.userRole}
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
                            <FormControl display="flex" flexDirection="column" flexGrow={1}>
                                <FormLabel>Personal Notes</FormLabel>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => handleChange('notes', e.target.value)}
                                    placeholder="Your personal notes"
                                    flexGrow={1}
                                    resize="vertical"
                                    minHeight="100px"
                                />
                            </FormControl>
                        )}

                    </VStack>
                )}
            </Box>

            {/* Delete Confirmation Modals */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={handleDeleteCancel}
                onConfirm={handleInitialDeleteConfirm}
                entityType="Crew Member"
                entityName={getFullName()}
            />

            <FinalDeleteConfirmationModal
                isOpen={isFinalDeleteModalOpen}
                onClose={handleDeleteCancel}
                onConfirm={handleFinalDeleteConfirm}
                isLoading={isDeleting}
                entityType="Crew Member"
                entityName={getFullName()}
                warningMessage={`Removing this crew member will delete their relationship to your account and remove them from any show assignments.`}
            />
        </Flex>
    );
};