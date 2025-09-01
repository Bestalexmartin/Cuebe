// frontend/src/features/script/components/modes/ViewMode.tsx

import React, { forwardRef, useImperativeHandle, useRef, useEffect, useMemo } from 'react';
import { VStack, Text, Box, Flex } from '@chakra-ui/react';
import { CueElement } from '../CueElement';
import { ScriptElementsHeader } from '../ScriptElementsHeader';
import { ScriptElement } from '../../types/scriptElements';
import { usePlayContext } from '../../../../contexts/PlayContext';

interface ViewModeProps {
    scriptId: string; // Required by parent but not used in pure presentation component
    colorizeDepNames?: boolean;
    showClockTimes?: boolean;
    autoSortCues?: boolean;
    useMilitaryTime?: boolean;
    elements: ScriptElement[];      // Always provided by parent (ManageScriptPage)
    allElements: ScriptElement[];   // Always provided by parent (ManageScriptPage)
    script: any;                    // Always provided by parent (ManageScriptPage)
    onScrollStateChange?: (state: {
        isAtTop: boolean;
        isAtBottom: boolean;
        allElementsFitOnScreen: boolean;
    }) => void;
    onToggleGroupCollapse?: (elementId: string) => void;
    groupOverrides?: Record<string, boolean>; // UI-only group collapse overrides
    onAutoSortActivation?: () => void; // Callback when auto-sort needs to be activated
    isHighlightingEnabled?: boolean; // Whether element highlighting is enabled
    lookaheadSeconds?: number; // Lookahead window in seconds
}

export interface ViewModeRef {
    // No methods needed - pure presentation component
}

