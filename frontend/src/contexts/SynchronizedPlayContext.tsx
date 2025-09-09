import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';

export type SyncPlaybackState = 'STOPPED' | 'PLAYING' | 'PAUSED' | 'SAFETY' | 'COMPLETE';
export type SyncElementHighlightState = 'current' | 'upcoming' | 'inactive';
export type SyncElementBorderState = 'red_border' | 'none';

interface SyncTimingBoundary {
    time: number;
    elementId: string;
    action: SyncElementHighlightState | SyncElementBorderState;
}

interface SyncPlayState {
    playbackState: SyncPlaybackState;
    startTime: number | null; // Performance start timestamp
    currentTime: number | null; // Current performance time offset in ms
    serverTimestamp: number | null; // Last received server timestamp for latency correction
    localTimestamp: number | null; // Local timestamp when server timestamp was received
    pauseStartTime: number | null; // When current pause/safety started
    cumulativeDelayMs: number; // Total accumulated delay from all pauses
    lastPauseDurationMs?: number; // Duration of most recent pause (for offset adjustment)
    elementStates: Map<string, SyncElementHighlightState>; // Element highlighting states
    elementBorderStates: Map<string, SyncElementBorderState>; // Element border states
    timingBoundaries: SyncTimingBoundary[]; // Pre-calculated timing boundaries
    passedElements: Set<string>; // Elements that have passed (for Tetris scrolling)
}

interface SynchronizedPlayContextValue {
    // State
    playbackState: SyncPlaybackState;
    isPlaybackPlaying: boolean;
    isPlaybackPaused: boolean;
    isPlaybackStopped: boolean;
    isPlaybackSafety: boolean;
    isPlaybackComplete: boolean;
    startTime: number | null;
    currentTime: number | null;
    pauseStartTime: number | null;
    cumulativeDelayMs: number;
    lastPauseDurationMs?: number;
    elementStates: Map<string, SyncElementHighlightState>;
    elementBorderStates: Map<string, SyncElementBorderState>;
    timingBoundaries: SyncTimingBoundary[];
    passedElements: Set<string>;
    
    // Actions
    handlePlaybackCommand: (command: string, serverTimestampMs: number, showTimeMs?: number, startTime?: string, cumulativeDelayMs?: number) => void;
    setElementBoundaries: (elements: any[], lookaheadMs: number) => void;
    updateElementBoundaries: (elements: any[], lookaheadMs: number) => void;
    processBoundariesForTime: (currentTimeMs: number) => void;
    clearAllElementStates: () => void;
    resetAllPlaybackState: () => void;
    shouldHideElement: (elementId: string) => boolean;
    setScript: (script: any) => void;
    registerRetimingCallback: (callback: (operation: any) => void) => void;
    setCurrentTime: (timeMs: number) => void;
    
    // Computed values
    getElapsedTime: () => number;
    getElementHighlightState: (elementId: string) => SyncElementHighlightState | undefined;
    getElementBorderState: (elementId: string) => SyncElementBorderState | undefined;
}

const SynchronizedPlayContext = createContext<SynchronizedPlayContextValue | null>(null);

interface SynchronizedPlayProviderProps {
    children: ReactNode;
}

