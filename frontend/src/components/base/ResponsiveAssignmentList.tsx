// frontend/src/components/base/ResponsiveAssignmentList.tsx

import React from 'react';
import { 
    Box, 
    VStack, 
    HStack, 
    Text, 
    Avatar, 
    Badge,
    FormLabel
} from '@chakra-ui/react';

interface AssignmentData {
    assignment_id: string;
    // Crew member info
    fullname_first?: string;
    fullname_last?: string;
    email_address?: string;
    phone_number?: string;
    profile_img_url?: string;
    role?: string;
    share_url?: string;
    // Show info
    show_name?: string;
    show_date?: string;
    // Department info (when viewing crew assignments)
    department_name?: string;
    department_color?: string;
    department_initials?: string;
    // Venue info (when viewing crew assignments)
    venue_name?: string;
    venue_city?: string;
    venue_state?: string;
}

interface ResponsiveAssignmentListProps {
    title: string;
    assignments: AssignmentData[];
    onAssignmentClick: (assignment: AssignmentData) => void;
    showDepartmentInfo?: boolean; // When true, shows department circle and info (for crew page)
    showCrewInfo?: boolean; // When true, shows crew avatar and info (for department page)
    formatRoleBadge: (role: string) => string;
    formatDateTime?: (date: string) => string;
}

