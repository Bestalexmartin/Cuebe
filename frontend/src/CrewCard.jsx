// frontend/src/CrewCard.jsx

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
import { EditIcon } from '@chakra-ui/icons';

export const CrewCard = ({
    crewMember,
    onEdit,
    onCrewClick,
    isHovered,
    isSelected,
    onHover
}) => {
    const borderColor = isHovered ? 'orange.400' : isSelected ? 'blue.400' : 'gray.600';

    const handleEditClick = (e) => {
        e.stopPropagation();
        onEdit(crewMember.ID);
    };

    const formatRole = (role) => {
        if (!role) return 'Crew Member';
        // Convert underscores to spaces and title case
        return role.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const getFullName = () => {
        const firstName = crewMember.fullnameFirst || '';
        const lastName = crewMember.fullnameLast || '';
        return `${firstName} ${lastName}`.trim() || 'Unknown User';
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
            onMouseEnter={() => onHover?.(crewMember.ID)}
            onMouseLeave={() => onHover?.(null)}
            onClick={() => onCrewClick(crewMember.ID)}
        >
            {/* Header Row */}
            <Flex justify="space-between" align="center" mb="2">
                <Flex align="center" gap="3">
                    <Avatar
                        size="sm"
                        name={getFullName()}
                        src={crewMember.profileImgURL}
                    />
                    <VStack align="start" spacing="0">
                        <Heading size="sm">{getFullName()}</Heading>
                        <HStack spacing="2" align="center">
                            <Badge variant="outline" colorScheme="blue" size="sm">
                                {formatRole(crewMember.userRole)}
                            </Badge>
                            {!crewMember.isActive && (
                                <Badge variant="solid" colorScheme="red" size="sm">
                                    Inactive
                                </Badge>
                            )}
                        </HStack>
                    </VStack>
                </Flex>

                {isSelected && (
                    <HStack spacing="1">
                        <Button
                            aria-label="Edit Crew Member"
                            leftIcon={<EditIcon />}
                            size="xs"
                            onClick={handleEditClick}
                        >
                            Edit
                        </Button>
                    </HStack>
                )}
            </Flex>

            {/* Quick Info Row */}
            <HStack spacing="4" color="gray.500" fontSize="sm">
                {crewMember.emailAddress && (
                    <Text isTruncated maxWidth="250px">
                        📧 {crewMember.emailAddress}
                    </Text>
                )}
            </HStack>

            {/* Expandable Details - only show when selected */}
            <Collapse in={isSelected} animateOpacity>
                <VStack align="stretch" spacing="3" mt="4" pt="3" borderTop="1px solid" borderColor="ui.border">

                    {/* Contact Information */}
                    <Box>
                        <Text fontWeight="semibold" mb="1">Contact Information</Text>
                        <VStack align="stretch" spacing="1" fontSize="sm" color="gray.600">
                            <Text>📧 {crewMember.emailAddress}</Text>
                            {crewMember.userName && (
                                <Text>👤 Username: {crewMember.userName}</Text>
                            )}
                        </VStack>
                    </Box>

                    {/* Role & Status */}
                    <Box>
                        <Text fontWeight="semibold" mb="1">Role & Status</Text>
                        <HStack spacing="4" fontSize="sm" color="gray.600">
                            <Text>🎭 {formatRole(crewMember.userRole)}</Text>
                            <Text>
                                Status: {crewMember.isActive ? '✅ Active' : '❌ Inactive'}
                            </Text>
                        </HStack>
                    </Box>

                    {/* Account Information */}
                    <Box>
                        <Text fontWeight="semibold" mb="1">Account Information</Text>
                        <VStack align="stretch" spacing="1" fontSize="sm" color="gray.600">
                            {crewMember.clerk_user_id && (
                                <Text>🔑 Clerk ID: {crewMember.clerk_user_id.slice(0, 8)}...</Text>
                            )}
                            <Text>
                                📅 Joined: {new Date(crewMember.dateCreated).toLocaleDateString()}
                            </Text>
                            <Text>
                                🔄 Last Updated: {new Date(crewMember.dateUpdated).toLocaleDateString()}
                            </Text>
                        </VStack>
                    </Box>

                    {/* Department Assignments */}
                    <Box>
                        <Text fontWeight="semibold" mb="1">Department Assignments</Text>
                        <Text fontSize="sm" color="gray.500">
                            👥 0 show assignments • 🎭 0 departments
                        </Text>
                    </Box>
                </VStack>
            </Collapse>
        </Box>
    );
};