export const SynchronizedPlayProvider: React.FC<SynchronizedPlayProviderProps> = ({ children }) => {
    const [syncPlayState, setSyncPlayState] = useState<SyncPlayState>({
        playbackState: 'STOPPED',
        startTime: null,
        currentTime: null,
        serverTimestamp: null,
        localTimestamp: null,
        pauseStartTime: null,
        cumulativeDelayMs: 0,
        lastPauseDurationMs: undefined,
        elementStates: new Map(),
        elementBorderStates: new Map(),
        timingBoundaries: [],
        passedElements: new Set()
    });
    
    const retimingCallbackRef = useRef<((operation: any) => void) | null>(null);

    const handlePlaybackCommand = useCallback((command: string, _serverTimestampMs: number, showTimeMs?: number, _startTime?: string, cumulativeDelayMs?: number) => {
        const localNow = Date.now();
        
        setSyncPlayState(prev => {
            
            // Guard against duplicate PLAY commands
            if (command === 'PLAY' && prev.playbackState === 'PLAYING') {
                return prev;
            }
            
            switch (command) {
                case 'PLAY':
                    // Copy exact logic from auth side PlayContext
                    if (prev.pauseStartTime) {
                        const thisPauseDurationMs = localNow - prev.pauseStartTime;
                        const newCumulativeDelay = prev.cumulativeDelayMs + thisPauseDurationMs;
                        return {
                            ...prev,
                            playbackState: 'PLAYING' as SyncPlaybackState,
                            pauseStartTime: null,
                            cumulativeDelayMs: newCumulativeDelay,
                            lastPauseDurationMs: thisPauseDurationMs,
                            currentTime: showTimeMs || null
                        };
                    }
                    // Starting fresh - use provided cumulative delay for late joiner sync
                    const result = {
                        ...prev,
                        playbackState: 'PLAYING' as SyncPlaybackState,
                        startTime: localNow,
                        currentTime: showTimeMs || null,
                        pauseStartTime: null,
                        cumulativeDelayMs: cumulativeDelayMs || 0,
                        lastPauseDurationMs: undefined
                    };
                    return result;
                    
                case 'PAUSE':
                    return {
                        ...prev,
                        playbackState: 'PAUSED' as SyncPlaybackState,
                        pauseStartTime: localNow
                    };
                    
                case 'SAFETY':
                    return {
                        ...prev,
                        playbackState: 'SAFETY' as SyncPlaybackState
                    };
                    
                case 'COMPLETE':
                    const clearedStates = new Map<string, SyncElementHighlightState>();
                    prev.elementStates.forEach((_, elementId) => {
                        clearedStates.set(elementId, 'inactive');
                    });
                    return {
                        ...prev,
                        playbackState: 'COMPLETE' as SyncPlaybackState,
                        elementStates: clearedStates,
                        pauseStartTime: localNow // Set pauseStartTime to freeze timers at completion
                    };
                    
                case 'STOP':
                    return {
                        playbackState: 'STOPPED' as SyncPlaybackState,
                        startTime: null,
                        currentTime: null,
                        serverTimestamp: null,
                        localTimestamp: null,
                        pauseStartTime: null,
                        cumulativeDelayMs: 0,
                        lastPauseDurationMs: undefined,
                        elementStates: new Map(),
                        elementBorderStates: new Map(),
                        timingBoundaries: [],
                        passedElements: new Set()
                    };
                    
                default:
                    return prev;
            }
        });
        
    }, []);

    const setElementBoundaries = useCallback((elements: any[], lookaheadMs: number) => {
        const boundaries: SyncTimingBoundary[] = [];
        const initialStates = new Map<string, SyncElementHighlightState>();
        const initialBorderStates = new Map<string, SyncElementBorderState>();
        
        const lookbehindMs = 5000; // Keep current highlight for 5s after element start
        const redBorderMs = 5000; // Red border active for 5s after start
        
        console.log('🔵 setElementBoundaries called with lookaheadMs:', lookaheadMs, 'elements:', elements.length);
        
        let scriptEndTime = 0;
        elements.forEach(element => {
            const start = element.offset_ms || 0;
            const endTime = start + lookbehindMs;
            // Only consider positive end times for script completion
            if (endTime > scriptEndTime && endTime > 0) {
                scriptEndTime = endTime;
            }
        });
        
        elements.forEach(element => {
            const start = element.offset_ms || 0;
            
            if (lookaheadMs > 0) {
                const upcomingTime = start - lookaheadMs;
                boundaries.push({
                    time: upcomingTime,
                    elementId: element.element_id,
                    action: 'upcoming'
                });
                // Debug logging for negative offset elements
                if (start <= 0) {
                    console.log('🟡 Negative boundary created - element:', element.element_id, 'offset:', start, 'upcoming time:', upcomingTime, 'lookahead:', lookaheadMs);
                }
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
                action: 'inactive'
            });
        });
        
        if (scriptEndTime > 0) {
            boundaries.push({
                time: scriptEndTime,
                elementId: 'SCRIPT_COMPLETE',
                action: 'inactive'
            });
        }
        
        boundaries.sort((a, b) => a.time - b.time);
        
        setSyncPlayState(prev => ({
            ...prev,
            timingBoundaries: boundaries,
            // Always reset element states to empty when boundaries change to force reprocessing
            elementStates: new Map(),
            elementBorderStates: new Map()
        }));
        
        // Timing provider will handle immediate boundary processing via useEffect
    }, []);

    const updateElementBoundaries = useCallback((elements: any[], lookaheadMs: number) => {
        // Update timing boundaries without resetting element states to prevent flickering
        const boundaries: SyncTimingBoundary[] = [];
        const lookbehindMs = 5000;
        const redBorderMs = 5000;
        
        let scriptEndTime = 0;
        elements.forEach(element => {
            const start = element.offset_ms || 0;
            const endTime = start + lookbehindMs;
            // Only consider positive end times for script completion
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
                action: 'inactive'
            });
        });
        
        if (scriptEndTime > 0) {
            boundaries.push({
                time: scriptEndTime,
                elementId: 'SCRIPT_COMPLETE',
                action: 'inactive'
            });
        }
        
        boundaries.sort((a, b) => a.time - b.time);
        
        // Only update boundaries, preserve existing element states
        setSyncPlayState(prev => ({
            ...prev,
            timingBoundaries: boundaries
            // Keep existing elementStates and elementBorderStates unchanged
        }));
    }, []);

    const processBoundariesForTime = useCallback((currentTimeMs: number) => {
        setSyncPlayState(prev => {
            console.log('🔍 Guest processBoundariesForTime called with currentTimeMs:', currentTimeMs, 'playbackState:', prev.playbackState);
            if (prev.playbackState === 'STOPPED') {
                console.log('⚠️ Guest processBoundariesForTime called while STOPPED - ignoring');
                return prev;
            }
            
            // Check for script completion - only complete if ALL elements have been processed
            const hasActiveElements = prev.timingBoundaries.some(boundary => 
                boundary.elementId !== 'SCRIPT_COMPLETE' && 
                boundary.action === 'current' && 
                boundary.time > currentTimeMs
            );
            
            const scriptCompleteBoundary = prev.timingBoundaries.find(
                b => b.elementId === 'SCRIPT_COMPLETE' && b.time <= currentTimeMs
            );
            
            if (scriptCompleteBoundary && !hasActiveElements) {
                const now = Date.now();
                const clearedStates = new Map<string, SyncElementHighlightState>();
                prev.elementStates.forEach((_, id) => clearedStates.set(id, 'inactive'));
                return {
                    ...prev,
                    playbackState: 'COMPLETE',
                    elementStates: clearedStates,
                    elementBorderStates: new Map(prev.elementBorderStates),
                    pauseStartTime: now // Set pauseStartTime to freeze timers at completion
                };
            }
            
            // Optimize: only copy Maps if we actually need to make changes
            let newStates: Map<string, SyncElementHighlightState> | null = null;
            let newBorderStates: Map<string, SyncElementBorderState> | null = null;
            let newPassedElements: Set<string> | null = null;
            let hasChanges = false;
            
            // Get unique element IDs more efficiently
            const elementIds = new Set<string>();
            for (const boundary of prev.timingBoundaries) {
                if (boundary.elementId !== 'SCRIPT_COMPLETE') {
                    elementIds.add(boundary.elementId);
                }
            }
            
            // Process elements using the same simple approach as auth side
            for (const elementId of elementIds) {
                let currentState: SyncElementHighlightState = 'inactive';
                let currentBorderState: SyncElementBorderState = 'none';
                
                // Process all boundaries for this element at current time (same as PlayContext)
                prev.timingBoundaries
                    .filter(b => b.elementId === elementId && b.time <= currentTimeMs)
                    .forEach(boundary => {
                        if (boundary.action === 'upcoming' || boundary.action === 'current' || boundary.action === 'inactive') {
                            currentState = boundary.action as SyncElementHighlightState;
                        } else if (boundary.action === 'red_border' || boundary.action === 'none') {
                            currentBorderState = boundary.action as SyncElementBorderState;
                        }
                    });
                
                // Check state changes (lazy Map creation)
                const previousState = prev.elementStates.get(elementId);
                if (previousState !== currentState) {
                    if (!newStates) newStates = new Map(prev.elementStates);
                    newStates.set(elementId, currentState);
                    hasChanges = true;
                    // Debug logging for state changes on negative offset elements
                    console.log('🎯 State change for element:', elementId, 'from:', previousState, 'to:', currentState, 'at time:', currentTimeMs);
                }
                
                const previousBorderState = prev.elementBorderStates.get(elementId);
                if (previousBorderState !== currentBorderState) {
                    if (!newBorderStates) newBorderStates = new Map(prev.elementBorderStates);
                    newBorderStates.set(elementId, currentBorderState);
                    hasChanges = true;
                }
                
                // Mark elements as passed when they become inactive (for Tetris scrolling)
                if (currentState === 'inactive' && !prev.passedElements.has(elementId)) {
                    // Find element start time from timing boundaries
                    const elementStartBoundary = prev.timingBoundaries.find(
                        b => b.elementId === elementId && b.action === 'current'
                    );
                    if (elementStartBoundary && currentTimeMs > elementStartBoundary.time + 5000) {
                        if (!newPassedElements) newPassedElements = new Set(prev.passedElements);
                        newPassedElements.add(elementId);
                        hasChanges = true;
                    }
                }
            }
            
            if (hasChanges) {
                return {
                    ...prev,
                    elementStates: newStates || prev.elementStates,
                    elementBorderStates: newBorderStates || prev.elementBorderStates,
                    passedElements: newPassedElements || prev.passedElements
                };
            }
            return prev;
        });
    }, []);

    const clearAllElementStates = useCallback(() => {
        setSyncPlayState(prev => {
            const clearedStates = new Map<string, SyncElementHighlightState>();
            const clearedBorderStates = new Map<string, SyncElementBorderState>();
            prev.elementStates.forEach((_, elementId) => {
                clearedStates.set(elementId, 'inactive');
            });
            prev.elementBorderStates.forEach((_, elementId) => {
                clearedBorderStates.set(elementId, 'none');
            });
            
            return {
                ...prev,
                elementStates: clearedStates,
                elementBorderStates: clearedBorderStates,
                passedElements: new Set()
            };
        });
    }, []);

    const resetAllPlaybackState = useCallback(() => {
        setSyncPlayState({
            playbackState: 'STOPPED',
            startTime: null,
            currentTime: null,
            serverTimestamp: null,
            localTimestamp: null,
            pauseStartTime: null,
            cumulativeDelayMs: 0,
            lastPauseDurationMs: undefined,
            timingBoundaries: [],
            elementStates: new Map(),
            elementBorderStates: new Map(),
            passedElements: new Set()
        });
    }, []);

    const shouldHideElement = useCallback((elementId: string) => {
        // Never hide elements when script is complete or stopped
        if (syncPlayState.playbackState === 'COMPLETE' || syncPlayState.playbackState === 'STOPPED') {
            return false;
        }
        return syncPlayState.passedElements.has(elementId);
    }, [syncPlayState.passedElements, syncPlayState.playbackState]);

    const setScriptCallback = useCallback((newScript: any) => {
        setScript(newScript);
    }, []);

    const registerRetimingCallback = useCallback((callback: (operation: any) => void) => {
        retimingCallbackRef.current = callback;
    }, []);

    // Subscriber timing engine - copied from working host PlaybackTimingProvider pattern
    const [script, setScript] = useState<any>(null);
    

    // Trigger retiming callback when lastPauseDurationMs changes (performance optimization)
    useEffect(() => {
        if (retimingCallbackRef.current && syncPlayState.lastPauseDurationMs && syncPlayState.lastPauseDurationMs > 0) {
            // Use requestAnimationFrame for better performance than setTimeout
            requestAnimationFrame(() => {
                retimingCallbackRef.current?.({
                    type: 'BULK_OFFSET_ADJUSTMENT',
                    delay_ms: syncPlayState.lastPauseDurationMs!,
                    current_time_ms: syncPlayState.currentTime
                });
            });
        }
    }, [syncPlayState.lastPauseDurationMs, syncPlayState.currentTime]);


    const getElementHighlightState = useCallback((elementId: string): SyncElementHighlightState | undefined => {
        return syncPlayState.elementStates.get(elementId);
    }, [syncPlayState.elementStates]);

    const getElementBorderState = useCallback((elementId: string): SyncElementBorderState | undefined => {
        return syncPlayState.elementBorderStates.get(elementId);
    }, [syncPlayState.elementBorderStates]);

    const setCurrentTime = useCallback((timeMs: number) => {
        setSyncPlayState(prev => ({
            ...prev,
            currentTime: timeMs
        }));
    }, []);

    const getElapsedTime = useCallback((): number => {
        if (!syncPlayState.startTime) return 0;
        return Date.now() - syncPlayState.startTime;
    }, [syncPlayState.startTime]);

    const contextValue: SynchronizedPlayContextValue = {
        // State
        playbackState: syncPlayState.playbackState,
        isPlaybackPlaying: syncPlayState.playbackState === 'PLAYING',
        isPlaybackPaused: syncPlayState.playbackState === 'PAUSED',
        isPlaybackStopped: syncPlayState.playbackState === 'STOPPED',
        isPlaybackSafety: syncPlayState.playbackState === 'SAFETY',
        isPlaybackComplete: syncPlayState.playbackState === 'COMPLETE',
        startTime: syncPlayState.startTime,
        currentTime: syncPlayState.currentTime,
        pauseStartTime: syncPlayState.pauseStartTime,
        cumulativeDelayMs: syncPlayState.cumulativeDelayMs,
        lastPauseDurationMs: syncPlayState.lastPauseDurationMs,
        elementStates: syncPlayState.elementStates,
        elementBorderStates: syncPlayState.elementBorderStates,
        timingBoundaries: syncPlayState.timingBoundaries,
        passedElements: syncPlayState.passedElements,
        
        // Actions
        handlePlaybackCommand,
        setElementBoundaries,
        updateElementBoundaries,
        processBoundariesForTime,
        clearAllElementStates,
        resetAllPlaybackState,
        shouldHideElement,
        setScript: setScriptCallback,
        registerRetimingCallback,
        setCurrentTime,
        
        // Computed values
        getElapsedTime,
        getElementHighlightState,
        getElementBorderState
    };

    return (
        <SynchronizedPlayContext.Provider value={contextValue}>
            {children}
        </SynchronizedPlayContext.Provider>
    );
};

export const useSynchronizedPlayContext = (): SynchronizedPlayContextValue => {
    const context = useContext(SynchronizedPlayContext);
    if (!context) {
        throw new Error('useSynchronizedPlayContext must be used within a SynchronizedPlayProvider');
    }
    return context;
};

export const useSyncPlayState = () => {
    const { playbackState, isPlaybackPlaying, isPlaybackPaused, isPlaybackStopped, currentTime } = useSynchronizedPlayContext();
    return { playbackState, isPlaybackPlaying, isPlaybackPaused, isPlaybackStopped, currentTime };
};