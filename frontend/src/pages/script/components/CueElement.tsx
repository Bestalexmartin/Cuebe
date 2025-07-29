// frontend/src/pages/script/components/CueElement.tsx

import React from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';
import { ScriptElement } from '../../../types/scriptElements';

interface CueElementProps {
    element: ScriptElement;
    index: number;
    allElements: ScriptElement[];
    onClick?: () => void;
    isSelected?: boolean;
    colorizeDepNames?: boolean;
    showClockTimes?: boolean;
    scriptStartTime?: string;
    scriptEndTime?: string;
}

export const CueElement: React.FC<CueElementProps> = ({
    element,
    index,
    allElements,
    onClick,
    isSelected = false,
    colorizeDepNames = false,
    showClockTimes = false,
    scriptStartTime,
    scriptEndTime
}) => {
    // Use customColor for full background if set, otherwise use grey.200 default
    const backgroundColor = element.customColor || "gray.300";
    const hasCustomBackground = !!element.customColor;

    // Use white text for custom backgrounds, black text for normal rows
    const textColor = hasCustomBackground ? "white" : "black";
    const cueIdColor = hasCustomBackground ? "white" : "black";

    // Bold text for custom colored elements
    const fontWeight = hasCustomBackground ? "bold" : "normal";

    // Generate dynamic cue ID for cues with departments
    const dynamicCueID = (() => {
        // Use existing cue ID if available, or generate dynamic one
        if (element.cueID) return element.cueID;

        // Only generate for cues with departments
        if ((element as any).elementType !== 'CUE' || !element.departmentName || !element.departmentID) {
            return '';
        }

        // Get department prefix (first 2 letters, capitalized)
        const deptPrefix = element.departmentName.substring(0, 2).toUpperCase();

        // Count cues for this department that appear before this element
        let departmentCueCount = 0;
        for (let i = 0; i <= index; i++) {
            const currentElement = allElements[i];
            if ((currentElement as any).elementType === 'CUE' &&
                currentElement.departmentID === element.departmentID) {
                departmentCueCount++;
            }
        }

        // Generate cue ID: department prefix + dash + zero-padded number
        return `${deptPrefix}-${departmentCueCount.toString().padStart(2, '0')}`;
    })();

    // Calculate time display (offset or clock time)
    const timeDisplay = (() => {
        const timeValue = (element as any).timeOffsetMs || 0;

        if (showClockTimes && scriptStartTime) {
            // Use the script's scheduled start time and add the offset
            const showStartTime = new Date(scriptStartTime);
            const clockTime = new Date(showStartTime.getTime() + timeValue);

            // Format as H:MM:SS (12-hour format without AM/PM)
            let hours = clockTime.getHours();
            if (hours === 0) hours = 12; // 12 AM becomes 12
            else if (hours > 12) hours = hours - 12; // PM hours become 1-11

            const minutes = clockTime.getMinutes().toString().padStart(2, '0');
            const seconds = clockTime.getSeconds().toString().padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        }

        // Default to offset time (H:MM:SS)
        const totalSeconds = Math.round(timeValue / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    })();

    // Calculate duration display
    const durationDisplay = (() => {
        // For all elements (including SHOW START), show duration in HH:MM:SS format if available
        if (element.duration) {
            const totalSeconds = element.duration;
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            
            // Format: DD:HH:MM:SS for SHOW START NOTE (no leading zeros for days), HH:MM:SS for others
            if (element.description?.toUpperCase() === 'SHOW START') {
                if (days > 0) {
                    return `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else if (hours > 0) {
                    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else {
                    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
            } else {
                // Regular elements - HH:MM:SS format
                if (hours > 0) {
                    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else {
                    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
            }
        }
        
        // Fallback: Calculate SHOW START duration on frontend if not in database yet
        if (element.description?.toUpperCase() === 'SHOW START' && 
            scriptStartTime && scriptEndTime) {
            const startTime = new Date(scriptStartTime);
            const endTime = new Date(scriptEndTime);
            const durationMs = endTime.getTime() - startTime.getTime();
            
            if (durationMs > 0) {
                const totalSeconds = Math.round(durationMs / 1000);
                const days = Math.floor(totalSeconds / 86400);
                const hours = Math.floor((totalSeconds % 86400) / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                
                if (days > 0) {
                    return `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else if (hours > 0) {
                    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else {
                    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
            }
        }
        
        return '-';
    })();

    return (
        <Box
            bg={backgroundColor}
            border="2px solid"
            borderColor={isSelected ? "blue.400" : "transparent"}
            mb="1px"
            _hover={{
                borderColor: isSelected ? "blue.400" : "orange.400"
            }}
            transition="all 0s"
            borderRadius="none"
            overflow="hidden"
            cursor={onClick ? "pointer" : "default"}
            onClick={onClick}
        >
            <HStack spacing={0} align="center" h="32px">
                {/* Department Color Bar - Always present for consistent spacing */}
                <Box
                    w="10px"
                    h="100%"
                    bg={hasCustomBackground ? backgroundColor : ((element as any).elementType === 'NOTE' ? 'black' : (element.departmentColor || 'gray.400'))}
                    flexShrink={0}
                />

                {/* Time Offset */}
                <Box w="120px" pl={3} pr={4} borderRight={"1px solid"} borderColor={"gray.400"}>
                    <Text fontSize="sm" color={textColor} textAlign="center" fontWeight={fontWeight}>
                        {timeDisplay}
                    </Text>
                </Box>

                {/* Duration */}
                <Box
                    w="100px"
                    px={3}
                    borderRight={colorizeDepNames && (element as any).elementType !== 'NOTE' ? 'none' : '1px solid'}
                    borderColor={"gray.400"}
                >
                    <Text fontSize="sm" color={textColor} textAlign="center" fontWeight={fontWeight}>
                        {durationDisplay}
                    </Text>
                </Box>

                {/* Department Name */}
                <Box
                    w="100px"
                    height="100%"
                    display="flex"
                    alignItems="center"
                    px={(element as any).elementType === 'NOTE' || !colorizeDepNames ? 3 : 0}
                >
                    {colorizeDepNames && element.departmentColor && (element as any).elementType !== 'NOTE' ? (
                        <Box
                            bg={element.departmentColor}
                            borderRadius="sm"
                            width="100%"
                            height="100%"
                            mx="2px"
                            my="2px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                        >
                            <Text fontSize="sm" color="white" fontWeight="bold" isTruncated>
                                {element.departmentName || ''}
                            </Text>
                        </Box>
                    ) : (
                        <Text fontSize="sm" color={textColor} textAlign="center" isTruncated fontWeight={fontWeight} width="100%">
                            {(element as any).elementType === 'NOTE' ? '' : (element.departmentName || '')}
                        </Text>
                    )}
                </Box>

                {/* Cue ID */}
                <Box
                    w="80px"
                    px={3}
                    borderLeft={colorizeDepNames && (element as any).elementType !== 'NOTE' ? 'none' : '1px solid'}
                    borderRight={"1px solid"}
                    borderColor={"gray.400"}>
                    <Text fontSize="sm" fontWeight={hasCustomBackground ? "bold" : "normal"} color={cueIdColor} textAlign="center">
                        {dynamicCueID || '\u00A0'}
                    </Text>
                </Box>

                {/* Cue Name/Description */}
                <Box
                    w="200px"
                    pl={6}
                    pr={3}
                    borderRight={"1px solid"}
                    borderColor={"gray.400"}
                >
                    <Text fontSize="sm" color={textColor} textAlign="left" isTruncated fontWeight={fontWeight}>
                        {element.description}
                    </Text>
                </Box>

                {/* Cue Notes */}
                <Box
                    flex={1}
                    px={3}
                    borderRight={"1px solid"}
                    borderColor={"gray.400"}
                >
                    <Text fontSize="sm" color={textColor} textAlign="left" isTruncated fontWeight={fontWeight}>
                        {(element as any).cueNotes || '\u00A0'}
                    </Text>
                </Box>

                {/* Priority */}
                <Box w="120px" px={3}>
                    <Text fontSize="sm" color={textColor} textAlign="center" fontWeight={fontWeight}>
                        {element.priority}
                    </Text>
                </Box>
            </HStack>
        </Box>
    );
};