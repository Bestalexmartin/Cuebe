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
    elementStates: Map<string, SyncElementHighlightState>;
    elementBorderStates: Map<string, SyncElementBorderState>;
    timingBoundaries: SyncTimingBoundary[];
    passedElements: Set<string>;
    
    // Actions
    handlePlaybackCommand: (command: string, serverTimestampMs: number, showTimeMs?: number, startTime?: string) => void;
    setElementBoundaries: (elements: any[], lookaheadMs: number) => void;
    processBoundariesForTime: (currentTimeMs: number) => void;
    clearAllElementStates: () => void;
    shouldHideElement: (elementId: string) => boolean;
    
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
        elementStates: new Map(),
        elementBorderStates: new Map(),
        timingBoundaries: [],
        passedElements: new Set()
    });
    
    const timerRef = useRef<number | null>(null);

    const handlePlaybackCommand = useCallback((command: string, serverTimestampMs: number, showTimeMs?: number, startTime?: string) => {
        const localNow = Date.now();
        
        setSyncPlayState(prev => {
            switch (command) {
                case 'PLAY':
                    return {
                        ...prev,
                        playbackState: 'PLAYING',
                        startTime: startTime ? new Date(startTime).getTime() : (prev.startTime || localNow),
                        currentTime: showTimeMs ?? 0,
                        serverTimestamp: serverTimestampMs,
                        localTimestamp: localNow
                    };
                    
                case 'PAUSE':
                    return {
                        ...prev,
                        playbackState: 'PAUSED',
                        serverTimestamp: serverTimestampMs,
                        localTimestamp: localNow
                    };
                    
                case 'SAFETY':
                    return {
                        ...prev,
                        playbackState: 'SAFETY',
                        serverTimestamp: serverTimestampMs,
                        localTimestamp: localNow
                    };
                    
                case 'COMPLETE':
                    const clearedStates = new Map<string, SyncElementHighlightState>();
                    prev.elementStates.forEach((_, elementId) => {
                        clearedStates.set(elementId, 'inactive');
                    });
                    return {
                        ...prev,
                        playbackState: 'COMPLETE',
                        elementStates: clearedStates,
                        serverTimestamp: serverTimestampMs,
                        localTimestamp: localNow
                    };
                    
                case 'STOP':
                    return {
                        playbackState: 'STOPPED',
                        startTime: null,
                        currentTime: null,
                        serverTimestamp: null,
                        localTimestamp: null,
                        elementStates: new Map(),
                        elementBorderStates: new Map(),
                        timingBoundaries: prev.timingBoundaries,
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
            elementStates: initialStates,
            elementBorderStates: initialBorderStates
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
                
                prev.timingBoundaries
                    .filter(b => b.elementId === elementId && b.time <= currentTimeMs)
                    .forEach(boundary => {
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
                if (previousState !== currentState) {
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

    const shouldHideElement = useCallback((elementId: string) => {
        return syncPlayState.passedElements.has(elementId);
    }, [syncPlayState.passedElements]);

    // Update current time based on synchronized playback
    useEffect(() => {
        if (syncPlayState.playbackState !== 'PLAYING' || !syncPlayState.startTime || !syncPlayState.serverTimestamp || !syncPlayState.localTimestamp) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        // Start synchronized timing
        timerRef.current = window.setInterval(() => {
            const localNow = Date.now();
            const localElapsed = localNow - syncPlayState.localTimestamp!;
            const correctedServerTime = syncPlayState.serverTimestamp! + localElapsed;
            const showTime = correctedServerTime - syncPlayState.startTime!;
            
            setSyncPlayState(prev => ({
                ...prev,
                currentTime: Math.max(0, showTime)
            }));
        }, 100); // Update every 100ms for smooth playback

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [syncPlayState.playbackState, syncPlayState.startTime, syncPlayState.serverTimestamp, syncPlayState.localTimestamp]);

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
        elementStates: syncPlayState.elementStates,
        elementBorderStates: syncPlayState.elementBorderStates,
        timingBoundaries: syncPlayState.timingBoundaries,
        passedElements: syncPlayState.passedElements,
        
        // Actions
        handlePlaybackCommand,
        setElementBoundaries,
        processBoundariesForTime,
        clearAllElementStates,
        shouldHideElement,
        
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