const ViewModeComponent = forwardRef<ViewModeRef, ViewModeProps>(({
    scriptId: _scriptId, // Not used in pure presentation component
    colorizeDepNames = false,
    showClockTimes = false,
    autoSortCues = false,
    useMilitaryTime = false,
    elements,
    allElements,
    script,
    onScrollStateChange,
    onToggleGroupCollapse,
    onAutoSortActivation,
    isHighlightingEnabled = true,
    lookaheadSeconds = 30
}, ref) => {
    // Get play context for element highlighting
    const { isPlaybackPlaying, playbackState, isPlaybackComplete, getElementHighlightState, getElementBorderState } = usePlayContext();
    

    // Check if auto-sort needs to be activated when component mounts
    useEffect(() => {
        if (!autoSortCues && onAutoSortActivation) {
            onAutoSortActivation();
        }
    }, []); // Only run on mount
    
    // Pure presentation component - no data fetching
    // All data provided by ManageScriptPage via coordinated fetch

    // Create display elements with auto-sort applied when needed
    const displayElements = useMemo(() => {
        if (!autoSortCues || !elements) {
            return elements;
        }

        // Return sorted copy for display
        return [...elements].sort((a, b) => {
            const aOffset = a.offset_ms || 0;
            const bOffset = b.offset_ms || 0;
            return aOffset - bOffset;
        });
    }, [elements, autoSortCues]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // No ref methods needed - data managed by ManageScriptPage
    useImperativeHandle(ref, () => ({
        // No methods needed - pure presentation component
    }), []);

    // Function to check scroll state
    const checkScrollState = () => {
        if (!scrollContainerRef.current || !onScrollStateChange) return;

        const container = scrollContainerRef.current;
        const { scrollTop, scrollHeight, clientHeight } = container;

        const isAtTop = scrollTop <= 1; // Allow for 1px tolerance
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1; // Allow for 1px tolerance
        const allElementsFitOnScreen = scrollHeight <= clientHeight;

        onScrollStateChange({
            isAtTop,
            isAtBottom,
            allElementsFitOnScreen
        });
    };

    // Check scroll state when elements change or component mounts
    useEffect(() => {
        checkScrollState();
    }, [elements]);

    // Add scroll event listener
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        container.addEventListener('scroll', checkScrollState);

        // Check initial state
        setTimeout(checkScrollState, 100); // Small delay to ensure rendering is complete

        return () => {
            container.removeEventListener('scroll', checkScrollState);
        };
    }, [elements]);

    return (
        <VStack height="100%" spacing={0} align="stretch">
            {/* Header Row */}
            <ScriptElementsHeader />

            {/* Elements List */}
            <Box
                ref={scrollContainerRef}
                flex={1}
                overflowY="auto"
                className="hide-scrollbar"
                sx={{
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    MozUserSelect: "none",
                    msUserSelect: "none"
                }}
            >
                {displayElements.length === 0 && (
                    <Flex justify="center" align="center" height="200px" direction="column" gap={4}>
                        <Text color="gray.500" fontSize="lg">
                            No script elements yet
                        </Text>
                        <Text color="gray.400" fontSize="sm">
                            Switch to Edit mode to add cues, notes, and groups
                        </Text>
                    </Flex>
                )}

                {displayElements.length > 0 && (
                    <VStack
                        spacing={0}
                        align="stretch"
                        css={{
                            '& > *': {
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                MozUserSelect: 'none',
                                msUserSelect: 'none',
                                pointerEvents: 'none',
                                cursor: 'default',
                                '&:hover': {
                                    backgroundColor: 'inherit',
                                    borderColor: 'inherit',
                                    color: 'inherit',
                                    transform: 'none'
                                },
                                '&:active': {
                                    backgroundColor: 'inherit',
                                    borderColor: 'inherit',
                                    color: 'inherit',
                                    transform: 'none'
                                },
                                '&:focus': {
                                    outline: 'none',
                                    boxShadow: 'none'
                                }
                            }
                        }}
                    >
                        {displayElements.map((element, index) => {
                            // Only show clock times if we have the required script start time
                            const shouldShowClockTimes = showClockTimes && !!script?.start_time;
                            
                            // Get element highlight state from boundary system (only during playback and when enabled)
                            const highlightState = (isPlaybackPlaying && isHighlightingEnabled) ? getElementHighlightState(element.element_id) : undefined;
                            // Red border is always active during playback and complete state, regardless of highlighting setting
                            const borderState = (isPlaybackPlaying || isPlaybackComplete) ? getElementBorderState(element.element_id) : undefined;
                            

                            return (
                                <CueElement
                                    key={element.element_id}
                                    element={element}
                                    index={index}
                                    allElements={allElements}
                                    colorizeDepNames={colorizeDepNames}
                                    showClockTimes={shouldShowClockTimes}
                                    useMilitaryTime={useMilitaryTime}
                                    scriptStartTime={script?.start_time}
                                    scriptEndTime={script?.end_time}
                                    onToggleGroupCollapse={onToggleGroupCollapse}
                                    highlightState={highlightState}
                                    borderState={borderState}
                                />
                            );
                        })}
                    </VStack>
                )}
            </Box>
        </VStack>
    );
});

// Custom comparison function that ignores callback props
const areEqual = (prevProps: ViewModeProps, nextProps: ViewModeProps) => {
    // Compare all props except callbacks
    return (
        prevProps.scriptId === nextProps.scriptId &&
        prevProps.colorizeDepNames === nextProps.colorizeDepNames &&
        prevProps.showClockTimes === nextProps.showClockTimes &&
        prevProps.autoSortCues === nextProps.autoSortCues &&
        prevProps.useMilitaryTime === nextProps.useMilitaryTime &&
        prevProps.isHighlightingEnabled === nextProps.isHighlightingEnabled &&
        prevProps.elements === nextProps.elements &&
        prevProps.allElements === nextProps.allElements &&
        prevProps.script === nextProps.script
        // Deliberately ignoring onScrollStateChange and onToggleGroupCollapse
    );
};

export const ViewMode = React.memo(ViewModeComponent, areEqual);
