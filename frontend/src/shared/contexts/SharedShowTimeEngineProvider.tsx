// frontend/src/shared/contexts/SharedShowTimeEngineProvider.tsx

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { ShowTimeEngine, ShowTimeEngineImpl, PlaybackState } from '../../contexts/ShowTimeEngine';
import type { ScriptElement } from '../../features/script/types/scriptElements';
import { computeDisplayShowTime } from '../../utils/showTimeUtils';
import { debugScopedTiming } from '../../utils/debug';

export type SharedElementHighlightState = 'inactive' | 'upcoming' | 'current' | 'past';
export type SharedElementBorderState = 'red_border' | 'none';

interface SharedTimingBoundary {
    time: number;
    elementId: string;
    action: SharedElementHighlightState | SharedElementBorderState;
}

interface SharedShowTimeEngineContextValue {
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
    elementStates: Map<string, SharedElementHighlightState>;
    elementBorderStates: Map<string, SharedElementBorderState>;
    timingBoundaries: SharedTimingBoundary[];
    passedElements: Set<string>; // For Tetris scrolling
    
    // WebSocket handlers (for scoped side)
    handlePlaybackCommand: (command: string, serverTimestampMs: number) => void;
    handlePlaybackStatus: (cumulativeDelayMs: number) => void;
    
    // Element boundary management
    setElementBoundaries: (elements: ScriptElement[], lookaheadMs: number) => void;
    updateElementBoundaries: (elements: ScriptElement[], lookaheadMs: number) => void;
    processBoundariesForTime: (currentTimeMs: number) => void;
    clearAllElementStates: () => void;
    resetAllPlaybackState: () => void;
    
    // Element state queries
    getElementHighlightState: (elementId: string) => SharedElementHighlightState | undefined;
    getElementBorderState: (elementId: string) => SharedElementBorderState | undefined;
    shouldHideElement: (elementId: string) => boolean;
}

const SharedShowTimeEngineContext = createContext<SharedShowTimeEngineContextValue | null>(null);

interface SharedShowTimeEngineProviderProps {
    children: ReactNode;
    script?: { start_time: string } | null;
}

