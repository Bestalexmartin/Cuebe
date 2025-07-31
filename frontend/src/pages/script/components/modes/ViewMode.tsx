// frontend/src/pages/script/components/modes/ViewMode.tsx

import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import { VStack, Text, Box, Flex } from '@chakra-ui/react';
import { useScriptElements } from '../../hooks/useScriptElements';
import { useScript } from '../../../../hooks/useScript';
import { CueElement } from '../CueElement';
import { ScriptElementsHeader } from '../ScriptElementsHeader';
import { ScriptElement } from '../../../../types/scriptElements';

interface ViewModeProps {
    scriptId: string;
    colorizeDepNames?: boolean;
    showClockTimes?: boolean;
    elements?: ScriptElement[]; // Optional prop to override default fetching
    script?: any; // Optional cached script to prevent refetching
    onScrollStateChange?: (state: {
        isAtTop: boolean;
        isAtBottom: boolean;
        allElementsFitOnScreen: boolean;
    }) => void;
}

export interface ViewModeRef {
    refetchElements: () => Promise<void>;
}

const ViewModeComponent = forwardRef<ViewModeRef, ViewModeProps>(({ 
    scriptId, 
    colorizeDepNames = false, 
    showClockTimes = false,
    elements: providedElements,
    script: providedScript,
    onScrollStateChange
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

                {(shouldFetchElements ? (!isLoading && !error) : true) && elements.length === 0 && (
                    <Flex justify="center" align="center" height="200px" direction="column" spacing={4}>
                        <Text color="gray.500" fontSize="lg">
                            No script elements yet
                        </Text>
                        <Text color="gray.400" fontSize="sm">
                            Switch to Edit mode to add cues, notes, and groups
                        </Text>
                    </Flex>
                )}

                {(shouldFetchElements ? (!isLoading && !error) : true) && elements.length > 0 && (
                    <VStack 
                        spacing={0} 
                        align="stretch"
                        css={{
                            '& > *': {
                                userSelect: 'none !important',
                                WebkitUserSelect: 'none !important',
                                MozUserSelect: 'none !important',
                                msUserSelect: 'none !important',
                                pointerEvents: 'none !important',
                                cursor: 'default !important',
                                '&:hover': {
                                    backgroundColor: 'inherit !important',
                                    borderColor: 'inherit !important',
                                    color: 'inherit !important',
                                    transform: 'none !important'
                                },
                                '&:active': {
                                    backgroundColor: 'inherit !important',
                                    borderColor: 'inherit !important',
                                    color: 'inherit !important',
                                    transform: 'none !important'
                                },
                                '&:focus': {
                                    outline: 'none !important',
                                    boxShadow: 'none !important'
                                }
                            }
                        }}
                    >
                        {elements.map((element, index) => {
                            // Only show clock times if we have the required script start time
                            const shouldShowClockTimes = showClockTimes && !!script?.startTime;
                            return (
                                <CueElement
                                    key={element.elementID}
                                    element={element}
                                    index={index}
                                    allElements={elements}
                                    colorizeDepNames={colorizeDepNames}
                                    showClockTimes={shouldShowClockTimes}
                                    scriptStartTime={script?.startTime}
                                    scriptEndTime={script?.endTime}
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
        prevProps.elements === nextProps.elements &&
        prevProps.script === nextProps.script
        // Deliberately ignoring onScrollStateChange
    );
};

export const ViewMode = React.memo(ViewModeComponent, areEqual);