// frontend/src/EditCrewPage.jsx

import { useEffect } from 'react';
import {
    Flex, Box, Heading, HStack, VStack, Button, Text, Spinner,
    FormControl, FormLabel, Input, Textarea, Select, Badge, Avatar
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useCrew } from "./hooks/useCrew";
import { useFormManager } from './hooks/useFormManager';
import { AppIcon } from './components/AppIcon';

const INITIAL_FORM_STATE = {
    fullnameFirst: '',
    fullnameLast: '',
    emailAddress: '',
    phoneNumber: '',
    userRole: '',
    notes: ''
};

// User role options based on typical theatre crew roles
const USER_ROLE_OPTIONS = [
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

export const EditCrewPage = () => {
    const { crewId } = useParams();
    const navigate = useNavigate();

    // Fetch the initial crew data
    const { crew, isLoading: isLoadingCrew, error: crewError } = useCrew(crewId);

    // Form management
    const {
        formData,
        isSubmitting,
        updateField,
        setFormData,
        submitForm,
    } = useFormManager(INITIAL_FORM_STATE);

    // Populate form when crew data loads
    useEffect(() => {
        if (crew) {
            setFormData({
                fullnameFirst: crew.fullnameFirst || '',
                fullnameLast: crew.fullnameLast || '',
                emailAddress: crew.emailAddress || '',
                phoneNumber: crew.phoneNumber || '',
                userRole: crew.userRole || '',
                notes: crew.notes || ''
            });
        }
    }, [crew, setFormData]);

    // Handle form field changes
    const handleChange = (field, value) => {
        updateField(field, value);
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

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

    const isFormValid = () => {
        return formData.fullnameFirst.trim() &&
            formData.fullnameLast.trim() &&
            formData.emailAddress.trim() &&
            formData.userRole.trim();
    };

    const getFullName = () => {
        return `${formData.fullnameFirst} ${formData.fullnameLast}`.trim() || 'Crew';
    };

    const formatRole = (role) => {
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
                {isVerified ? "✅ Verified" : "👤 Guest"}
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
                <HStack spacing="3" align="center">
                    <AppIcon name="crew" boxSize="20px" />
                    <Heading as="h2" size="md">
                        {isLoadingCrew ? 'Loading...' : getFullName()}
                    </Heading>
                </HStack>
                <HStack spacing="2">
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
                            <Text fontWeight="semibold" mb="3">Profile Preview</Text>
                            <HStack spacing="3" align="start">
                                <Avatar
                                    size="md"
                                    name={getFullName()}
                                    src={crew.profileImgURL}
                                />
                                <VStack align="start" spacing="1">
                                    <HStack spacing="2" align="center">
                                        <Text fontWeight="medium">{getFullName()}</Text>
                                        {getUserStatusBadge()}
                                        {!crew.isActive && (
                                            <Badge variant="solid" colorScheme="red" size="sm">
                                                Inactive
                                            </Badge>
                                        )}
                                    </HStack>
                                    <Text fontSize="sm" color="gray.600">
                                        {formatRole(formData.userRole)}
                                    </Text>
                                    <Text fontSize="sm" color="gray.500">
                                        {formData.emailAddress}
                                    </Text>
                                </VStack>
                            </HStack>
                        </Box>

                        {/* Basic Information */}
                        <HStack spacing={4}>
                            <FormControl isRequired>
                                <FormLabel>First Name</FormLabel>
                                <Input
                                    value={formData.fullnameFirst}
                                    onChange={(e) => handleChange('fullnameFirst', e.target.value)}
                                    placeholder="Enter first name"
                                />
                            </FormControl>
                            <FormControl isRequired>
                                <FormLabel>Last Name</FormLabel>
                                <Input
                                    value={formData.fullnameLast}
                                    onChange={(e) => handleChange('fullnameLast', e.target.value)}
                                    placeholder="Enter last name"
                                />
                            </FormControl>
                        </HStack>

                        {/* Contact Information */}
                        <HStack spacing={4}>
                            <FormControl isRequired>
                                <FormLabel>Email Address</FormLabel>
                                <Input
                                    type="email"
                                    value={formData.emailAddress}
                                    onChange={(e) => handleChange('emailAddress', e.target.value)}
                                    placeholder="crew@example.com"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Phone Number</FormLabel>
                                <Input
                                    type="tel"
                                    value={formData.phoneNumber}
                                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                                    placeholder="(555) 123-4567"
                                />
                            </FormControl>
                        </HStack>

                        {/* Role Selection */}
                        <FormControl isRequired>
                            <FormLabel>Role</FormLabel>
                            <Select
                                value={formData.userRole}
                                onChange={(e) => handleChange('userRole', e.target.value)}
                                placeholder="Select role"
                            >
                                {USER_ROLE_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Notes */}
                        <FormControl display="flex" flexDirection="column" flexGrow={1}>
                            <FormLabel>Notes</FormLabel>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                placeholder="Additional notes about this crew member..."
                                flexGrow={1}
                                resize="vertical"
                                minHeight="100px"
                            />
                            <Text fontSize="xs" color="gray.500" mt="1">
                                Notes are visible to administrators and can include special skills, availability, or other relevant information.
                            </Text>
                        </FormControl>

                        {/* Account Information (Read-only) */}
                        <Box
                            p="4"
                            bg="gray.50"
                            _dark={{ bg: "gray.700" }}
                            borderRadius="md"
                        >
                            <Text fontWeight="semibold" mb="3">Account Information</Text>
                            <VStack align="stretch" spacing="2" fontSize="sm" color="gray.600">
                                <HStack justify="space-between">
                                    <Text>Account Status:</Text>
                                    <HStack>
                                        {getUserStatusBadge()}
                                        {!crew.isActive && (
                                            <Badge variant="solid" colorScheme="red" size="sm">
                                                Inactive
                                            </Badge>
                                        )}
                                    </HStack>
                                </HStack>
                                <HStack justify="space-between">
                                    <Text>📅 Added:</Text>
                                    <Text fontWeight="medium">
                                        {new Date(crew.dateCreated).toLocaleDateString()}
                                    </Text>
                                </HStack>
                                <HStack justify="space-between">
                                    <Text>🔄 Last Updated:</Text>
                                    <Text fontWeight="medium">
                                        {new Date(crew.dateUpdated).toLocaleDateString()}
                                    </Text>
                                </HStack>
                                {crew.userStatus === 'guest' && (
                                    <Text color="orange.500" fontSize="xs" fontStyle="italic">
                                        💡 Guest users can view their call schedules via shared links but cannot log into the full system.
                                    </Text>
                                )}
                            </VStack>
                        </Box>
                    </VStack>
                )}
            </Box>
        </Flex>
    );
};