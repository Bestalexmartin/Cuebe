// frontend/src/CrewCard.tsx

import React from 'react';
import {
    Box,
    Flex,
    HStack,
    VStack,
    Text,
    Badge,
    Collapse,
    Button,
    Heading,
    Avatar
} from "@chakra-ui/react";
import { useUser } from '@clerk/clerk-react';
import { AppIcon } from './components/AppIcon';
import { formatDateTimeLocal } from './utils/dateTimeUtils';

// TypeScript interfaces
interface CrewMember {
    userID: string;
    fullnameFirst?: string;
    fullnameLast?: string;
    emailAddress?: string;
    phoneNumber?: string;
    userRole?: string;
    userStatus?: string;
    isActive?: boolean;
    profileImgURL?: string;
    notes?: string; // User table notes
    relationshipNotes?: string; // Relationship table notes
    clerk_user_id?: string; // To identify if this is the current user
    dateCreated: string;
    dateUpdated: string;
}

interface CrewCardProps {
    crewMember: CrewMember;
    onEdit: (crewId: string) => void;
    onCrewClick: (crewId: string) => void;
    isHovered: boolean;
    isSelected: boolean;
    onHover?: (crewId: string | null) => void;
    onSaveNavigationState?: () => void;
}

export const CrewCard: React.FC<CrewCardProps> = ({
    crewMember,
    onEdit,
    onCrewClick,
    isHovered,
    isSelected,
    onHover,
    onSaveNavigationState
}) => {
    const { user: clerkUser } = useUser();
    const borderColor = isHovered ? 'orange.400' : isSelected ? 'blue.400' : 'gray.600';

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (onSaveNavigationState) {
            onSaveNavigationState();
        }

        onEdit(crewMember.userID);
    };

    const formatRole = (role?: string): string => {
        if (!role) return 'Crew';
        return role.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const getFullName = (): string => {
        const firstName = crewMember.fullnameFirst || '';
        const lastName = crewMember.fullnameLast || '';
        return `${firstName} ${lastName}`.trim() || 'Unknown User';
    };

    const getUserStatusBadge = () => {
        const isVerified = crewMember.userStatus === 'verified';
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

    const getNotesToShow = (): string | undefined => {
        // If this is the current user viewing their own card, always show user notes
        const isCurrentUser = clerkUser && crewMember.clerk_user_id === clerkUser.id;
        if (isCurrentUser) {
            return crewMember.notes; // User table notes
        }

        // For all other users (both verified and guest): show relationship notes
        return crewMember.relationshipNotes; // Relationship table notes
    };

    return (
        <Box
            p="4"
            borderWidth="2px"
            borderRadius="md"
            shadow="sm"
            cursor="pointer"
            borderColor={borderColor}
            _hover={{ borderColor: 'orange.400' }}
            onMouseEnter={() => onHover?.(crewMember.userID)}
            onMouseLeave={() => onHover?.(null)}
            onClick={() => onCrewClick(crewMember.userID)}
        >
            {/* Header Row */}
            <Flex justify="space-between" align="center" mb={4}>
                <Flex align="center" gap="3">
                    <Avatar
                        size="sm"
                        name={getFullName()}
                        src={crewMember.profileImgURL}
                    />
                    <Heading size="sm">{getFullName()}</Heading>
                </Flex>

                <HStack spacing="1" opacity={isSelected ? 1 : 0} pointerEvents={isSelected ? "auto" : "none"}>
                    <Button
                        aria-label="Edit Crew Member"
                        leftIcon={<AppIcon name="edit" boxSize="12px" />}
                        size="xs"
                        onClick={handleEditClick}
                    >
                        Edit
                    </Button>
                </HStack>
            </Flex>

            {/* Info Rows */}
            <VStack align="stretch" spacing="1" fontSize="sm" color="detail.text" ml={4}>
                <HStack spacing="2" align="center">
                    <Badge variant="outline" colorScheme="blue" size="sm">
                        {formatRole(crewMember.userRole)}
                    </Badge>
                    {getUserStatusBadge()}
                    {!crewMember.isActive && (
                        <Badge variant="solid" colorScheme="red" size="sm">
                            Inactive
                        </Badge>
                    )}
                </HStack>

                {/* Handle different combinations of email and phone with dates */}
                {crewMember.emailAddress && crewMember.phoneNumber ? (
                    // Both email and phone present
                    <>
                        <HStack justify="space-between">
                            <Text isTruncated>
                                {crewMember.emailAddress}
                            </Text>
                            <Text fontSize="xs">
                                Created: {formatDateTimeLocal(crewMember.dateCreated)}
                            </Text>
                        </HStack>
                        <HStack justify="space-between">
                            <Text isTruncated>
                                {crewMember.phoneNumber}
                            </Text>
                            <Text fontSize="xs">
                                Updated: {formatDateTimeLocal(crewMember.dateUpdated)}
                            </Text>
                        </HStack>
                    </>
                ) : crewMember.emailAddress ? (
                    // Only email present - need another line for both dates
                    <>
                        <HStack justify="space-between">
                            <Text isTruncated>
                                {crewMember.emailAddress}
                            </Text>
                            <Text fontSize="xs">
                                Created: {formatDateTimeLocal(crewMember.dateCreated)}
                            </Text>
                        </HStack>
                        <HStack justify="flex-end">
                            <Text fontSize="xs">
                                Updated: {formatDateTimeLocal(crewMember.dateUpdated)}
                            </Text>
                        </HStack>
                    </>
                ) : crewMember.phoneNumber ? (
                    // Only phone present - need another line for both dates
                    <>
                        <HStack justify="space-between">
                            <Text isTruncated>
                                {crewMember.phoneNumber}
                            </Text>
                            <Text fontSize="xs">
                                Created: {formatDateTimeLocal(crewMember.dateCreated)}
                            </Text>
                        </HStack>
                        <HStack justify="flex-end">
                            <Text fontSize="xs">
                                Updated: {formatDateTimeLocal(crewMember.dateUpdated)}
                            </Text>
                        </HStack>
                    </>
                ) : (
                    // Neither email nor phone - dates align with badges row and a spacer
                    <>
                        <HStack justify="flex-end">
                            <Text fontSize="xs">
                                Created: {formatDateTimeLocal(crewMember.dateCreated)}
                            </Text>
                        </HStack>
                        <HStack justify="flex-end">
                            <Text fontSize="xs">
                                Updated: {formatDateTimeLocal(crewMember.dateUpdated)}
                            </Text>
                        </HStack>
                    </>
                )}
            </VStack>

            {/* Expandable Details - only show when selected */}
            <Collapse in={isSelected} animateOpacity>
                <VStack align="stretch" spacing="3" mt="4" pt="3" borderTop="1px solid" borderColor="ui.border">

                    {/* Notes Section */}
                    {getNotesToShow() && (
                        <Box>
                            <Text fontWeight="semibold" mb={2}>Notes</Text>
                            <Text fontSize="sm" color="detail.text" ml={4}>
                                {getNotesToShow()}
                            </Text>
                        </Box>
                    )}

                    {/* TODO: Show Assignments section will be added later */}

                </VStack>
            </Collapse>
        </Box>
    );
};