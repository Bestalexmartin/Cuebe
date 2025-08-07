// frontend/src/features/shared-script/components/SharedScriptElement.tsx

import React from 'react';
import {
    Box,
    HStack,
    VStack,
    Text,
    Badge,
    useColorModeValue,
    Tooltip,
    Flex
} from "@chakra-ui/react";

import { SharedScriptElement as SharedScriptElementType, Department } from '../types/sharedScript';
import { formatTimeOffset } from '../../../utils/timeUtils';
import { getPriorityColor, getTriggerTypeIcon } from '../../../utils/scriptElementUtils';

interface SharedScriptElementProps {
    element: SharedScriptElementType;
    departments: Department[];
    isLast?: boolean;
}

export const SharedScriptElement: React.FC<SharedScriptElementProps> = ({
    element,
    departments,
    isLast = false
}) => {
    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.100', 'gray.700');
    const textColor = useColorModeValue('gray.800', 'white');
    const metaTextColor = useColorModeValue('gray.600', 'gray.300');

    // Find department info
    const department = departments.find(d => d.department_id === element.department_id);
    
    // Format time offset
    const timeDisplay = element.time_offset_ms !== null 
        ? formatTimeOffset(element.time_offset_ms) 
        : null;

    // Get element type styling
    const getElementTypeColor = (type: string | null) => {
        switch (type) {
            case 'CUE': return 'blue';
            case 'NOTE': return 'green';
            case 'GROUP': return 'purple';
            default: return 'gray';
        }
    };

    // Get trigger type display
    const getTriggerDisplay = (triggerType: string | null) => {
        switch (triggerType) {
            case 'MANUAL': return 'Manual';
            case 'TIME': return 'Timed';
            case 'AUTO': return 'Auto';
            case 'FOLLOW': return 'Follow';
            case 'GO': return 'Go';
            case 'STANDBY': return 'Standby';
            default: return 'Manual';
        }
    };

    return (
        <Box
            px={6}
            py={4}
            bg={bgColor}
            borderBottom={!isLast ? "1px solid" : undefined}
            borderColor={borderColor}
            transition="background-color 0.2s"
            _hover={{ 
                bg: useColorModeValue('gray.50', 'gray.750')
            }}
        >
            <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
                {/* Left: Sequence and Time */}
                <VStack align="flex-start" spacing={1} minW="80px" flexShrink={0}>
                    {element.sequence && (
                        <Text fontSize="sm" fontWeight="semibold" color={metaTextColor}>
                            #{element.sequence}
                        </Text>
                    )}
                    
                    {timeDisplay && (
                        <Text fontSize="xs" color={metaTextColor} fontFamily="mono">
                            {timeDisplay}
                        </Text>
                    )}
                </VStack>

                {/* Center: Main Content */}
                <VStack align="flex-start" spacing={2} flex={1}>
                    {/* Cue ID and Type */}
                    <HStack spacing={3} align="center" flexWrap="wrap">
                        {element.cue_id && (
                            <Text 
                                fontSize="md" 
                                fontWeight="bold" 
                                color={textColor}
                                fontFamily="mono"
                            >
                                {element.cue_id}
                            </Text>
                        )}

                        {element.element_type && (
                            <Badge 
                                colorScheme={getElementTypeColor(element.element_type)}
                                variant="subtle"
                                fontSize="xs"
                            >
                                {element.element_type}
                            </Badge>
                        )}

                        {element.trigger_type && element.trigger_type !== 'MANUAL' && (
                            <Badge 
                                colorScheme="orange"
                                variant="outline"
                                fontSize="xs"
                            >
                                {getTriggerDisplay(element.trigger_type)}
                            </Badge>
                        )}

                        {element.priority && element.priority !== 'NORMAL' && (
                            <Badge 
                                colorScheme={getPriorityColor(element.priority)}
                                variant="subtle"
                                fontSize="xs"
                            >
                                {element.priority}
                            </Badge>
                        )}
                    </HStack>

                    {/* Description */}
                    {element.description && (
                        <Text color={textColor} fontSize="md" lineHeight="1.5">
                            {element.description}
                        </Text>
                    )}

                    {/* Notes */}
                    {element.cue_notes && (
                        <Box
                            bg={useColorModeValue('yellow.50', 'yellow.900')}
                            border="1px solid"
                            borderColor={useColorModeValue('yellow.200', 'yellow.600')}
                            borderRadius="md"
                            p={3}
                            width="100%"
                        >
                            <Text 
                                fontSize="sm" 
                                color={useColorModeValue('yellow.800', 'yellow.100')}
                                fontStyle="italic"
                            >
                                {element.cue_notes}
                            </Text>
                        </Box>
                    )}

                    {/* Location */}
                    {(element.location || element.location_details) && (
                        <HStack spacing={2} fontSize="sm" color={metaTextColor}>
                            <Text fontWeight="semibold">Location:</Text>
                            <Text>
                                {element.location && element.location.replace('_', ' ')}
                                {element.location && element.location_details && ' - '}
                                {element.location_details}
                            </Text>
                        </HStack>
                    )}
                </VStack>

                {/* Right: Department Badge */}
                {department && (
                    <Box flexShrink={0}>
                        <Tooltip 
                            label={department.department_name} 
                            hasArrow
                            placement="top"
                        >
                            <Badge
                                colorScheme="blue"
                                variant="solid"
                                borderRadius="full"
                                px={3}
                                py={1}
                                fontSize="xs"
                                fontWeight="bold"
                                style={{
                                    backgroundColor: department.department_color || undefined,
                                    color: 'white'
                                }}
                            >
                                {department.department_initials || department.department_name.substring(0, 3).toUpperCase()}
                            </Badge>
                        </Tooltip>
                    </Box>
                )}
            </Flex>
        </Box>
    );
};