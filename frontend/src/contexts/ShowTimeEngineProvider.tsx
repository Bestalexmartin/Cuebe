// frontend/src/contexts/ShowTimeEngineProvider.tsx

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode, useRef } from 'react';
import { useSyncExternalStore } from 'react';
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

// Stable-controls-only context to avoid 100ms ticker re-renders in parents
interface ShowTimeControlsContextValue {
    engine: ShowTimeEngine;
    playbackState: PlaybackState;
    totalPauseTime: number;
    isPlaybackPlaying: boolean;
    isPlaybackPaused: boolean;
    isPlaybackStopped: boolean;
    isPlaybackSafety: boolean;
    isPlaybackComplete: boolean;
    startPlayback: () => void;
    pausePlayback: () => void;
    safetyStop: () => void;
    completePlayback: () => void;
    stopPlayback: () => void;
    setElementBoundaries: (elements: ScriptElement[], lookaheadMs: number) => void;
    clearAllElementStates: () => void;
}

const ShowTimeControlsContext = createContext<ShowTimeControlsContextValue | null>(null);

// Stable selectors context so consumers don't re-render on ticker updates
interface ShowTimeSelectorsContextValue {
    subscribeElement: (elementId: string, listener: () => void) => () => void;
    getHighlight: (elementId: string) => ElementHighlightState | null;
    getBorder: (elementId: string) => ElementBorderState | null;
}
const ShowTimeSelectorsContext = createContext<ShowTimeSelectorsContextValue | null>(null);

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

    // Refs to latest maps for selector access without causing provider re-renders
    const elementStatesRef = useRef(elementStates);
    const elementBorderStatesRef = useRef(elementBorderStates);
    useEffect(() => { elementStatesRef.current = elementStates; }, [elementStates]);
    useEffect(() => { elementBorderStatesRef.current = elementBorderStates; }, [elementBorderStates]);

    // Per-element listeners to notify only affected components
    const listenersRef = useRef<Map<string, Set<() => void>>>(new Map());
    const notifyElement = useCallback((elementId: string) => {
        const set = listenersRef.current.get(elementId);
        if (!set) return;
        set.forEach(fn => {
            try { fn(); } catch {}
        });
    }, []);

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

        // Periodically update totalPauseTime for UI reactivity (avoid stale closure)
        const lastPauseRef = { current: 0 } as { current: number };
        lastPauseRef.current = engine.totalPauseTime;
        const pauseTimeInterval = setInterval(() => {
            const currentTotal = engine.totalPauseTime;
            if (currentTotal !== lastPauseRef.current) {
                lastPauseRef.current = currentTotal;
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
        const changedIds = new Set<string>();
        
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
                changedIds.add(elementId);
            }
            
            const previousBorderState = elementBorderStates.get(elementId);
            if (previousBorderState !== currentBorderState) {
                if (!newBorderStates) newBorderStates = new Map(elementBorderStates);
                newBorderStates.set(elementId, currentBorderState);
                hasChanges = true;
                changedIds.add(elementId);
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
            const nextStates = newStates || elementStates;
            const nextBorders = newBorderStates || elementBorderStates;
            const nextPassed = newPassedElements || passedElements;

            // Update selector refs first so subscribers read the latest snapshot
            elementStatesRef.current = nextStates;
            elementBorderStatesRef.current = nextBorders;

            // Then update React state (for context consumers that read maps)
            setElementStates(nextStates);
            setElementBorderStates(nextBorders);
            setPassedElements(nextPassed);

            // Finally, notify only the elements that changed
            if (changedIds.size > 0) {
                changedIds.forEach(id => notifyElement(id));
            }
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

    // Memoize context value (includes ticker fields; use only where needed)
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

    // Memoize controls-only context value; exclude ticker fields so identity is stable across ticks
    const controlsValue = useMemo<ShowTimeControlsContextValue>(() => ({
        engine,
        playbackState,
        totalPauseTime,
        isPlaybackPlaying,
        isPlaybackPaused,
        isPlaybackStopped,
        isPlaybackSafety,
        isPlaybackComplete,
        startPlayback,
        pausePlayback,
        safetyStop,
        completePlayback,
        stopPlayback,
        setElementBoundaries,
        clearAllElementStates,
    }), [
        engine,
        playbackState,
        totalPauseTime,
        isPlaybackPlaying,
        isPlaybackPaused,
        isPlaybackStopped,
        isPlaybackSafety,
        isPlaybackComplete,
        startPlayback,
        pausePlayback,
        safetyStop,
        completePlayback,
        stopPlayback,
        setElementBoundaries,
        clearAllElementStates,
    ]);

    // Stable selectors API (does not change with ticker)
    const selectorsValue = useMemo<ShowTimeSelectorsContextValue>(() => ({
        subscribeElement: (elementId: string, listener: () => void) => {
            let set = listenersRef.current.get(elementId);
            if (!set) {
                set = new Set();
                listenersRef.current.set(elementId, set);
            }
            set.add(listener);
            return () => {
                const s = listenersRef.current.get(elementId);
                if (!s) return;
                s.delete(listener);
                if (s.size === 0) listenersRef.current.delete(elementId);
            };
        },
        getHighlight: (elementId: string) => {
            // Remove shading when complete or stopped
            if (playbackState === 'COMPLETE' || playbackState === 'STOPPED') return null;
            return elementStatesRef.current.get(elementId) || null;
        },
        getBorder: (elementId: string) => {
            if (playbackState === 'COMPLETE' || playbackState === 'STOPPED') return null;
            return elementBorderStatesRef.current.get(elementId) || null;
        },
    }), [playbackState]);

    return (
        <ShowTimeControlsContext.Provider value={controlsValue}>
            <ShowTimeSelectorsContext.Provider value={selectorsValue}>
                <ShowTimeEngineContext.Provider value={contextValue}>
                    {children}
                </ShowTimeEngineContext.Provider>
            </ShowTimeSelectorsContext.Provider>
        </ShowTimeControlsContext.Provider>
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

// Controls-only hook (stable across 100ms ticker updates)
export const useShowTimeControls = (): ShowTimeControlsContextValue => {
    const context = useContext(ShowTimeControlsContext);
    if (!context) {
        throw new Error('useShowTimeControls must be used within a ShowTimeEngineProvider');
    }
    return context;
};

// Optional variant: returns null if not within provider
export const useShowTimeControlsOptional = (): ShowTimeControlsContextValue | null => {
    return useContext(ShowTimeControlsContext);
};

// Per-element playback state subscription: re-renders only when that element changes
export const useElementPlaybackState = (elementId: string) => {
    const selectors = useContext(ShowTimeSelectorsContext);
    if (!selectors) {
        // Outside provider: return static values
        return { highlight: null as ElementHighlightState | null, border: null as ElementBorderState | null };
    }
    const subscribe = (onStoreChange: () => void) => selectors.subscribeElement(elementId, onStoreChange);
    // Important: return a primitive snapshot to avoid identity changes causing re-render loops
    const getSnapshotKey = () => {
        const h = selectors.getHighlight(elementId) || '';
        const b = selectors.getBorder(elementId) || '';
        return `${h}|${b}`;
    };
    const key = useSyncExternalStore(subscribe, getSnapshotKey, getSnapshotKey);
    const [highlightStr, borderStr] = key.split('|');
    const highlight = (highlightStr || null) as ElementHighlightState | null;
    const border = (borderStr || null) as ElementBorderState | null;
    return { highlight, border };
};

// Stable selectors access (does not trigger re-renders on ticks)
export const usePlaybackSelectors = () => {
    const selectors = useContext(ShowTimeSelectorsContext);
    if (!selectors) {
        return {
            getHighlight: (_: string) => null as ElementHighlightState | null,
            getBorder: (_: string) => null as ElementBorderState | null,
        };
    }
    return selectors;
};
