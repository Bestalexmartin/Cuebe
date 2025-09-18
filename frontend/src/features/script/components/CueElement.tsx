// frontend/src/features/script/components/CueElement.tsx

import React, { useRef, useCallback, useMemo, useState } from 'react';
import { Box, HStack, Text, IconButton } from '@chakra-ui/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BiSolidRightArrow } from "react-icons/bi";
import { ScriptElement } from '../types/scriptElements';
import { getTextColorForBackground } from '../../../utils/colorUtils';
import { AppIcon } from '../../../components/AppIcon';
import { formatTimeOffset } from '../../../utils/timeUtils';
import { formatElementTime } from '../../../utils/showTimeUtils';
import { useShowTimeControlsOptional, useElementPlaybackState } from '../../../contexts/ShowTimeEngineProvider';
import { useSharedShowTimeEngineOptional } from '../../../shared/contexts/SharedShowTimeEngineProvider';
import { ElementHighlightState, ElementBorderState } from '../../../contexts/ShowTimeEngineProvider';

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
    highlightState?: ElementHighlightState | null;
    borderState?: ElementBorderState | null;
    mode?: 'edit' | 'view';
    isReadOnly?: boolean;
    // Optional props for timing context - provided when timing engine is not available via context
    totalPauseTime?: number;
    showTimeEngine?: any;
}