export const SharedShowTimeEngineProvider: React.FC<SharedShowTimeEngineProviderProps> = ({ children, script }) => {
    const [engine] = useState(() => new ShowTimeEngineImpl(script?.start_time));
    const [playbackState, setPlaybackState] = useState<PlaybackState>('STOPPED');
    const [currentShowTime, setCurrentShowTime] = useState<number>(0);
    const [totalPauseTime, setTotalPauseTime] = useState<number>(0);
    const [currentTimestamp, setCurrentTimestamp] = useState<number>(Date.now());
    const [elementStates, setElementStates] = useState<Map<string, SharedElementHighlightState>>(new Map());
    const [elementBorderStates, setElementBorderStates] = useState<Map<string, SharedElementBorderState>>(new Map());
    const [timingBoundaries, setTimingBoundaries] = useState<SharedTimingBoundary[]>([]);
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

    // Process boundaries when show time updates (use safe display time on first PLAY frame)
    useEffect(() => {
        if (timingBoundaries.length > 0) {
            const effectiveTime = computeDisplayShowTime(
                script?.start_time,
                playbackState,
                engine,
                currentShowTime,
                currentTimestamp
            );
            debugScopedTiming('processBoundariesForTime:tick', {
                playbackState,
                currentShowTime,
                currentTimestamp,
                effectiveTime,
                boundaries: timingBoundaries.length
            });
            processBoundariesForTime(effectiveTime);
        }
    }, [currentShowTime, timingBoundaries, playbackState, engine, currentTimestamp, script?.start_time]);

    // WebSocket playback command handler for scoped side
    const handlePlaybackCommand = useCallback((command: string, _serverTimestampMs: number) => {
        // Guard against duplicate commands
        if (command === 'PLAY' && playbackState === 'PLAYING') {
            return;
        }
        
        switch (command) {
            case 'PLAY':
                engine.start();
                // Immediately process boundaries using effective time to seed correct states
                try {
                    const effectiveTime = computeDisplayShowTime(
                        script?.start_time,
                        'PLAYING',
                        engine,
                        engine.getCurrentShowTime(),
                        Date.now()
                    );
                    processBoundariesForTime(effectiveTime);
                } catch {}
                break;
                
            case 'PAUSE':
                engine.pause();
                break;
                
            case 'SAFETY':
                engine.safety();
                break;
                
            case 'COMPLETE':
                engine.complete();
                break;
                
            case 'STOP':
                engine.stop();
                resetAllPlaybackState();
                break;
        }
    }, [playbackState, engine]);

    const handlePlaybackStatus = useCallback((cumulativeDelayMs: number) => {
        try {
            engine.setTotalPauseTime(cumulativeDelayMs || 0);
        } catch {}
    }, [engine]);

    // Element boundary management
    const setElementBoundaries = useCallback((elements: ScriptElement[], lookaheadMs: number) => {
        const boundaries: SharedTimingBoundary[] = [];
        
        const lookbehindMs = 5000; // Keep current highlight for 5s after element start
        const redBorderMs = 5000; // Red border active for 5s after start
        
        // Find the latest element end time for script completion detection
        let scriptEndTime = 0;
        elements.forEach(element => {
            const start = element.offset_ms || 0;
            const endTime = start + lookbehindMs;
            if (endTime > scriptEndTime && endTime > 0) {
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

    const updateElementBoundaries = useCallback((elements: ScriptElement[], lookaheadMs: number) => {
        // Update timing boundaries without resetting element states to prevent flickering
        const boundaries: SharedTimingBoundary[] = [];
        const lookbehindMs = 5000;
        const redBorderMs = 5000;
        
        let scriptEndTime = 0;
        elements.forEach(element => {
            const start = element.offset_ms || 0;
            const endTime = start + lookbehindMs;
            if (endTime > scriptEndTime && endTime > 0) {
                scriptEndTime = endTime;
            }
        });
        
        elements.forEach(element => {
            const start = element.offset_ms || 0;
            
            if (lookaheadMs > 0) {
                boundaries.push({
                    time: start - lookaheadMs,
                    elementId: element.element_id,
                    action: 'upcoming'
                });
            }
            
            boundaries.push({
                time: start,
                elementId: element.element_id,
                action: 'current'
            });
            
            boundaries.push({
                time: start,
                elementId: element.element_id,
                action: 'red_border'
            });
            
            boundaries.push({
                time: start + redBorderMs,
                elementId: element.element_id,
                action: 'none'
            });
            
            boundaries.push({
                time: start + lookbehindMs,
                elementId: element.element_id,
                action: 'past'
            });
        });
        
        if (scriptEndTime > 0) {
            boundaries.push({
                time: scriptEndTime,
                elementId: 'SCRIPT_COMPLETE',
                action: 'past'
            });
        }
        
        boundaries.sort((a, b) => a.time - b.time);
        
        // Only update boundaries, preserve existing element states
        setTimingBoundaries(boundaries);
    }, []);

    const processBoundariesForTime = useCallback((currentTimeMs: number) => {
        // Skip processing if stopped
        if (playbackState === 'STOPPED') {
            return;
        }
        
        // Debug boundaries and states near zero to catch premature reveals
        try {
            if (Math.abs(currentTimeMs) <= 1500 && timingBoundaries.length > 0) {
                const nearZero = timingBoundaries
                    .filter(b => Math.abs(b.time) <= 2000 && b.elementId !== 'SCRIPT_COMPLETE')
                    .slice(0, 8);
                if (nearZero.length) {
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const { debugScopedTiming } = require('../../utils/debug');
                    debugScopedTiming('boundariesNearZero', { currentTimeMs, nearZero });
                }
            }
        } catch {}
        
        // Check for script completion first
        const hasActiveElements = timingBoundaries.some(boundary => 
            boundary.elementId !== 'SCRIPT_COMPLETE' && 
            boundary.action === 'current' && 
            boundary.time > currentTimeMs
        );
        
        const scriptCompleteBoundary = timingBoundaries.find(
            b => b.elementId === 'SCRIPT_COMPLETE' && b.time <= currentTimeMs
        );
        
        if (scriptCompleteBoundary && !hasActiveElements && playbackState !== 'COMPLETE') {
            engine.complete();
            return;
        }
        
        // Optimize: only copy Maps if we actually need to make changes
        let newStates: Map<string, SharedElementHighlightState> | null = null;
        let newBorderStates: Map<string, SharedElementBorderState> | null = null;
        let newPassedElements: Set<string> | null = null;
        let hasChanges = false;
        
        // Get unique element IDs more efficiently
        const elementIds = new Set<string>();
        for (const boundary of timingBoundaries) {
            if (boundary.elementId !== 'SCRIPT_COMPLETE') {
                elementIds.add(boundary.elementId);
            }
        }
        
        // Process elements using the same approach as auth side
        for (const elementId of elementIds) {
            let currentState: SharedElementHighlightState = 'inactive';
            let currentBorderState: SharedElementBorderState = 'none';
            
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
    }, [timingBoundaries, playbackState, elementStates, elementBorderStates, passedElements, engine]);

    const clearAllElementStates = useCallback(() => {
        setElementStates(new Map());
        setElementBorderStates(new Map());
        setPassedElements(new Set());
    }, []);

    const resetAllPlaybackState = useCallback(() => {
        // Fully reset engine timing and provider-managed state
        try { engine.stop(); } catch {}
        try { engine.setScript(null); } catch {}
        setElementStates(new Map());
        setElementBorderStates(new Map());
        setTimingBoundaries([]);
        setPassedElements(new Set());
    }, [engine]);

    const getElementHighlightState = useCallback((elementId: string): SharedElementHighlightState | undefined => {
        // Don't apply overlays when playback is complete or stopped
        if (playbackState === 'COMPLETE' || playbackState === 'STOPPED') return undefined;
        return elementStates.get(elementId);
    }, [elementStates, playbackState]);

    const getElementBorderState = useCallback((elementId: string): SharedElementBorderState | undefined => {
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
        handlePlaybackCommand,
        handlePlaybackStatus,
        setElementBoundaries,
        updateElementBoundaries,
        processBoundariesForTime,
        clearAllElementStates,
        resetAllPlaybackState,
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
        handlePlaybackCommand,
        setElementBoundaries,
        updateElementBoundaries,
        processBoundariesForTime,
        clearAllElementStates,
        resetAllPlaybackState,
        getElementHighlightState,
        getElementBorderState,
        shouldHideElement
    ]);

    return (
        <SharedShowTimeEngineContext.Provider value={contextValue}>
            {children}
        </SharedShowTimeEngineContext.Provider>
    );
};

export const useSharedShowTimeEngine = (): SharedShowTimeEngineContextValue => {
    const context = useContext(SharedShowTimeEngineContext);
    if (!context) {
        throw new Error('useSharedShowTimeEngine must be used within a SharedShowTimeEngineProvider');
    }
    return context;
};

// Convenience hooks for specific use cases
export const useSharedPlayState = () => {
    const { playbackState, isPlaybackPlaying, isPlaybackPaused, isPlaybackStopped, currentShowTime } = useSharedShowTimeEngine();
    return { playbackState, isPlaybackPlaying, isPlaybackPaused, isPlaybackStopped, currentShowTime };
};