export const ResponsiveAssignmentList: React.FC<ResponsiveAssignmentListProps> = ({
    title,
    assignments,
    onAssignmentClick,
    showDepartmentInfo = false,
    showCrewInfo = false,
    formatRoleBadge,
    formatDateTime
}) => {
    if (!assignments || assignments.length === 0) {
        return null;
    }

    // Helper function to extract last 12 characters from share URL for LinkID display
    const getLinkId = (shareUrl?: string): string => {
        if (!shareUrl) {
            return 'LinkID: Loading...';
        }
        // Extract last 12 characters from URL path (after /share/)
        const urlParts = shareUrl.split('/');
        const token = urlParts[urlParts.length - 1];
        return `LinkID: ${token.slice(-12)}`;
    };

    return (
        <Box>
            <HStack justify="space-between" mb={2}>
                <FormLabel mb={0}>{title}</FormLabel>
            </HStack>

            <Box borderTop="1px solid" borderColor="gray.500" pt={4} mt={2}>
                <VStack spacing={1} align="stretch">
                    {assignments.map((assignment) => {
                        const crewName = showCrewInfo 
                            ? `${assignment.fullname_first || ''} ${assignment.fullname_last || ''}`.trim() || 'Unknown'
                            : '';
                        
                        return (
                            <Box
                                key={assignment.assignment_id}
                                py={2}
                                px={4}
                                border="2px solid"
                                borderColor="transparent"
                                borderRadius="md"
                                bg="card.background"
                                _hover={{
                                    borderColor: "orange.400"
                                }}
                                cursor="pointer"
                                transition="all 0s"
                                onClick={() => onAssignmentClick(assignment)}
                            >
                                {/* Desktop/Tablet Layout - Single Line */}
                                <HStack 
                                    spacing={{ base: 1, sm: 2, md: 3 }} 
                                    align="center"
                                    display={{ base: "none", md: "flex" }}
                                    overflow="hidden"
                                    minWidth={0}
                                >
                                    {/* Department Info (for crew assignments) */}
                                    {showDepartmentInfo && (
                                        <Box
                                            w="32px"
                                            h="32px"
                                            borderRadius="full"
                                            bg={assignment.department_color || 'gray.400'}
                                            flexShrink={0}
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                        >
                                            {assignment.department_initials && (
                                                <Text
                                                    fontSize="xs"
                                                    fontWeight="bold"
                                                    color="black"
                                                    userSelect="none"
                                                >
                                                    {assignment.department_initials}
                                                </Text>
                                            )}
                                        </Box>
                                    )}

                                    {/* Crew Info (for department assignments) */}
                                    {showCrewInfo && (
                                        <Box flex="1.2" minWidth="150px" display="flex" alignItems="center" gap={2}>
                                            <Avatar
                                                size="sm"
                                                name={crewName}
                                                src={assignment.profile_img_url}
                                                flexShrink={0}
                                            />
                                            <Text
                                                fontSize="sm"
                                                fontWeight="medium"
                                                color="blue.500"
                                                _dark={{ color: "blue.300" }}
                                                isTruncated
                                            >
                                                {crewName}
                                            </Text>
                                        </Box>
                                    )}

                                    {/* Department Name (for crew assignments) */}
                                    {showDepartmentInfo && (
                                        <Text 
                                            fontSize="sm" 
                                            fontWeight="medium" 
                                            flex="0.7"
                                            minWidth="100px"
                                            isTruncated
                                        >
                                            {assignment.department_name || 'Unknown Dept'}
                                        </Text>
                                    )}

                                    {/* Email (for department assignments) */}
                                    {showCrewInfo && (
                                        <Text 
                                            fontSize="sm" 
                                            color="gray.700" 
                                            _dark={{ color: "gray.300" }} 
                                            display={{ base: "none", md: "block" }}
                                            flex="1.3"
                                            minWidth="160px"
                                            isTruncated
                                        >
                                            {assignment.email_address || ''}
                                        </Text>
                                    )}

                                    {/* Phone (for department assignments) */}
                                    {showCrewInfo && (
                                        <Text 
                                            fontSize="sm" 
                                            color="gray.700" 
                                            _dark={{ color: "gray.300" }} 
                                            display={{ base: "none", md: "block" }}
                                            flex="1.0"
                                            minWidth="115px"
                                            isTruncated
                                        >
                                            {assignment.phone_number || 'No phone'}
                                        </Text>
                                    )}

                                    {/* Show Name */}
                                    <Text 
                                        fontSize="sm" 
                                        display={{ base: "none", xl: "block" }}
                                        flex="1.5"
                                        minWidth="130px"
                                        isTruncated
                                    >
                                        <Text as="span" fontWeight="medium">Show:</Text>
                                        <Text as="span" color="gray.700" _dark={{ color: "gray.300" }} ml="5px">
                                            {assignment.show_name}
                                        </Text>
                                    </Text>

                                    {/* Venue Info (for crew assignments) */}
                                    {showDepartmentInfo && (
                                        <Text 
                                            fontSize="sm" 
                                            color="gray.700" 
                                            _dark={{ color: "gray.300" }} 
                                            display={{ base: "none", md: "block" }}
                                            flex="1.3"
                                            minWidth="160px"
                                            isTruncated
                                        >
                                            {assignment.venue_name ? (
                                                `${assignment.venue_name}${assignment.venue_city && assignment.venue_state ? ` - ${assignment.venue_city}, ${assignment.venue_state}` : ''}`
                                            ) : 'No venue'}
                                        </Text>
                                    )}

                                    {/* Show Date (for crew assignments) */}
                                    {showDepartmentInfo && formatDateTime && (
                                        <Text 
                                            fontSize="sm" 
                                            color="gray.700" 
                                            _dark={{ color: "gray.300" }} 
                                            display={{ base: "none", xl: "block" }}
                                            flex="1.2"
                                            minWidth="120px"
                                            isTruncated
                                        >
                                            {formatDateTime(assignment.show_date || '')}
                                        </Text>
                                    )}

                                    {/* URL Suffix */}
                                    <Text 
                                        fontSize="sm" 
                                        color="gray.700" 
                                        _dark={{ color: "gray.300" }} 
                                        display={{ base: "none", lg: "block" }}
                                        flex="1.3"
                                        minWidth="80px"
                                        isTruncated
                                        fontFamily="monospace"
                                    >
                                        {getLinkId(assignment.share_url)}
                                    </Text>

                                    {/* Role Badge */}
                                    <Box 
                                        flex="1"
                                        minWidth="120px"
                                        maxWidth="140px"
                                        display="flex" 
                                        justifyContent="flex-end"
                                        flexShrink={0}
                                    >
                                        {assignment.role && (
                                            <Badge 
                                                colorScheme="blue" 
                                                variant="outline" 
                                                size={{ base: "sm", md: "md" }}
                                                maxWidth="100%"
                                                isTruncated
                                            >
                                                {formatRoleBadge(assignment.role)}
                                            </Badge>
                                        )}
                                    </Box>
                                </HStack>

                                {/* Mobile Layout - Two Lines */}
                                <VStack 
                                    spacing={2} 
                                    align="stretch"
                                    display={{ base: "flex", md: "none" }}
                                >
                                    {/* First Line */}
                                    <HStack spacing={3} align="center">
                                        {/* Department circle for crew assignments */}
                                        {showDepartmentInfo && (
                                            <Box
                                                w="24px"
                                                h="24px"
                                                borderRadius="full"
                                                bg={assignment.department_color || 'gray.400'}
                                                flexShrink={0}
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                            >
                                                <Text
                                                    fontSize="10px"
                                                    fontWeight="bold"
                                                    color="black"
                                                    userSelect="none"
                                                >
                                                    {assignment.department_initials || assignment.department_name?.substring(0, 2).toUpperCase() || 'DE'}
                                                </Text>
                                            </Box>
                                        )}

                                        {/* Avatar for department assignments */}
                                        {showCrewInfo && (
                                            <Avatar
                                                size="sm"
                                                name={crewName}
                                                src={assignment.profile_img_url}
                                            />
                                        )}

                                        <Text
                                            fontSize="sm"
                                            fontWeight="medium"
                                            color={showCrewInfo ? "blue.500" : undefined}
                                            _dark={showCrewInfo ? { color: "blue.300" } : undefined}
                                            flex={1}
                                            isTruncated
                                        >
                                            {showDepartmentInfo ? assignment.show_name : crewName}
                                        </Text>

                                        {assignment.role && (
                                            <Badge colorScheme="blue" variant="outline" size="sm">
                                                {formatRoleBadge(assignment.role)}
                                            </Badge>
                                        )}
                                    </HStack>

                                    {/* Second Line */}
                                    <HStack spacing={3} align="center" ml={showDepartmentInfo ? "32px" : "48px"}>
                                        <Text fontSize="xs" color="gray.500" _dark={{ color: "gray.400" }} minWidth="80px">
                                            {showDepartmentInfo ? (assignment.department_name || 'Unknown Dept') : assignment.show_name}
                                        </Text>
                                        
                                        <VStack spacing={0} align="flex-start" flex={1}>
                                            {showCrewInfo && assignment.email_address && (
                                                <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.300" }}>
                                                    {assignment.email_address}
                                                </Text>
                                            )}
                                            {showCrewInfo && assignment.phone_number && (
                                                <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.300" }}>
                                                    {assignment.phone_number}
                                                </Text>
                                            )}
                                            {showDepartmentInfo && (
                                                <>
                                                    <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.300" }}>
                                                        {assignment.venue_name ? (
                                                            `${assignment.venue_name}${assignment.venue_city && assignment.venue_state ? ` - ${assignment.venue_city}, ${assignment.venue_state}` : ''}`
                                                        ) : 'No venue'}
                                                    </Text>
                                                    {formatDateTime && (
                                                        <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.300" }}>
                                                            {formatDateTime(assignment.show_date || '')}
                                                        </Text>
                                                    )}
                                                </>
                                            )}
                                            <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.300" }} fontFamily="monospace">
                                                {getLinkId(assignment.share_url)}
                                            </Text>
                                        </VStack>
                                    </HStack>
                                </VStack>
                            </Box>
                        );
                    })}
                </VStack>
            </Box>
        </Box>
    );
};