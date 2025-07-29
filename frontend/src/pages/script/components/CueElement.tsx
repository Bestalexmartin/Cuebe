// frontend/src/pages/script/components/CueElement.tsx

import React, { useRef, useCallback } from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ScriptElement } from '../../../types/scriptElements';

const getTextColorForBackground = (hexColor: string): string => {
    if (!hexColor || hexColor === '') return 'black';

    const color = hexColor.replace('#', '');

    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5 ? 'white' : 'black';
};

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
}

export const CueElement: React.FC<CueElementProps> = ({
    element,
    index,
    allElements,
    isSelected = false,
    colorizeDepNames = false,
    showClockTimes = false,
    scriptStartTime,
    scriptEndTime,
    isDragEnabled = false,
    onSelect
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
        id: element.elementID,
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

    const isNote = (element as any).elementType === 'NOTE';

    const backgroundColor = element.customColor || "#E2E8F0";
    const hasCustomBackground = !!element.customColor && element.customColor !== "#E2E8F0";
    let textColor: string;
    let fontWeight: string;
    let leftBarColor: string;

    if (isNote) {
        if (hasCustomBackground) {
            textColor = getTextColorForBackground(element.customColor!);
            fontWeight = "bold";
            leftBarColor = element.customColor!;
        } else {
            textColor = "black";
            fontWeight = "normal";
            leftBarColor = "gray.700";
        }
    } else {
        textColor = hasCustomBackground ? "white" : "black";
        fontWeight = hasCustomBackground ? "bold" : "normal";
        leftBarColor = element.departmentColor || 'gray.400';
    }

    const cueIdColor = textColor;

    const dynamicCueID = (() => {
        if (element.cueID) return element.cueID;

        if ((element as any).elementType !== 'CUE' || !element.departmentID) {
            return '';
        }

        const deptPrefix = element.departmentInitials ||
            (element.departmentName ? element.departmentName.substring(0, 2).toUpperCase() : 'XX');

        let departmentCueCount = 0;
        for (let i = 0; i <= index; i++) {
            const currentElement = allElements[i];
            if ((currentElement as any).elementType === 'CUE' &&
                currentElement.departmentID === element.departmentID) {
                departmentCueCount++;
            }
        }

        return `${deptPrefix}-${departmentCueCount.toString().padStart(2, '0')}`;
    })();

    const timeDisplay = (() => {
        const timeValue = (element as any).timeOffsetMs || 0;

        if (showClockTimes && scriptStartTime) {
            const showStartTime = new Date(scriptStartTime);
            const clockTime = new Date(showStartTime.getTime() + timeValue);

            let hours = clockTime.getHours();
            if (hours === 0) hours = 12;
            else if (hours > 12) hours = hours - 12;

            const minutes = clockTime.getMinutes().toString().padStart(2, '0');
            const seconds = clockTime.getSeconds().toString().padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        }
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

    const durationDisplay = (() => {
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
            border="2px solid"
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
            {...(isDragEnabled ? { ...attributes, ...listeners } : {})}
        >
            <HStack spacing={0} align="center" h="32px">
                <Box
                    w="10px"
                    h="100%"
                    bg={leftBarColor}
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
                    w="240px"
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