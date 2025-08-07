// frontend/src/features/shared-script/components/SharedScriptHeader.tsx

import React from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Heading,
    Badge,
    useColorModeValue,
    Icon,
    Flex
} from "@chakra-ui/react";
import { format } from 'date-fns';

import { SharedScriptData } from '../types/sharedScript';
import { AppIcon } from '../../../components/AppIcon';

interface SharedScriptHeaderProps {
    scriptData: SharedScriptData;
}

export const SharedScriptHeader: React.FC<SharedScriptHeaderProps> = ({ 
    scriptData 
}) => {
    const headerBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const textColor = useColorModeValue('gray.600', 'gray.300');

    // Format times for display
    const formatTime = (dateString: string | null) => {
        if (!dateString) return null;
        try {
            return format(new Date(dateString), 'MMM d, yyyy h:mm a');
        } catch {
            return null;
        }
    };

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case 'DRAFT': return 'orange';
            case 'COPY': return 'blue';
            case 'WORKING': return 'yellow';
            case 'FINAL': return 'green';
            case 'BACKUP': return 'gray';
            default: return 'gray';
        }
    };

    return (
        <Box
            bg={headerBg}
            borderBottom="1px solid"
            borderColor={borderColor}
            py={6}
            px={4}
            boxShadow="sm"
        >
            <Flex maxW="6xl" mx="auto" align="center" justify="space-between" flexWrap="wrap">
                {/* Left: Script Info */}
                <VStack align="flex-start" spacing={2}>
                    {/* Script Title */}
                    <HStack spacing={3} align="center">
                        <AppIcon name="script" boxSize="24px" color="blue.500" />
                        <Heading as="h1" size="lg">
                            {scriptData.script_name}
                        </Heading>
                        <Badge colorScheme={getStatusColor(scriptData.script_status)} variant="subtle">
                            {scriptData.script_status}
                        </Badge>
                    </HStack>

                    {/* Show and Venue Info */}
                    <HStack spacing={4} color={textColor} fontSize="sm" flexWrap="wrap">
                        {scriptData.show_name && (
                            <Text>
                                <strong>Show:</strong> {scriptData.show_name}
                            </Text>
                        )}
                        
                        {scriptData.venue_name && (
                            <Text>
                                <strong>Venue:</strong> {scriptData.venue_name}
                            </Text>
                        )}
                    </HStack>

                    {/* Timing Info */}
                    {(scriptData.start_time || scriptData.end_time) && (
                        <HStack spacing={4} color={textColor} fontSize="sm" flexWrap="wrap">
                            {scriptData.start_time && (
                                <HStack spacing={1}>
                                    <AppIcon name="calendar" />
                                    <Text>
                                        <strong>Start:</strong> {formatTime(scriptData.start_time)}
                                    </Text>
                                </HStack>
                            )}
                            
                            {scriptData.end_time && (
                                <HStack spacing={1}>
                                    <AppIcon name="time" />
                                    <Text>
                                        <strong>End:</strong> {formatTime(scriptData.end_time)}
                                    </Text>
                                </HStack>
                            )}
                        </HStack>
                    )}
                </VStack>

                {/* Right: Department Badges */}
                {scriptData.departments && scriptData.departments.length > 0 && (
                    <Box>
                        <Text fontSize="sm" color={textColor} mb={2}>
                            Filtered for:
                        </Text>
                        <HStack spacing={2} flexWrap="wrap">
                            {scriptData.departments.map((dept) => (
                                <Badge
                                    key={dept.department_id}
                                    colorScheme="blue"
                                    variant="outline"
                                    borderRadius="full"
                                    px={3}
                                    py={1}
                                    fontSize="xs"
                                    style={{
                                        borderColor: dept.department_color || undefined,
                                        color: dept.department_color || undefined
                                    }}
                                >
                                    {dept.department_initials || dept.department_name}
                                </Badge>
                            ))}
                        </HStack>
                    </Box>
                )}
            </Flex>
        </Box>
    );
};