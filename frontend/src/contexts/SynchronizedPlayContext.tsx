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
    handlePlaybackCommand: (command: string, serverTimestampMs: number, showTimeMs?: number, startTime?: string) => void;
    setElementBoundaries: (elements: any[], lookaheadMs: number) => void;
    updateElementBoundaries: (elements: any[], lookaheadMs: number) => void;
    processBoundariesForTime: (currentTimeMs: number) => void;
    clearAllElementStates: () => void;
    resetAllPlaybackState: () => void;
    shouldHideElement: (elementId: string) => boolean;
    setScript: (script: any) => void;
    registerRetimingCallback: (callback: (operation: any) => void) => void;
    
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
    
    const timerRef = useRef<number | null>(null);
    const retimingCallbackRef = useRef<((operation: any) => void) | null>(null);

    const handlePlaybackCommand = useCallback((command: string, serverTimestampMs: number, showTimeMs?: number, startTime?: string) => {
        const localNow = Date.now();
        
        
        setSyncPlayState(prev => {
            
            switch (command) {
                case 'PLAY':
                    // Copy exact logic from auth side PlayContext
                    if (prev.pauseStartTime) {
                        const thisPauseDurationMs = localNow - prev.pauseStartTime;
                        const newCumulativeDelay = prev.cumulativeDelayMs + thisPauseDurationMs;
                        const newState = {
                            ...prev,
                            playbackState: 'PLAYING',
                            pauseStartTime: null,
                            cumulativeDelayMs: newCumulativeDelay,
                            lastPauseDurationMs: thisPauseDurationMs,
                            currentTime: showTimeMs
                        };
                        
                        // Trigger retiming callback if registered
                        if (retimingCallbackRef.current && thisPauseDurationMs > 0) {
                            setTimeout(() => {
                                retimingCallbackRef.current?.({
                                    type: 'BULK_OFFSET_ADJUSTMENT',
                                    delay_ms: thisPauseDurationMs,
                                    current_time_ms: showTimeMs
                                });
                            }, 0);
                        }
                        
                        return newState;
                    }
                    // Starting fresh
                    return {
                        ...prev,
                        playbackState: 'PLAYING',
                        startTime: localNow,
                        currentTime: showTimeMs,
                        pauseStartTime: null,
                        cumulativeDelayMs: 0,
                        lastPauseDurationMs: undefined
                    };
                    
                case 'PAUSE':
                    return {
                        ...prev,
                        playbackState: 'PAUSED',
                        pauseStartTime: localNow
                    };
                    
                case 'SAFETY':
                    return {
                        ...prev,
                        playbackState: 'SAFETY'
                    };
                    
                case 'COMPLETE':
                    const clearedStates = new Map<string, SyncElementHighlightState>();
                    prev.elementStates.forEach((_, elementId) => {
                        clearedStates.set(elementId, 'inactive');
                    });
                    return {
                        ...prev,
                        playbackState: 'COMPLETE',
                        elementStates: clearedStates
                    };
                    
                case 'STOP':
                    return {
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
        
        console.log('🎯 SETTING ELEMENT BOUNDARIES:', {
            elementsCount: elements.length,
            lookaheadMs,
            lookbehindMs,
            redBorderMs,
            firstThreeOffsets: elements.slice(0, 3).map(e => ({ id: e.element_id.substring(0, 8), offset_ms: e.offset_ms })),
            stackTrace: new Error().stack?.split('\n').slice(1, 3).join('\n')
        });
        
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
        
        setSyncPlayState(prev => ({
            ...prev,
            timingBoundaries: boundaries,
            // Preserve existing element states instead of resetting to initial states
            elementStates: prev.elementStates.size > 0 ? prev.elementStates : initialStates,
            elementBorderStates: prev.elementBorderStates.size > 0 ? prev.elementBorderStates : initialBorderStates
        }));
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
            if (endTime > scriptEndTime) {
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
            if (prev.playbackState === 'STOPPED') {
                return prev;
            }
            
            const newStates = new Map(prev.elementStates);
            const newBorderStates = new Map(prev.elementBorderStates);
            const newPassedElements = new Set(prev.passedElements);
            let hasChanges = false;
            
            const elementIds = new Set<string>();
            prev.timingBoundaries.forEach(boundary => {
                elementIds.add(boundary.elementId);
            });
            
            const scriptCompleteBoundary = prev.timingBoundaries.find(
                b => b.elementId === 'SCRIPT_COMPLETE' && b.time <= currentTimeMs
            );
            
            if (scriptCompleteBoundary) {
                return {
                    ...prev,
                    playbackState: 'COMPLETE',
                    elementStates: new Map(Array.from(prev.elementStates.entries()).map(([id, _]) => [id, 'inactive' as SyncElementHighlightState])),
                    elementBorderStates: new Map(prev.elementBorderStates)
                };
            }
            
            elementIds.forEach(elementId => {
                if (elementId === 'SCRIPT_COMPLETE') return;
                
                let currentState: SyncElementHighlightState = 'inactive';
                let currentBorderState: SyncElementBorderState = 'none';
                
                const triggeredBoundaries = prev.timingBoundaries
                    .filter(b => b.elementId === elementId && b.time <= currentTimeMs)
                    .sort((a, b) => a.time - b.time); // Process in chronological order
                
                triggeredBoundaries.forEach(boundary => {
                    if (boundary.action === 'upcoming' || boundary.action === 'current' || boundary.action === 'inactive') {
                        currentState = boundary.action as SyncElementHighlightState;
                    } else if (boundary.action === 'red_border' || boundary.action === 'none') {
                        currentBorderState = boundary.action as SyncElementBorderState;
                    }
                });
                
                // Mark elements as passed when they become inactive (for Tetris scrolling)
                if (currentState === 'inactive' && !prev.passedElements.has(elementId)) {
                    // Find element start time from timing boundaries
                    const elementStartBoundary = prev.timingBoundaries.find(
                        b => b.elementId === elementId && b.action === 'current'
                    );
                    if (elementStartBoundary && currentTimeMs > elementStartBoundary.time + 5000) {
                        newPassedElements.add(elementId);
                        hasChanges = true;
                    }
                }
                
                const previousState = prev.elementStates.get(elementId);
                
                // Log state flickering issues for upcoming elements
                if (previousState === 'upcoming' && currentState !== 'upcoming' && currentState !== 'current') {
                    console.log('🔄 UPCOMING ELEMENT FLICKER:', {
                        elementId: elementId.substring(0, 8),
                        currentTimeMs,
                        from: previousState,
                        to: currentState,
                        triggeredBoundaries: triggeredBoundaries.map(b => ({ time: b.time, action: b.action }))
                    });
                }
                if (previousState !== currentState) {
                    console.log('🎯 ELEMENT STATE CHANGE:', {
                        elementId: elementId.substring(0, 8),
                        from: previousState,
                        to: currentState,
                        currentTimeMs,
                        relevantBoundaries: prev.timingBoundaries
                            .filter(b => b.elementId === elementId)
                            .map(b => ({ time: b.time, action: b.action, triggered: b.time <= currentTimeMs }))
                    });
                    newStates.set(elementId, currentState);
                    hasChanges = true;
                } else if (previousState !== undefined) {
                    newStates.set(elementId, previousState);
                }
                
                const previousBorderState = prev.elementBorderStates.get(elementId);
                if (previousBorderState !== currentBorderState) {
                    newBorderStates.set(elementId, currentBorderState);
                    hasChanges = true;
                } else if (previousBorderState !== undefined) {
                    newBorderStates.set(elementId, previousBorderState);
                }
            });
            
            if (hasChanges) {
                return {
                    ...prev,
                    elementStates: newStates,
                    elementBorderStates: newBorderStates,
                    passedElements: newPassedElements
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

    // Subscriber timing engine - copied from working host PlaybackTimingProvider pattern
    const [script, setScript] = useState<any>(null);
    
    const computeShowTime = useCallback(() => {
        if (!script?.start_time) return null;
        return Date.now() - new Date(script.start_time).getTime();
    }, [script?.start_time]);

    const clearTimer = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const scheduleNext = useCallback(() => {
        clearTimer();
        const now = computeShowTime();
        if (now === null) return;

        setSyncPlayState(prev => ({
            ...prev,
            currentTime: now
        }));
        
        processBoundariesForTime(now);

        const arr = syncPlayState.timingBoundaries || [];
        let nextIndex = 0;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].time <= now) nextIndex = i + 1;
            else break;
        }
        
        if (nextIndex >= arr.length) return;
        
        const nextTime = arr[nextIndex].time;
        const delay = Math.max(0, nextTime - now);
        timerRef.current = setTimeout(() => {
            const current = computeShowTime();
            if (current === null) return;
            setSyncPlayState(prev => ({
                ...prev,
                currentTime: current
            }));
            processBoundariesForTime(current);
            if (syncPlayState.playbackState === 'PLAYING' && script?.start_time) {
                scheduleNext();
            }
        }, delay);
    }, [clearTimer, computeShowTime, syncPlayState.playbackState, syncPlayState.timingBoundaries, script?.start_time]);

    useEffect(() => {
        if (!script?.start_time) {
            clearTimer();
            return;
        }

        if (syncPlayState.playbackState === 'PLAYING') {
            scheduleNext();
            return () => clearTimer();
        }

        clearTimer();
    }, [syncPlayState.playbackState, script?.start_time, scheduleNext, clearTimer]);

    const getElementHighlightState = useCallback((elementId: string): SyncElementHighlightState | undefined => {
        return syncPlayState.elementStates.get(elementId);
    }, [syncPlayState.elementStates]);

    const getElementBorderState = useCallback((elementId: string): SyncElementBorderState | undefined => {
        return syncPlayState.elementBorderStates.get(elementId);
    }, [syncPlayState.elementBorderStates]);

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