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
import { AppIcon } from './components/AppIcon';

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
    notes?: string;
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

                {/* Email - always show if present */}
                {crewMember.emailAddress && (
                    crewMember.phoneNumber ? (
                        // Has both email and phone - email gets its own line
                        <Text isTruncated>
                            {crewMember.emailAddress}
                        </Text>
                    ) : (
                        // Has email but no phone - email gets the updated date
                        <HStack justify="space-between">
                            <Text isTruncated>
                                {crewMember.emailAddress}
                            </Text>
                            <Text fontSize="xs">
                                Updated: {new Date(crewMember.dateUpdated).toLocaleDateString()}
                            </Text>
                        </HStack>
                    )
                )}

                {/* Phone - always gets updated date if it's the last item */}
                {crewMember.phoneNumber && (
                    <HStack justify="space-between">
                        <Text isTruncated>
                            {crewMember.phoneNumber}
                        </Text>
                        <Text fontSize="xs">
                            Updated: {new Date(crewMember.dateUpdated).toLocaleDateString()}
                        </Text>
                    </HStack>
                )}

                {/* If neither email nor phone, put updated date on badges row */}
                {!crewMember.emailAddress && !crewMember.phoneNumber && (
                    <Flex justify="flex-end">
                        <Text fontSize="xs">
                            Updated: {new Date(crewMember.dateUpdated).toLocaleDateString()}
                        </Text>
                    </Flex>
                )}
            </VStack>

            {/* Expandable Details - only show when selected */}
            <Collapse in={isSelected} animateOpacity>
                <VStack align="stretch" spacing="3" mt="4" pt="3" borderTop="1px solid" borderColor="ui.border">

                    {/* Notes Section */}
                    {crewMember.notes && (
                        <Box>
                            <Text fontWeight="semibold" mb={2}>Notes</Text>
                            <Text fontSize="sm" color="detail.text" ml={4}>
                                {crewMember.notes}
                            </Text>
                        </Box>
                    )}

                    {/* TODO: Show Assignments section will be added later */}

                    {/* Created Date */}
                    <Flex justify="flex-end">
                        <Text fontSize="xs" color="detail.text">
                            Created: {new Date(crewMember.dateCreated || crewMember.dateUpdated).toLocaleDateString()}
                        </Text>
                    </Flex>
                </VStack>
            </Collapse>
        </Box>
    );
};