// frontend/src/features/script/components/CueElement.tsx

import React, { useRef, useCallback, useMemo } from 'react';
import { Box, HStack, Text, IconButton } from '@chakra-ui/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BiSolidRightArrow } from "react-icons/bi";
import { ScriptElement } from '../types/scriptElements';
import { getTextColorForBackground } from '../../../utils/colorUtils';
import { AppIcon } from '../../../components/AppIcon';
import { formatTimeOffset, formatAbsoluteTime } from '../../../utils/timeUtils';

interface CueElementProps {
    element: ScriptElement;
    index: number;
    allElements: ScriptElement[];
    isSelected?: boolean;
    colorizeDepNames?: boolean;
    showClockTimes?: boolean;
    useMilitaryTime?: boolean;
    scriptStartTime?: string;
    scriptEndTime?: string;
    isDragEnabled?: boolean;
    onSelect?: (shiftKey?: boolean) => void;
    onEdit?: (element: ScriptElement) => void;
    onToggleGroupCollapse?: (elementId: string) => void;
}

export const CueElement: React.FC<CueElementProps> = (props: CueElementProps) => {
    const {
        element,
        index,
        allElements,
        isSelected = false,
        colorizeDepNames = false,
        showClockTimes = false,
        useMilitaryTime = false,
        scriptStartTime,
        scriptEndTime,
        isDragEnabled = false,
        onSelect,
        onEdit,
        onToggleGroupCollapse
    } = props;


    // Use useMilitaryTime directly like colorizeDepNames and showClockTimes
    // All preferences are now passed as props from parent components
    const effectiveUseMilitaryTime = useMilitaryTime;


    // Drag functionality
    const dragTimeoutRef = useRef<number | null>(null);
    const isDragStartedRef = useRef(false);
    const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
    const shiftKeyRef = useRef<boolean>(false);

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
        // Check if the click is on the collapse button - if so, ignore it
        const target = e.target as HTMLElement;
        const isCollapseButton = target.closest('.group-collapse-button');

        if (isCollapseButton) {
            return; // Don't trigger parent selection logic for collapse button clicks
        }

        if (!isDragEnabled) {
            // If drag is disabled, just handle click
            if (onSelect) {
                onSelect(e.shiftKey);
            }
            return;
        }

        mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
        isDragStartedRef.current = false;
        shiftKeyRef.current = e.shiftKey;

        // Set a timeout to detect if this is a drag intent
        dragTimeoutRef.current = setTimeout(() => {
            isDragStartedRef.current = true;
        }, 150) as unknown as number; // 150ms delay before considering it a drag
    }, [isDragEnabled, onSelect]);

    // Handle mouse up - if no drag was started, treat as click
    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        // Check if the click is on the collapse button - if so, ignore it
        const target = e.target as HTMLElement;
        const isCollapseButton = target.closest('.group-collapse-button');

        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
            dragTimeoutRef.current = null;
        }

        // If drag wasn't started and we have a select handler, call it (but not if it's a collapse button)
        if (!isDragStartedRef.current && onSelect && !isCollapseButton) {
            onSelect(shiftKeyRef.current);
        }

        isDragStartedRef.current = false;
        mouseDownPosRef.current = null;
        shiftKeyRef.current = false;
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

    const isNote = element.element_type === 'NOTE';
    const isGroup = element.element_type === 'GROUP';
    const isGroupParent = isGroup;
    const isGroupChild = element.group_level && element.group_level > 0;


    // Get the group parent's background color for group children
    let groupParentColor: string | null = null;
    if (isGroupChild && element.parent_element_id) {
        // Compare both as strings to handle UUID vs string mismatch
        const groupParent = allElements.find((el: ScriptElement) => el && String(el.element_id) === String(element.parent_element_id));
        groupParentColor = groupParent?.custom_color || '#E2E8F0';
    }

    // Handle group collapse/expand toggle
    const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
        console.log('🔄 TOGGLE COLLAPSE:', {
            elementName: element.element_name,
            elementType: element.element_type,
            isGroupParent,
            hasOnToggle: !!onToggleGroupCollapse
        });
        
        e.preventDefault();
        e.stopPropagation();

        if (onToggleGroupCollapse && isGroupParent) {
            console.log('🔄 TOGGLE COLLAPSE - EXECUTING TOGGLE');
            onToggleGroupCollapse(element.element_id);
        } else {
            console.log('🔄 TOGGLE COLLAPSE - NOT EXECUTING:', {
                hasOnToggle: !!onToggleGroupCollapse,
                isGroupParent
            });
        }
    }, [onToggleGroupCollapse, isGroupParent, element.element_id, element.element_name, element.element_type]);

    const backgroundColor = element.custom_color || "#E2E8F0";
    const hasCustomBackground = !!element.custom_color && element.custom_color !== "#E2E8F0";
    let textColor: string;
    let fontWeight: string;
    let leftBarColor: string;

    if (isNote || isGroup) {
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
        if (element.element_type !== 'CUE' || !element.department_id) {
            return '';
        }

        const deptPrefix = element.department_initials ||
            (element.department_name ? element.department_name.substring(0, 2).toUpperCase() : 'XX');

        let departmentCueCount = 0;
        for (let i = 0; i <= index; i++) {
            const currentElement = allElements[i];
            if (currentElement && currentElement.element_type === 'CUE' &&
                currentElement.department_id === element.department_id) {
                departmentCueCount++;
            }
        }

        return `${deptPrefix}-${departmentCueCount.toString().padStart(2, '0')}`;
    })();

    const timeDisplay = useMemo(() => {
        const timeValue = element.offset_ms || 0;

        // If clock times are requested, use absolute time formatting
        if (showClockTimes) {
            if (!scriptStartTime) {
                return '--:--:--'; // Placeholder to prevent offset time from showing
            }
            return formatAbsoluteTime(scriptStartTime, timeValue, effectiveUseMilitaryTime);
        }

        // Show offset time when clock times are not requested
        return formatTimeOffset(timeValue, effectiveUseMilitaryTime);
    }, [element.offset_ms, showClockTimes, scriptStartTime, effectiveUseMilitaryTime]);

    const durationDisplay = useMemo(() => {
        // For SHOW START elements, always calculate from script times if available
        if (element.element_name?.toUpperCase() === 'SHOW START' &&
            scriptStartTime && scriptEndTime) {
            const startTime = new Date(scriptStartTime);
            const endTime = new Date(scriptEndTime);
            const durationMs = endTime.getTime() - startTime.getTime();

            if (durationMs > 0) {
                return formatTimeOffset(durationMs, false); // Duration should not use military time
            }
        }

        if (element.duration_ms) {
            return formatTimeOffset(element.duration_ms, false); // Duration should not use military time
        }


        return '-';
    }, [element.duration_ms, element.element_name, scriptStartTime, scriptEndTime, effectiveUseMilitaryTime]);

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
            position="relative"
            _hover={isDragEnabled || onSelect || onEdit ? {
                borderColor: isSelected ? "blue.400" : "orange.400"
            } : undefined}
            transition="all 0s"
            borderRadius="none"
            overflow="visible"
            cursor={isDragEnabled ? "pointer" : "default"}
            pointerEvents={isDragEnabled || onSelect || onEdit ? "auto" : "none"}
            sx={isDragEnabled || onSelect || onEdit ? {} : {
                '&:hover': {
                    borderColor: 'transparent !important',
                    backgroundColor: backgroundColor + ' !important'
                }
            }}
            onMouseDown={isDragEnabled || onSelect ? handleMouseDown : undefined}
            onMouseUp={isDragEnabled || onSelect ? handleMouseUp : undefined}
            onMouseMove={isDragEnabled ? handleMouseMove : undefined}
            onDoubleClick={onEdit ? handleDoubleClick : undefined}
            {...(isDragEnabled ? { ...attributes, ...listeners } : {})}
        >
            {/* Extended color overlay for group children - positioned relative to entire row */}
            {isGroupChild && groupParentColor ? (
                <Box
                    position="absolute"
                    w="16px"
                    h="34px"
                    bg={groupParentColor}
                    left="-3px"
                    top="-3px"
                    zIndex={10}
                />
            ) : null}

            <HStack spacing={0} align="center" h="28px">
                <Box
                    w="10px"
                    h="28px"
                    bg={isNote || isGroup ? "transparent" : leftBarColor}
                    flexShrink={0}
                    mt="1px"
                    mb="1px"
                    position="relative"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                >

                    {/* Collapse/Expand button for group parents (only in interactive mode) */}
                    {isGroupParent && onToggleGroupCollapse && (
                        <IconButton
                            aria-label={element.is_collapsed ? "Expand group" : "Collapse group"}
                            icon={element.is_collapsed ? <BiSolidRightArrow /> : <AppIcon name="triangle-down" />}
                            size="sm"
                            variant="unstyled"
                            color="white"
                            minW="12px"
                            h="28px"
                            onMouseDown={handleToggleCollapse}
                            className="group-collapse-button"
                            _hover={{ color: "orange.400", bg: "transparent" }}
                            bg="transparent"
                            _active={{ bg: "transparent", color: "orange.400" }}
                            _focus={{ bg: "transparent", boxShadow: "none", outline: "none" }}
                            _focusVisible={{ bg: "transparent", boxShadow: "none", outline: "none" }}
                            position="absolute"
                            left="4px"
                            zIndex={10}
                            pointerEvents="auto"
                        />
                    )}
                </Box>

                {/* Time Offset */}
                <Box w="120px" pl={5} pr={4} py={.5} borderColor="gray.500" position="relative">
                    <Text fontSize="sm" color={textColor} textAlign="center" fontWeight={fontWeight}>
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
                <Box w="100px" px={3} position="relative" py={.5} borderColor="gray.500">
                    <Text fontSize="sm" color={textColor} textAlign="center" fontWeight={fontWeight}>
                        {durationDisplay}
                    </Text>
                    {!(colorizeDepNames && element.element_type !== 'NOTE' && element.element_type !== 'GROUP') && (
                        <Box
                            position="absolute"
                            right="0"
                            top="-3px"
                            height="29px"
                            width="1px"
                            bg="gray.400"
                        />
                    )}
                </Box>

                {/* Department Name */}
                <Box w="100px"
                    height="100%"
                    display="flex"
                    alignItems="center"
                    px={element.element_type === 'NOTE' || element.element_type === 'GROUP' || !colorizeDepNames ? 3 : 0}
                >
                    {colorizeDepNames && element.department_color && element.element_type !== 'NOTE' && element.element_type !== 'GROUP' ? (
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
                            {(element.element_type === 'NOTE' || element.element_type === 'GROUP') ? '' : (element.department_name || '')}
                        </Text>
                    )}
                </Box>

                {/* Cue ID */}
                <Box w="80px" px={3} position="relative" py={.5} borderColor="gray.500">
                    <Text fontSize="sm" fontWeight={hasCustomBackground ? "bold" : "normal"} color={cueIdColor} textAlign="center" marginTop="-1px">
                        {dynamicCueID || '\u00A0'}
                    </Text>
                    {!(colorizeDepNames && element.element_type !== 'NOTE' && element.element_type !== 'GROUP') && (
                        <Box
                            position="absolute"
                            left="0"
                            top="-3px"
                            height="29px"
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
                <Box w="240px" pl={6} pr={3} position="relative" py={.5} borderColor="gray.500">
                    <Text fontSize="sm" color={textColor} textAlign="left" isTruncated fontWeight={fontWeight} marginTop="-1px">
                        {element.element_name}
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
                <Box flex={1} pl={6} pr={3} position="relative" py={.5} borderColor="gray.500">
                    <Text fontSize="sm" color={textColor} textAlign="left" isTruncated fontWeight={fontWeight} marginTop="-1px">
                        {element.cue_notes || '\u00A0'}
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
                <Box w="180px" pl={6} pr={3} position="relative" py={.5} borderColor="gray.500">
                    <Text fontSize="sm" color={textColor} textAlign="left" isTruncated fontWeight={fontWeight} marginTop="-1px">
                        {element.location_details || '\u00A0'}
                    </Text>
                    {element.priority !== 'SAFETY' && (
                        <Box
                            position="absolute"
                            right="0"
                            top="-3px"
                            height="29px"
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
                    {isGroup ? (
                        // Groups don't have priorities - show empty space
                        <Text fontSize="sm" color={textColor} textAlign="center" fontWeight={fontWeight} marginTop="-1px">
                            {'\u00A0'}
                        </Text>
                    ) : element.priority === 'SAFETY' ? (
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
};
