import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import { Box, VStack } from '@chakra-ui/react';
import { CueElement } from '../CueElement';
import { ScriptElementsHeader } from '../ScriptElementsHeader';
import { useSynchronizedPlayContext } from '../../../../contexts/SynchronizedPlayContext';

interface SubscriberViewModeProps {
    scriptId: string;
    colorizeDepNames: boolean;
    showClockTimes: boolean;
    autoSortCues: boolean;
    elements: any[];
    allElements: any[];
    script: any;
    useMilitaryTime: boolean;
    onToggleGroupCollapse?: (elementId: string) => void;
    groupOverrides?: Record<string, boolean>;
    isHighlightingEnabled?: boolean;
    lookaheadSeconds: number;
}

export const SubscriberViewMode: React.FC<SubscriberViewModeProps> = React.memo(({
    scriptId: _scriptId,
    colorizeDepNames,
    showClockTimes,
    elements,
    script,
    useMilitaryTime,
    onToggleGroupCollapse,
    groupOverrides,
    isHighlightingEnabled: _isHighlightingEnabled,
    lookaheadSeconds
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const elementRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    
    const {
        playbackState,
        isPlaybackPlaying,
        currentTime,
        shouldHideElement,
        getElementHighlightState,
        getElementBorderState,
        setElementBoundaries,
        processBoundariesForTime
    } = useSynchronizedPlayContext();

    // Set up timing boundaries when elements or lookahead changes
    useEffect(() => {
        if (elements.length > 0) {
            const lookaheadMs = lookaheadSeconds * 1000;
            setElementBoundaries(elements, lookaheadMs);
        }
    }, [elements, lookaheadSeconds, setElementBoundaries]);

    // Process boundaries for current time
    useEffect(() => {
        if (currentTime !== null && playbackState !== 'STOPPED') {
            processBoundariesForTime(currentTime);
        }
    }, [currentTime, playbackState, processBoundariesForTime]);

    // Filter elements based on Tetris-style hiding (hide passed elements)
    const visibleElements = useMemo(() => {
        if (playbackState === 'STOPPED' || playbackState === 'COMPLETE') {
            return elements; // Show all elements when stopped or complete
        }
        
        return elements.filter(element => !shouldHideElement(element.element_id));
    }, [elements, shouldHideElement, playbackState]);

    // Scroll to keep active/upcoming elements visible
    useEffect(() => {
        if (!isPlaybackPlaying || !currentTime || visibleElements.length === 0) return;

        // Find the first visible upcoming or current element
        const activeElement = visibleElements.find(element => {
            const highlightState = getElementHighlightState(element.element_id);
            return highlightState === 'current' || highlightState === 'upcoming';
        });

        if (activeElement && scrollContainerRef.current) {
            const elementRef = elementRefs.current.get(activeElement.element_id);
            if (elementRef) {
                // Smooth scroll to keep active element in view
                elementRef.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start',
                    inline: 'nearest'
                });
            }
        }
    }, [currentTime, visibleElements, getElementHighlightState, isPlaybackPlaying]);

    // Auto-scroll when elements are hidden (Tetris effect)
    const prevVisibleCountRef = useRef(visibleElements.length);
    useEffect(() => {
        const currentVisibleCount = visibleElements.length;
        const prevVisibleCount = prevVisibleCountRef.current;
        
        // If elements were hidden, scroll to top to show remaining elements
        if (currentVisibleCount < prevVisibleCount && isPlaybackPlaying && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
        
        prevVisibleCountRef.current = currentVisibleCount;
    }, [visibleElements.length, isPlaybackPlaying]);

    const setElementRef = useCallback((elementId: string, ref: HTMLDivElement | null) => {
        if (ref) {
            elementRefs.current.set(elementId, ref);
        } else {
            elementRefs.current.delete(elementId);
        }
    }, []);

    return (
        <Box
            ref={scrollContainerRef}
            height="100%"
            overflowY="auto"
            className="hide-scrollbar"
            css={{
                scrollBehavior: 'smooth'
            }}
        >
            <VStack spacing={0} align="stretch">
                <ScriptElementsHeader colorizeDepNames={colorizeDepNames} />
                {visibleElements.map((element) => {
                    const highlightState = getElementHighlightState(element.element_id);
                    const borderState = getElementBorderState(element.element_id);
                    
                    // Remove all highlighting overlays in COMPLETE mode
                    const finalHighlightState = playbackState === 'COMPLETE' ? null : highlightState;
                    const finalBorderState = playbackState === 'COMPLETE' ? null : borderState;
                    
                    return (
                        <CueElement
                            key={element.element_id}
                            element={element}
                            index={elements.indexOf(element)}
                            allElements={elements}
                            isSelected={false}
                            colorizeDepNames={colorizeDepNames}
                            showClockTimes={showClockTimes}
                            useMilitaryTime={useMilitaryTime}
                            scriptStartTime={script?.start_time}
                            scriptEndTime={script?.end_time}
                            mode="view"
                            highlightState={finalHighlightState}
                            borderState={finalBorderState}
                            isReadOnly={true}
                        />
                    );
                })}
            </VStack>
        </Box>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.scriptId === nextProps.scriptId &&
        prevProps.colorizeDepNames === nextProps.colorizeDepNames &&
        prevProps.showClockTimes === nextProps.showClockTimes &&
        prevProps.lookaheadSeconds === nextProps.lookaheadSeconds &&
        prevProps.elements === nextProps.elements &&
        prevProps.script === nextProps.script
    );
});