const CueElementComponent: React.FC<CueElementProps> = (props: CueElementProps) => {
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
        onToggleGroupCollapse,
        highlightState = null,
        borderState = null,
        mode: _mode = 'view',
        isReadOnly = false
    } = props;


    // Use useMilitaryTime directly like colorizeDepNames and showClockTimes
    // All preferences are now passed as props from parent components
    const effectiveUseMilitaryTime = useMilitaryTime;

    // Get overlay style for playback highlighting
    const getOverlayStyle = useCallback((state: ElementHighlightState) => {
        switch (state) {
            case 'current':
                return { backgroundColor: 'rgba(0, 0, 0, 0.0)' }; // No overlay - fully visible
            case 'upcoming':
                return { backgroundColor: 'rgba(0, 0, 0, 0.35)' }; // 35% dimming
            case 'past':
                return { backgroundColor: 'rgba(0, 0, 0, 0.8)' }; // 80% dimming for past elements
            case 'inactive':
                return { backgroundColor: 'rgba(0, 0, 0, 0.8)' }; // 80% dimming
        }
    }, []);


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
        // Prevent interaction in read-only mode
        if (isReadOnly) {
            return;
        }

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
    const [isHovered, setIsHovered] = useState(false);


    // Get the group parent's background color for group children
    let groupParentColor: string | null = null;
    if (isGroupChild && element.parent_element_id) {
        // Compare both as strings to handle UUID vs string mismatch
        const groupParent = allElements.find((el: ScriptElement) => el && String(el.element_id) === String(element.parent_element_id));
        groupParentColor = groupParent?.custom_color || '#E2E8F0';
    }

    // Handle group collapse/expand toggle
    const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
        // Prevent group collapse in read-only mode
        if (isReadOnly) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        if (onToggleGroupCollapse && isGroupParent) {
            onToggleGroupCollapse(element.element_id);
        }
    }, [onToggleGroupCollapse, isGroupParent, element.element_id, isReadOnly]);

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

    // Get stable controls (engine and totalPauseTime) without subscribing to 100ms ticker
    // Prefer explicit props if provided (used by shared page)
    const controls = useShowTimeControlsOptional();
    const sharedControls = useSharedShowTimeEngineOptional();
    const engine = props.showTimeEngine ?? controls?.engine ?? sharedControls?.engine;
    const totalPauseTime = props.totalPauseTime ?? controls?.totalPauseTime ?? sharedControls?.totalPauseTime ?? 0;

    // Subscribe to element-specific playback state (no parent re-render)
    const { highlight, border } = useElementPlaybackState(element.element_id);
    const effectiveHighlight: ElementHighlightState | null = highlightState ?? highlight;
    const effectiveBorder: ElementBorderState | null = borderState ?? border;

    const timeDisplay = useMemo(() => {
        const timeValue = element.offset_ms || 0;

        // If clock times are requested, use ShowTimeEngine-aware formatting
        if (showClockTimes) {
            if (!scriptStartTime) {
                return '--:--:--'; // Placeholder to prevent offset time from showing
            }
            // Use ShowTimeEngine-aware utility that accounts for pause time
            if (engine) {
                return formatElementTime(element, { start_time: scriptStartTime }, engine, effectiveUseMilitaryTime);
            }
            return '--:--:--';
        }

        // Show offset time when clock times are not requested
        return formatTimeOffset(timeValue, effectiveUseMilitaryTime);
    }, [element, showClockTimes, scriptStartTime, effectiveUseMilitaryTime, engine, totalPauseTime]);

    const durationDisplay = useMemo(() => {
        // For SHOW START note, compute actual show duration as:
        // (offset + duration) of the final script element relative to show start
        if (element.element_name?.toUpperCase() === 'SHOW START') {
            if (allElements && allElements.length > 0) {
                let maxEndMs = 0;
                for (const el of allElements) {
                    const start = el.offset_ms || 0;
                    const end = start + (el.duration_ms || 0);
                    if (end > maxEndMs) maxEndMs = end;
                }
                if (maxEndMs > 0) {
                    return formatTimeOffset(maxEndMs, false);
                }
            }
            // Fallback: use scripted end time if provided
            if (scriptStartTime && scriptEndTime) {
                const startTime = new Date(scriptStartTime);
                const endTime = new Date(scriptEndTime);
                const durationMs = endTime.getTime() - startTime.getTime();
                if (durationMs > 0) {
                    return formatTimeOffset(durationMs, false);
                }
            }
        }

        if (element.duration_ms) {
            return formatTimeOffset(element.duration_ms, false);
        }

        return '-';
    }, [element.duration_ms, element.element_name, allElements, scriptStartTime, scriptEndTime]);

    const dragStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: 1, // Explicitly prevent @dnd-kit from applying transparency
        zIndex: isDragging ? 1000 : 'auto',
    };


    return (
        <Box
            data-element-id={element.element_id}
            ref={isDragEnabled ? setNodeRef : undefined}
            style={isDragEnabled ? dragStyle : undefined}
            bg={backgroundColor}
            border="3px solid"
            borderColor={backgroundColor}
            zIndex={1}
            mb="1px"
            position="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            transition="all 0s"
            borderRadius="none"
            overflow="visible"
            cursor={isDragEnabled ? "pointer" : "default"}
            pointerEvents={isDragEnabled || onSelect || onEdit ? "auto" : "none"}
            userSelect="none"
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
            {/* Playback highlight overlay - only show during playback */}
            {effectiveHighlight && (
                <Box
                    position="absolute"
                    top="-3px"
                    left="-3px"
                    right="-3px"
                    bottom="-3px"
                    pointerEvents="none"
                    zIndex={15}
                    style={getOverlayStyle(effectiveHighlight)}
                />
            )}

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

            {/* Border overlay - appears above group color bar */}
            {(effectiveBorder === 'red_border' || isSelected || (isHovered && (isDragEnabled || onSelect || onEdit))) && (
                <Box
                    position="absolute"
                    w="calc(100% + 6px)"
                    h="calc(100% + 6px)"
                    left="-3px"
                    top="-3px"
                    border="3px solid"
                    borderColor={
                        effectiveBorder === 'red_border' ? "#e23122" :
                            isSelected ? "blue.400" :
                                "orange.400"
                    }
                    borderRadius="none"
                    pointerEvents="none"
                    zIndex={20}
                    boxShadow={effectiveBorder === 'red_border' ? "inset 0 0 3px rgba(239, 68, 68, 0.8), inset 0 0 6px rgba(239, 68, 68, 0.5)" : "none"}
                />
            )}

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
                    zIndex={0}
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
                <Box 
                    w="140px"
                    minW="100px" 
                    pl={5} 
                    pr={4} 
                    py={.5} 
                    borderColor="gray.500" 
                    flexShrink={1}
                    borderRight={{ base: "1px solid", sm: "none" }}
                    borderRightColor={textColor}
                >
                    <Text fontSize="sm" color={textColor} textAlign="center" fontWeight={fontWeight}>
                        {timeDisplay}
                    </Text>
                </Box>

                {/* Duration - hidden third/last (< 768px), compressible */}
                <Box
                    w="80px"
                    px={3}
                    height="100%"
                    display={{ base: 'none', md: 'flex' }}
                    alignItems="center"
                    justifyContent="center"
                    minW="60px"
                    flexShrink={2}
                    borderLeft="1px solid"
                    borderColor={textColor}
                >
                    <Text fontSize="sm" color={textColor} textAlign="center" fontWeight={fontWeight}>
                        {durationDisplay}
                    </Text>
                </Box>

                {/* Department Name */}
                <Box
                    w="100px"
                    minW="99px"
                    height="100%"
                    display={{ base: 'none', sm: 'flex' }}
                    alignItems="center"
                    px={element.element_type === 'NOTE' || element.element_type === 'GROUP' || !colorizeDepNames ? 3 : 0}
                    flexShrink={0}
                    borderLeft={element.element_type === 'NOTE' || element.element_type === 'GROUP' ? "1px solid" : "none"}
                    borderColor={textColor}
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
                <Box w="80px" minW="80px" px={3} height="100%" display="flex" alignItems="center" justifyContent="center" flexShrink={0} borderLeft={element.element_type === 'NOTE' || element.element_type === 'GROUP' ? "1px solid" : "none"} borderColor={textColor}>
                    <Text fontSize="sm" fontWeight={hasCustomBackground ? "bold" : "normal"} color={cueIdColor} textAlign="center" marginTop="-1px">
                        {dynamicCueID || '\u00A0'}
                    </Text>
                </Box>

                {/* Cue Name/Description */}
                <Box flex={1} minW="120px" maxW="300px" pl={3} pr={3} height="100%" display="flex" alignItems="center" flexShrink={2} borderLeft="1px solid" borderColor={textColor}>
                    <Text fontSize="sm" color={textColor} textAlign="left" isTruncated fontWeight={fontWeight} marginTop="-1px">
                        {element.element_name}
                    </Text>
                </Box>

                {/* Cue Notes - hidden second (< 900px) */}
                <Box
                    flex={1}
                    pl={3}
                    pr={3}
                    height="100%"
                    display={{ base: 'none', lg: 'flex' }}
                    alignItems="center"
                    minW="150px"
                    flexShrink={3}
                    borderLeft="1px solid"
                    borderColor={textColor}
                >
                    <Text fontSize="sm" color={textColor} textAlign="left" isTruncated fontWeight={fontWeight} marginTop="-1px">
                        {element.cue_notes || '\u00A0'}
                    </Text>
                </Box>

                {/* Location - hidden first (< 1200px) */}
                <Box
                    w="180px"
                    minW="180px"
                    pl={3}
                    pr={3}
                    height="100%"
                    display={{ base: 'none', xl: 'flex' }}
                    alignItems="center"
                    flexShrink={0}
                    borderLeft="1px solid"
                    borderColor={textColor}
                >
                    <Text fontSize="sm" color={textColor} textAlign="left" isTruncated fontWeight={fontWeight} marginTop="-1px">
                        {element.location_details || '\u00A0'}
                    </Text>
                </Box>

                {/* Priority */}
                <Box
                    w="122px"
                    minW="122px"
                    height="100%"
                    display={{ base: 'none', sm: 'flex' }}
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                    borderLeft={element.priority === 'SAFETY' ? "none" : "1px solid"}
                    borderColor={textColor}
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

export const CueElement: React.FC<CueElementProps> = React.memo(CueElementComponent, (prev, next) => {
    // Fast bail-out when the element reference and relevant props are unchanged
    return (
        prev.element === next.element &&
        prev.index === next.index &&
        prev.isSelected === next.isSelected &&
        prev.colorizeDepNames === next.colorizeDepNames &&
        prev.showClockTimes === next.showClockTimes &&
        prev.useMilitaryTime === next.useMilitaryTime &&
        prev.scriptStartTime === next.scriptStartTime &&
        prev.scriptEndTime === next.scriptEndTime &&
        prev.isDragEnabled === next.isDragEnabled &&
        prev.isReadOnly === next.isReadOnly &&
        prev.highlightState === next.highlightState &&
        prev.borderState === next.borderState &&
        prev.allElements === next.allElements
    );
});
