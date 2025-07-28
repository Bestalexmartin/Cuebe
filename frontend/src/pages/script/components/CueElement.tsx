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
}

export const CueElement: React.FC<CueElementProps> = ({
    element,
    index,
    allElements,
    onClick,
    isSelected = false,
    colorizeDepNames = false
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
                <Box w="80px" pl={3} pr={4} borderRight={"1px solid"} borderColor={"gray.400"}>
                    <Text fontSize="sm" color={textColor} textAlign="center" fontWeight={fontWeight}>
                        {(() => {
                            const timeValue = (element as any).timeOffsetMs || 0;
                            const totalSeconds = Math.round(timeValue / 1000);
                            const minutes = Math.floor(totalSeconds / 60);
                            const seconds = totalSeconds % 60;
                            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                        })()}
                    </Text>
                </Box>

                {/* Duration */}
                <Box
                    w="80px"
                    px={3}
                    borderRight={colorizeDepNames && (element as any).elementType !== 'NOTE' ? 'none' : '1px solid'}
                    borderColor={"gray.400"}
                >
                    <Text fontSize="sm" color={textColor} textAlign="center" fontWeight={fontWeight}>
                        {element.duration ? `${element.duration}s` : '-'}
                    </Text>
                </Box>

                {/* Department Name */}
                <Box
                    w="130px"
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
                    flex={1}
                    pl={6}
                    pr={3}
                    borderRight={"1px solid"}
                    borderColor={"gray.400"}
                >
                    <Text fontSize="sm" color={textColor} textAlign="left" isTruncated fontWeight={fontWeight}>
                        {element.description}
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