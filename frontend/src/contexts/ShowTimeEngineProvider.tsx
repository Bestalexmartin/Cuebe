// frontend/src/contexts/ShowTimeEngineProvider.tsx

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { ShowTimeEngine, ShowTimeEngineImpl, PlaybackState } from './ShowTimeEngine';
import type { ScriptElement } from '../features/script/types/scriptElements';

export type ElementHighlightState = 'inactive' | 'upcoming' | 'current' | 'past';
export type ElementBorderState = 'red_border' | 'none';

interface TimingBoundary {
    time: number;
    elementId: string;
    action: ElementHighlightState | ElementBorderState;
}

interface ShowTimeEngineContextValue {
    // ShowTimeEngine instance
    engine: ShowTimeEngine;
    
    // Current state (reactive)
    playbackState: PlaybackState;
    currentShowTime: number;
    totalPauseTime: number;
    currentTimestamp: number;
    
    // Convenience getters
    isPlaybackPlaying: boolean;
    isPlaybackPaused: boolean;
    isPlaybackStopped: boolean;
    isPlaybackSafety: boolean;
    isPlaybackComplete: boolean;
    
    // Element state management
    elementStates: Map<string, ElementHighlightState>;
    elementBorderStates: Map<string, ElementBorderState>;
    timingBoundaries: TimingBoundary[];
    passedElements: Set<string>; // For Tetris scrolling
    
    // Actions
    startPlayback: () => void;
    pausePlayback: () => void;
    safetyStop: () => void;
    completePlayback: () => void;
    stopPlayback: () => void;
    
    // Element boundary management
    setElementBoundaries: (elements: ScriptElement[], lookaheadMs: number) => void;
    processBoundariesForTime: (currentTimeMs: number) => void;
    clearAllElementStates: () => void;
    
    // Element state queries
    getElementHighlightState: (elementId: string) => ElementHighlightState | undefined;
    getElementBorderState: (elementId: string) => ElementBorderState | undefined;
    shouldHideElement: (elementId: string) => boolean;
}

const ShowTimeEngineContext = createContext<ShowTimeEngineContextValue | null>(null);

interface ShowTimeEngineProviderProps {
    children: ReactNode;
    script?: { start_time: string } | null;
}

