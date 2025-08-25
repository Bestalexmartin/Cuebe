// frontend/src/features/script/components/modes/ViewMode.tsx

import React, { forwardRef, useImperativeHandle, useRef, useEffect, useMemo } from 'react';
import { VStack, Text, Box, Flex } from '@chakra-ui/react';
import { useScriptElements } from '../../hooks/useScriptElements';
import { useScript } from '../../hooks/useScript';
import { CueElement } from '../CueElement';
import { ScriptElementsHeader } from '../ScriptElementsHeader';
import { ScriptElement } from '../../types/scriptElements';

interface ViewModeProps {
    scriptId: string;
    colorizeDepNames?: boolean;
    showClockTimes?: boolean;
    autoSortCues?: boolean;
    useMilitaryTime?: boolean;
    elements?: ScriptElement[]; // Optional prop to override default fetching
    allElements?: ScriptElement[]; // All elements including collapsed children for group calculations
    script?: any; // Optional cached script to prevent refetching
    onScrollStateChange?: (state: {
        isAtTop: boolean;
        isAtBottom: boolean;
        allElementsFitOnScreen: boolean;
    }) => void;
    onToggleGroupCollapse?: (elementId: string) => void;
    groupOverrides?: Record<string, boolean>; // UI-only group collapse overrides
}

export interface ViewModeRef {
    refetchElements: () => Promise<void>;
}

const ViewModeComponent = forwardRef<ViewModeRef, ViewModeProps>(({
    scriptId,
    colorizeDepNames = false,
    showClockTimes = false,
    autoSortCues = false,
    useMilitaryTime = false,
    elements: providedElements,
    allElements: providedAllElements,
    script: providedScript,
    onScrollStateChange,
    onToggleGroupCollapse
}, ref) => {

    // Only fetch elements if none are provided
    const shouldFetchElements = !providedElements;
    const { elements: fetchedElements, isLoading, error, refetchElements } = useScriptElements(
        shouldFetchElements ? scriptId : undefined
    );
    // Use provided script if available, otherwise fetch it
    const { script: scriptFromHook } = useScript(providedScript ? undefined : scriptId);
    const script = providedScript || scriptFromHook;

    // Use provided elements if available, otherwise use fetched elements
    const elements = providedElements || fetchedElements;
    const allElementsForGroupCalculations = providedAllElements || elements;

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

    // Expose refetch function to parent via ref
    useImperativeHandle(ref, () => ({
        refetchElements
    }), [refetchElements]);

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
    }, [elements, shouldFetchElements ? isLoading : false]);

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
                {shouldFetchElements && isLoading && (
                    <Flex justify="center" align="center" height="200px">
                        <Text color="gray.500">Loading script elements...</Text>
                    </Flex>
                )}

                {shouldFetchElements && error && (
                    <Flex justify="center" align="center" height="200px">
                        <Text color="red.500">Error: {error}</Text>
                    </Flex>
                )}

                {(shouldFetchElements ? (!isLoading && !error) : true) && displayElements.length === 0 && (
                    <Flex justify="center" align="center" height="200px" direction="column" gap={4}>
                        <Text color="gray.500" fontSize="lg">
                            No script elements yet
                        </Text>
                        <Text color="gray.400" fontSize="sm">
                            Switch to Edit mode to add cues, notes, and groups
                        </Text>
                    </Flex>
                )}

                {(shouldFetchElements ? (!isLoading && !error) : true) && displayElements.length > 0 && (
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

                            return (
                                <CueElement
                                    key={element.element_id}
                                    element={element}
                                    index={index}
                                    allElements={allElementsForGroupCalculations}
                                    colorizeDepNames={colorizeDepNames}
                                    showClockTimes={shouldShowClockTimes}
                                    useMilitaryTime={useMilitaryTime}
                                    scriptStartTime={script?.start_time}
                                    scriptEndTime={script?.end_time}
                                    onToggleGroupCollapse={onToggleGroupCollapse}
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
        prevProps.elements === nextProps.elements &&
        prevProps.allElements === nextProps.allElements &&
        prevProps.script === nextProps.script
        // Deliberately ignoring onScrollStateChange and onToggleGroupCollapse
    );
};

export const ViewMode = React.memo(ViewModeComponent, areEqual);
