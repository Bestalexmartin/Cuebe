import React, { useMemo, useEffect, useRef } from 'react';
import { Box, VStack, useBreakpointValue } from '@chakra-ui/react';
import { CueElement } from '../../../features/script/components/CueElement';
import { ScriptElementsHeader } from '../../../features/script/components/ScriptElementsHeader';
import { useSharedShowTimeEngine } from '../../contexts/SharedShowTimeEngineProvider';

interface SubscriberViewModeProps {
    scriptId: string;
    colorizeDepNames: boolean;
    showClockTimes: boolean;
    elements: any[];
    script: any;
    useMilitaryTime: boolean;
    lookaheadSeconds: number;
}

export const SubscriberViewMode: React.FC<SubscriberViewModeProps> = ({
    scriptId: _scriptId,
    colorizeDepNames,
    showClockTimes,
    elements,
    script,
    useMilitaryTime,
    lookaheadSeconds
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const elementRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    
    const {
        playbackState,
        isPlaybackPlaying,
        currentShowTime: currentTime,
        shouldHideElement,
        getElementHighlightState,
        getElementBorderState,
        setElementBoundaries,
        engine,
        totalPauseTime
    } = useSharedShowTimeEngine();

    // Disable colorized department names on mobile (≤636px)
    const responsiveColorizeDepNames = useBreakpointValue({ base: false, sm: colorizeDepNames });

    // Set up timing boundaries when elements or lookahead changes
    useEffect(() => {
        if (elements.length > 0) {
            const lookaheadMs = lookaheadSeconds * 1000;
            setElementBoundaries(elements, lookaheadMs);
        }
    }, [elements, lookaheadSeconds, setElementBoundaries]);

    // Note: Context timing engine already processes boundaries; avoid duplicate processing here

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
                <Box display={{ base: 'none', sm: 'block' }}>
                    <ScriptElementsHeader colorizeDepNames={responsiveColorizeDepNames} />
                </Box>
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
                            colorizeDepNames={responsiveColorizeDepNames}
                            showClockTimes={showClockTimes}
                            useMilitaryTime={useMilitaryTime}
                            scriptStartTime={script?.start_time}
                            scriptEndTime={script?.end_time}
                            mode="view"
                            highlightState={finalHighlightState}
                            borderState={finalBorderState}
                            isReadOnly={true}
                            totalPauseTime={totalPauseTime}
                            showTimeEngine={engine}
                        />
                    );
                })}
            </VStack>
        </Box>
    );
};