export const ShowTimeEngineProvider: React.FC<ShowTimeEngineProviderProps> = ({ children, script }) => {
    const [engine] = useState(() => new ShowTimeEngineImpl(script?.start_time));
    const [playbackState, setPlaybackState] = useState<PlaybackState>('STOPPED');
    const [currentShowTime, setCurrentShowTime] = useState<number>(0);
    const [totalPauseTime, setTotalPauseTime] = useState<number>(0);
    const [currentTimestamp, setCurrentTimestamp] = useState<number>(Date.now());
    const [elementStates, setElementStates] = useState<Map<string, ElementHighlightState>>(new Map());
    const [elementBorderStates, setElementBorderStates] = useState<Map<string, ElementBorderState>>(new Map());
    const [timingBoundaries, setTimingBoundaries] = useState<TimingBoundary[]>([]);
    const [passedElements, setPassedElements] = useState<Set<string>>(new Set());

    // Setup engine callbacks
    useEffect(() => {
        const handleStateChange = (state: PlaybackState) => {
            setPlaybackState(state);
        };

        const handleShowTimeUpdate = (showTime: number) => {
            setCurrentShowTime(showTime);
        };

        const handleTimestampUpdate = (timestamp: number) => {
            setCurrentTimestamp(timestamp);
        };

        engine.onStateChange(handleStateChange);
        engine.onShowTimeUpdate(handleShowTimeUpdate);
        engine.onTimestampUpdate(handleTimestampUpdate);

        // Periodically update totalPauseTime for UI reactivity
        const pauseTimeInterval = setInterval(() => {
            const currentTotal = engine.totalPauseTime;
            if (currentTotal !== totalPauseTime) {
                setTotalPauseTime(currentTotal);
            }
        }, 100);

        // Cleanup
        return () => {
            clearInterval(pauseTimeInterval);
            engine.destroy();
        };
    }, [engine]);

    // Update engine when script changes
    useEffect(() => {
        engine.setScript(script?.start_time);
    }, [engine, script?.start_time]);

    // Process boundaries when show time updates
    useEffect(() => {
        if (timingBoundaries.length > 0) {
            processBoundariesForTime(currentShowTime);
        }
    }, [currentShowTime, timingBoundaries]);

    // Action methods
    const startPlayback = useCallback(() => engine.start(), [engine]);
    const pausePlayback = useCallback(() => engine.pause(), [engine]);
    const safetyStop = useCallback(() => engine.safety(), [engine]);
    const completePlayback = useCallback(() => engine.complete(), [engine]);
    const stopPlayback = useCallback(() => engine.stop(), [engine]);

    // Element boundary management
    const setElementBoundaries = useCallback((elements: ScriptElement[], lookaheadMs: number) => {
        const boundaries: TimingBoundary[] = [];
        
        const lookbehindMs = 5000; // Keep current highlight for 5s after element start
        const redBorderMs = 5000; // Red border active for 5s after start
        
        // Find the latest element end time for script completion detection
        let scriptEndTime = 0;
        elements.forEach(element => {
            const start = element.offset_ms || 0;
            const endTime = start + lookbehindMs;
            if (endTime > scriptEndTime) {
                scriptEndTime = endTime;
            }
        });
        
        elements.forEach(element => {
            const start = element.offset_ms || 0;
            
            // Boundary: Element becomes upcoming (lookahead window before start)
            if (lookaheadMs > 0) {
                boundaries.push({
                    time: start - lookaheadMs,
                    elementId: element.element_id,
                    action: 'upcoming'
                });
            }
            
            // Boundary: Element becomes current (at start time)
            boundaries.push({
                time: start,
                elementId: element.element_id,
                action: 'current'
            });
            
            // Boundary: Red border appears (at start time)
            boundaries.push({
                time: start,
                elementId: element.element_id,
                action: 'red_border'
            });
            
            // Boundary: Red border disappears (5 seconds after start)
            boundaries.push({
                time: start + redBorderMs,
                elementId: element.element_id,
                action: 'none'
            });
            
            // Boundary: Element becomes past (5s after start)
            boundaries.push({
                time: start + lookbehindMs,
                elementId: element.element_id,
                action: 'past'
            });
        });
        
        // Add script completion boundary
        if (scriptEndTime > 0) {
            boundaries.push({
                time: scriptEndTime,
                elementId: 'SCRIPT_COMPLETE',
                action: 'past' // Dummy action for script completion detection
            });
        }
        
        // Sort boundaries by time
        boundaries.sort((a, b) => a.time - b.time);
        
        setTimingBoundaries(boundaries);
        setElementStates(new Map()); // Reset element states when boundaries change
        setElementBorderStates(new Map());
        setPassedElements(new Set());
    }, []);

    const processBoundariesForTime = useCallback((currentTimeMs: number) => {
        // Skip processing if stopped
        if (playbackState === 'STOPPED') {
            return;
        }
        
        // Check for script completion first
        const scriptCompleteBoundary = timingBoundaries.find(
            b => b.elementId === 'SCRIPT_COMPLETE' && b.time <= currentTimeMs
        );
        
        if (scriptCompleteBoundary && playbackState !== 'COMPLETE') {
            // Trigger script completion
            completePlayback();
            return;
        }
        
        // Optimize: only copy Maps if we actually need to make changes
        let newStates: Map<string, ElementHighlightState> | null = null;
        let newBorderStates: Map<string, ElementBorderState> | null = null;
        let newPassedElements: Set<string> | null = null;
        let hasChanges = false;
        
        // Get unique element IDs more efficiently
        const elementIds = new Set<string>();
        for (const boundary of timingBoundaries) {
            if (boundary.elementId !== 'SCRIPT_COMPLETE') {
                elementIds.add(boundary.elementId);
            }
        }
        
        // Process elements using the same approach as shared side
        for (const elementId of elementIds) {
            let currentState: ElementHighlightState = 'inactive';
            let currentBorderState: ElementBorderState = 'none';
            
            // Process all boundaries for this element at current time
            timingBoundaries
                .filter(b => b.elementId === elementId && b.time <= currentTimeMs)
                .forEach(boundary => {
                    if (boundary.action === 'upcoming') {
                        currentState = 'upcoming';
                    } else if (boundary.action === 'current') {
                        currentState = 'current';
                    } else if (boundary.action === 'inactive') {
                        currentState = 'inactive';
                    } else if (boundary.action === 'past') {
                        currentState = 'past';
                    } else if (boundary.action === 'red_border') {
                        currentBorderState = 'red_border';
                    } else if (boundary.action === 'none') {
                        currentBorderState = 'none';
                    }
                });
            
            // Check state changes (lazy Map creation)
            const previousState = elementStates.get(elementId);
            if (previousState !== currentState) {
                if (!newStates) newStates = new Map(elementStates);
                newStates.set(elementId, currentState);
                hasChanges = true;
            }
            
            const previousBorderState = elementBorderStates.get(elementId);
            if (previousBorderState !== currentBorderState) {
                if (!newBorderStates) newBorderStates = new Map(elementBorderStates);
                newBorderStates.set(elementId, currentBorderState);
                hasChanges = true;
            }
            
            // Mark elements as passed when they become past (for Tetris scrolling)
            if ((currentState as string) === 'past' && !passedElements.has(elementId)) {
                // Find element start time from timing boundaries
                const elementStartBoundary = timingBoundaries.find(
                    b => b.elementId === elementId && b.action === 'current'
                );
                if (elementStartBoundary && currentTimeMs > elementStartBoundary.time + 5000) {
                    if (!newPassedElements) newPassedElements = new Set(passedElements);
                    newPassedElements.add(elementId);
                    hasChanges = true;
                }
            }
        }
        
        if (hasChanges) {
            setElementStates(newStates || elementStates);
            setElementBorderStates(newBorderStates || elementBorderStates);
            setPassedElements(newPassedElements || passedElements);
        }
    }, [timingBoundaries, playbackState, elementStates, elementBorderStates, passedElements, completePlayback]);

    const clearAllElementStates = useCallback(() => {
        setElementStates(new Map());
        setElementBorderStates(new Map());
        setPassedElements(new Set());
    }, []);

    const getElementHighlightState = useCallback((elementId: string): ElementHighlightState | undefined => {
        // Don't apply overlays when playback is complete or stopped
        if (playbackState === 'COMPLETE' || playbackState === 'STOPPED') return undefined;
        return elementStates.get(elementId);
    }, [elementStates, playbackState]);

    const getElementBorderState = useCallback((elementId: string): ElementBorderState | undefined => {
        return elementBorderStates.get(elementId);
    }, [elementBorderStates]);

    const shouldHideElement = useCallback((elementId: string) => {
        // Never hide elements when script is complete or stopped
        if (playbackState === 'COMPLETE' || playbackState === 'STOPPED') {
            return false;
        }
        return passedElements.has(elementId);
    }, [passedElements, playbackState]);

    // Computed properties
    const isPlaybackPlaying = playbackState === 'PLAYING';
    const isPlaybackPaused = playbackState === 'PAUSED';
    const isPlaybackStopped = playbackState === 'STOPPED';
    const isPlaybackSafety = playbackState === 'SAFETY';
    const isPlaybackComplete = playbackState === 'COMPLETE';

    // Memoize context value
    const contextValue = useMemo(() => ({
        engine,
        playbackState,
        currentShowTime,
        totalPauseTime,
        currentTimestamp,
        isPlaybackPlaying,
        isPlaybackPaused,
        isPlaybackStopped,
        isPlaybackSafety,
        isPlaybackComplete,
        elementStates,
        elementBorderStates,
        timingBoundaries,
        passedElements,
        startPlayback,
        pausePlayback,
        safetyStop,
        completePlayback,
        stopPlayback,
        setElementBoundaries,
        processBoundariesForTime,
        clearAllElementStates,
        getElementHighlightState,
        getElementBorderState,
        shouldHideElement
    }), [
        engine,
        playbackState,
        currentShowTime,
        totalPauseTime,
        currentTimestamp,
        isPlaybackPlaying,
        isPlaybackPaused,
        isPlaybackStopped,
        isPlaybackSafety,
        isPlaybackComplete,
        elementStates,
        elementBorderStates,
        timingBoundaries,
        passedElements,
        startPlayback,
        pausePlayback,
        safetyStop,
        completePlayback,
        stopPlayback,
        setElementBoundaries,
        processBoundariesForTime,
        clearAllElementStates,
        getElementHighlightState,
        getElementBorderState,
        shouldHideElement
    ]);

    return (
        <ShowTimeEngineContext.Provider value={contextValue}>
            {children}
        </ShowTimeEngineContext.Provider>
    );
};

export const useShowTimeEngine = (): ShowTimeEngineContextValue => {
    const context = useContext(ShowTimeEngineContext);
    if (!context) {
        throw new Error('useShowTimeEngine must be used within a ShowTimeEngineProvider');
    }
    return context;
};

// Convenience hooks for specific use cases
export const usePlayState = () => {
    const { playbackState, isPlaybackPlaying, isPlaybackPaused, isPlaybackStopped, currentShowTime } = useShowTimeEngine();
    return { playbackState, isPlaybackPlaying, isPlaybackPaused, isPlaybackStopped, currentShowTime };
};

export const usePlayActions = () => {
    const { startPlayback, pausePlayback, stopPlayback, safetyStop, completePlayback } = useShowTimeEngine();
    return { startPlayback, pausePlayback, stopPlayback, safetyStop, completePlayback };
};