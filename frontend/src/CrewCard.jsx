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

    const getUserStatusBadge = () => {
        const isVerified = crewMember.userStatus === 'verified';
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
            <Flex justify="space-between" align="start" mb="2">
                <Flex align="center" gap="3">
                    <Avatar
                        size="sm"
                        name={getFullName()}
                        src={crewMember.profileImgURL}
                    />
                    <VStack align="start" spacing="0">
                        <Heading size="sm">{getFullName()}</Heading>
                    </VStack>
                </Flex>

                {/* Right side - badges and email when collapsed, edit button when expanded */}
                {isSelected ? (
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
                ) : (
                    <VStack align="end" spacing="2">
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
                        <VStack align="end" spacing="1">
                            <Text fontSize="sm" color="gray.500" isTruncated maxWidth="200px">
                                📧 {crewMember.emailAddress}
                            </Text>
                            {crewMember.phoneNumber && (
                                <Text fontSize="sm" color="gray.500" isTruncated maxWidth="200px">
                                    📱 {crewMember.phoneNumber}
                                </Text>
                            )}
                        </VStack>
                    </VStack>
                )}
            </Flex>

            {/* Expandable Details - only show when selected */}
            <Collapse in={isSelected} animateOpacity>
                <VStack align="stretch" spacing="3" mt="4" pt="3" borderTop="1px solid" borderColor="ui.border">

                    {/* Contact & Basic Info */}
                    <Box>
                        <VStack align="stretch" spacing="2" fontSize="sm" color="gray.600">
                            <HStack>
                                <Badge variant="outline" colorScheme="blue" size="sm">
                                    {formatRole(crewMember.userRole)}
                                </Badge>
                            </HStack>
                            <Text>📧 {crewMember.emailAddress}</Text>
                            {crewMember.phoneNumber && (
                                <Text>📱 {crewMember.phoneNumber}</Text>
                            )}
                            {crewMember.notes && (
                                <Text>📝 Notes: {crewMember.notes}</Text>
                            )}
                        </VStack>
                    </Box>

                    {/* Account Status */}
                    <Box>
                        <Text fontWeight="semibold" mb="2">Account Status</Text>
                        <VStack align="stretch" spacing="2" fontSize="sm" color="gray.600">
                            <HStack>
                                {getUserStatusBadge()}
                            </HStack>
                            <Text>
                                📅 Added: {new Date(crewMember.dateCreated).toLocaleDateString()}
                            </Text>
                            {crewMember.userStatus === 'guest' && (
                                <Text color="orange.500" fontSize="xs">
                                    💡 Guest users can view their call schedules via shared links
                                </Text>
                            )}
                        </VStack>
                    </Box>

                    {/* Future: Show Assignments */}
                    <Box>
                        <Text fontWeight="semibold" mb="2">Show Assignments</Text>
                        <Text fontSize="sm" color="gray.500" fontStyle="italic">
                            Show assignments will appear here when implemented
                        </Text>
                    </Box>
                </VStack>
            </Collapse>
        </Box>
    );
};