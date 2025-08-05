// frontend/src/features/script/components/CueElement.tsx

import React, { useRef, useCallback, useMemo } from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ScriptElement } from '../types/scriptElements';
import { getTextColorForBackground } from '../../../utils/colorUtils';

interface CueElementProps {
    element: ScriptElement;
    index: number;
    allElements: ScriptElement[];
    isSelected?: boolean;
    colorizeDepNames?: boolean;
    showClockTimes?: boolean;
    scriptStartTime?: string;
    scriptEndTime?: string;
    isDragEnabled?: boolean;
    onSelect?: () => void;
    onEdit?: (element: ScriptElement) => void;
}

export const CueElement: React.FC<CueElementProps> = React.memo(({
    element,
    index,
    allElements,
    isSelected = false,
    colorizeDepNames = false,
    showClockTimes = false,
    scriptStartTime,
    scriptEndTime,
    isDragEnabled = false,
    onSelect,
    onEdit
}) => {
    // Drag functionality
    const dragTimeoutRef = useRef<number | null>(null);
    const isDragStartedRef = useRef(false);
    const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: element.element_id,
        disabled: !isDragEnabled
    });

    // Handle mouse down - start timer for drag detection
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!isDragEnabled) {
            // If drag is disabled, just handle click
            if (onSelect) {
                onSelect();
            }
            return;
        }

        mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
        isDragStartedRef.current = false;

        // Set a timeout to detect if this is a drag intent
        dragTimeoutRef.current = setTimeout(() => {
            isDragStartedRef.current = true;
        }, 150); // 150ms delay before considering it a drag
    }, [isDragEnabled, onSelect]);

    // Handle mouse up - if no drag was started, treat as click
    const handleMouseUp = useCallback(() => {
        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
            dragTimeoutRef.current = null;
        }

        // If drag wasn't started and we have a select handler, call it
        if (!isDragStartedRef.current && onSelect) {
            onSelect();
        }

        isDragStartedRef.current = false;
        mouseDownPosRef.current = null;
    }, [onSelect]);

    // Handle mouse move - if significant movement, cancel click and allow drag
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!mouseDownPosRef.current || !isDragEnabled) return;

        const deltaX = Math.abs(e.clientX - mouseDownPosRef.current.x);
        const deltaY = Math.abs(e.clientY - mouseDownPosRef.current.y);
        const dragThreshold = 5; // pixels

        // If movement exceeds threshold, consider it a drag
        if (deltaX > dragThreshold || deltaY > dragThreshold) {
            if (dragTimeoutRef.current) {
                clearTimeout(dragTimeoutRef.current);
                dragTimeoutRef.current = null;
            }
            isDragStartedRef.current = true;
        }
    }, [isDragEnabled]);

    // Handle double-click to edit element
    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (onEdit) {
            onEdit(element);
        }
    }, [onEdit, element]);

    const isNote = (element as any).element_type === 'NOTE';

    const backgroundColor = element.custom_color || "#E2E8F0";
    const hasCustomBackground = !!element.custom_color && element.custom_color !== "#E2E8F0";
    let textColor: string;
    let fontWeight: string;
    let leftBarColor: string;

    if (isNote) {
        if (hasCustomBackground) {
            textColor = getTextColorForBackground(element.custom_color!);
            fontWeight = "bold";
            leftBarColor = element.custom_color!;
        } else {
            textColor = "black";
            fontWeight = "normal";
            leftBarColor = "gray.700";
        }
    } else {
        textColor = hasCustomBackground ? "white" : "black";
        fontWeight = hasCustomBackground ? "bold" : "normal";
        leftBarColor = element.department_color || 'gray.400';
    }

    const cueIdColor = textColor;

    const dynamicCueID = (() => {
        if (element.cue_id) return element.cue_id;

        if ((element as any).element_type !== 'CUE' || !element.department_id) {
            return '';
        }

        const deptPrefix = element.department_initials ||
            (element.department_name ? element.department_name.substring(0, 2).toUpperCase() : 'XX');

        let departmentCueCount = 0;
        for (let i = 0; i <= index; i++) {
            const currentElement = allElements[i];
            if ((currentElement as any).element_type === 'CUE' &&
                currentElement.department_id === element.department_id) {
                departmentCueCount++;
            }
        }

        return `${deptPrefix}-${departmentCueCount.toString().padStart(2, '0')}`;
    })();

    const timeDisplay = useMemo(() => {
        const timeValue = element.time_offset_ms || 0;

        // If clock times are requested but we don't have script start time yet, show placeholder
        if (showClockTimes) {
            if (!scriptStartTime) {
                return '--:--:--'; // Placeholder to prevent offset time from showing
            }

            // Calculate clock time directly
            const showStartTime = new Date(scriptStartTime);
            const clockTime = new Date(showStartTime.getTime() + timeValue);

            let hours = clockTime.getHours();
            if (hours === 0) hours = 12;
            else if (hours > 12) hours = hours - 12;

            const minutes = clockTime.getMinutes().toString().padStart(2, '0');
            const seconds = clockTime.getSeconds().toString().padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        }

        // Show offset time when clock times are not requested
        const isNegative = timeValue < 0;
        const absTimeValue = Math.abs(timeValue);
        const totalSeconds = Math.round(absTimeValue / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const timeString = hours > 0
            ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            : `${minutes}:${seconds.toString().padStart(2, '0')}`;

        return isNegative ? `-${timeString}` : timeString;
    }, [element.time_offset_ms, showClockTimes, scriptStartTime]);

    const durationDisplay = useMemo(() => {
        // For SHOW START elements, always calculate from script times if available
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

        if (element.duration) {
            const totalSeconds = element.duration;
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            if (element.description?.toUpperCase() === 'SHOW START') {
                if (days > 0) {
                    return `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else if (hours > 0) {
                    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else {
                    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
            } else {
                if (hours > 0) {
                    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else {
                    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
            }
        }


        return '-';
    }, [element.duration, element.description, scriptStartTime, scriptEndTime]);

    const dragStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: 1, // Explicitly prevent @dnd-kit from applying transparency
        zIndex: isDragging ? 1000 : 'auto',
    };

    return (
        <Box
            ref={isDragEnabled ? setNodeRef : undefined}
            style={isDragEnabled ? dragStyle : undefined}
            bg={backgroundColor}
            border="3px solid"
            borderColor={isSelected ? "blue.400" : "transparent"}
            mb="1px"
            _hover={{
                borderColor: isSelected ? "blue.400" : "orange.400"
            }}
            transition="all 0s"
            borderRadius="none"
            overflow="hidden"
            cursor={isDragEnabled ? "pointer" : "default"}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onDoubleClick={handleDoubleClick}
            {...(isDragEnabled ? { ...attributes, ...listeners } : {})}
        >
            <HStack spacing={0} align="center" h="28px">
                <Box
                    w="10px"
                    h="28px"
                    bg={leftBarColor}
                    flexShrink={0}
                    mt="1px"
                    mb="1px"
                />

                {/* Time Offset */}
                <Box w="120px" pl={5} pr={4} position="relative">
                    <Text fontSize="sm" color={textColor} textAlign="center" fontWeight={fontWeight} marginTop="-1px">
                        {timeDisplay}
                    </Text>
                    <Box
                        position="absolute"
                        right="0"
                        top="-3px"
                        height="29px"
                        width="1px"
                        bg="gray.400"
                    />
                </Box>

                {/* Duration */}
                <Box
                    w="100px"
                    px={3}
                    position="relative"
                >
                    <Text fontSize="sm" color={textColor} textAlign="center" fontWeight={fontWeight} marginTop="-1px">
                        {durationDisplay}
                    </Text>
                    {!(colorizeDepNames && (element as any).element_type !== 'NOTE') && (
                        <Box
                            position="absolute"
                            right="0"
                            top="-4px"
                            height="31px"
                            width="1px"
                            bg="gray.400"
                        />
                    )}
                </Box>

                {/* Department Name */}
                <Box
                    w="100px"
                    height="100%"
                    display="flex"
                    alignItems="center"
                    px={(element as any).element_type === 'NOTE' || !colorizeDepNames ? 3 : 0}
                >
                    {colorizeDepNames && element.department_color && (element as any).element_type !== 'NOTE' ? (
                        <Box
                            bg={element.department_color}
                            borderRadius="sm"
                            width="100%"
                            height="100%"
                            mx="2px"
                            my="2px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                        >
                            <Text fontSize="sm" color="white" fontWeight="bold" isTruncated marginTop="-1px">
                                {element.department_name || ''}
                            </Text>
                        </Box>
                    ) : (
                        <Text fontSize="sm" color={textColor} textAlign="center" isTruncated fontWeight={fontWeight} width="100%" marginTop="-1px">
                            {(element as any).element_type === 'NOTE' ? '' : (element.department_name || '')}
                        </Text>
                    )}
                </Box>

                {/* Cue ID */}
                <Box
                    w="80px"
                    px={3}
                    position="relative"
                >
                    <Text fontSize="sm" fontWeight={hasCustomBackground ? "bold" : "normal"} color={cueIdColor} textAlign="center" marginTop="-1px">
                        {dynamicCueID || '\u00A0'}
                    </Text>
                    {!(colorizeDepNames && (element as any).element_type !== 'NOTE') && (
                        <Box
                            position="absolute"
                            left="0"
                            top="-4px"
                            height="31px"
                            width="1px"
                            bg="gray.400"
                        />
                    )}
                    <Box
                        position="absolute"
                        right="0"
                        top="-3px"
                        height="29px"
                        width="1px"
                        bg="gray.400"
                    />
                </Box>

                {/* Cue Name/Description */}
                <Box
                    w="240px"
                    pl={6}
                    pr={3}
                    position="relative"
                >
                    <Text fontSize="sm" color={textColor} textAlign="left" isTruncated fontWeight={fontWeight} marginTop="-1px">
                        {element.description}
                    </Text>
                    <Box
                        position="absolute"
                        right="0"
                        top="-3px"
                        height="29px"
                        width="1px"
                        bg="gray.400"
                    />
                </Box>

                {/* Cue Notes */}
                <Box
                    flex={1}
                    pl={6}
                    pr={3}
                    position="relative"
                >
                    <Text fontSize="sm" color={textColor} textAlign="left" isTruncated fontWeight={fontWeight} marginTop="-1px">
                        {(element as any).cue_notes || '\u00A0'}
                    </Text>
                    <Box
                        position="absolute"
                        right="0"
                        top="-3px"
                        height="29px"
                        width="1px"
                        bg="gray.400"
                    />
                    <Box
                        position="absolute"
                        right="0"
                        top="-3px"
                        height="29px"
                        width="1px"
                        bg="gray.400"
                    />
                </Box>

                {/* Location */}
                <Box
                    w="180px"
                    pl={6}
                    pr={3}
                    position="relative"
                >
                    <Text fontSize="sm" color={textColor} textAlign="left" isTruncated fontWeight={fontWeight} marginTop="-1px">
                        {element.location_details || '\u00A0'}
                    </Text>
                    {element.priority !== 'SAFETY' && (
                        <Box
                            position="absolute"
                            right="0"
                            top="-4px"
                            height="31px"
                            width="1px"
                            bg="gray.400"
                        />
                    )}
                </Box>

                {/* Priority */}
                <Box
                    w="120px"
                    height="100%"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    px={element.priority === 'SAFETY' ? 0 : 3}
                >
                    {element.priority === 'SAFETY' ? (
                        <Box
                            position="relative"
                            width="100%"
                            height="100%"
                            ml="2px"
                            mr="0px"
                            my="2px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                        >
                            {/* Striped border/frame */}
                            <Box
                                position="absolute"
                                top="0"
                                left="0"
                                right="0"
                                bottom="0"
                                background={`repeating-linear-gradient(
                                    -45deg,
                                    #000000 0px,
                                    #000000 8px,
                                    #EAB308 8px,
                                    #EAB308 16px
                                )`}
                                borderRadius="sm"
                            />

                            {/* Solid background layer for text */}
                            <Box
                                position="absolute"
                                top="4px"
                                left="4px"
                                right="4px"
                                bottom="4px"
                                background={backgroundColor}
                                borderRadius="sm"
                            />

                            {/* Text layer */}
                            <Text
                                fontSize="sm"
                                color={textColor}
                                textAlign="center"
                                fontWeight="bold"
                                position="relative"
                                zIndex="1"
                                marginTop="-1px"
                            >
                                {element.priority}
                            </Text>
                        </Box>
                    ) : (
                        <Text fontSize="sm" color={textColor} textAlign="center" fontWeight={fontWeight} marginTop="-1px">
                            {element.priority}
                        </Text>
                    )}
                </Box>
            </HStack>
        </Box>
    );
});
