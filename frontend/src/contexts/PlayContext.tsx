// frontend/src/contexts/PlayContext.tsx

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type PlaybackState = 'STOPPED' | 'PLAYING' | 'PAUSED' | 'SAFETY' | 'COMPLETE';
export type ElementHighlightState = 'current' | 'upcoming' | 'inactive';
export type ElementBorderState = 'red_border' | 'none';

interface TimingBoundary {
    time: number;
    elementId: string;
    action: ElementHighlightState | ElementBorderState;
}

interface PlayState {
    playbackState: PlaybackState;
    startTime: number | null; // Performance start timestamp
    currentTime: number | null; // Current performance time offset in ms
    playbackRate: number; // Playback speed multiplier (1.0 = normal)
    pauseStartTime: number | null; // When current pause/safety started
    cumulativeDelayMs: number; // Total accumulated delay from all pauses
    lastPauseDurationMs?: number; // Duration of most recent pause (for offset adjustment)
    elementStates: Map<string, ElementHighlightState>; // Element highlighting states
    elementBorderStates: Map<string, ElementBorderState>; // Element border states
    timingBoundaries: TimingBoundary[]; // Pre-calculated timing boundaries
}

interface PlayContextValue {
    // State
    playbackState: PlaybackState;
    isPlaybackPlaying: boolean; // Convenience getter for playbackState === 'PLAYING'
    isPlaybackPaused: boolean; // Convenience getter for playbackState === 'PAUSED'
    isPlaybackStopped: boolean; // Convenience getter for playbackState === 'STOPPED'
    isPlaybackSafety: boolean; // Convenience getter for playbackState === 'SAFETY'
    isPlaybackComplete: boolean; // Convenience getter for playbackState === 'COMPLETE'
    startTime: number | null;
    currentTime: number | null;
    playbackRate: number;
    cumulativeDelayMs: number;
    pauseStartTime: number | null;
    lastPauseDurationMs?: number;
    elementStates: Map<string, ElementHighlightState>;
    elementBorderStates: Map<string, ElementBorderState>;
    timingBoundaries: TimingBoundary[];
    
    // Actions
    startPlayback: () => void;
    pausePlayback: () => void;
    stopPlayback: () => void;
    safetyStop: () => void;
    completePlayback: () => void;
    setCurrentTime: (timeMs: number) => void;
    setPlaybackRate: (rate: number) => void;
    setElementBoundaries: (elements: any[], lookaheadMs: number) => void;
    processBoundariesForTime: (currentTimeMs: number) => void;
    clearAllElementStates: () => void;
    
    
    // Computed values
    getElapsedTime: () => number; // Time elapsed since start in ms
    isElementActive: (elementOffsetMs: number, elementDurationMs?: number | null) => boolean;
    getElementHighlightState: (elementId: string) => ElementHighlightState | undefined;
    getElementBorderState: (elementId: string) => ElementBorderState | undefined;
}

const PlayContext = createContext<PlayContextValue | null>(null);

interface PlayProviderProps {
    children: ReactNode;
}

export const PlayProvider: React.FC<PlayProviderProps> = ({ children }) => {
    const [playState, setPlayState] = useState<PlayState>({
        playbackState: 'STOPPED',
        startTime: null,
        currentTime: null,
        playbackRate: 1.0,
        pauseStartTime: null,
        cumulativeDelayMs: 0,
        lastPauseDurationMs: undefined,
        elementStates: new Map(),
        elementBorderStates: new Map(),
        timingBoundaries: []
    });
    

    const startPlayback = useCallback(() => {
        const now = Date.now();
        setPlayState(prev => {
            // If resuming from a paused state (or if a pause session is active), always accumulate pause time
            if (prev.pauseStartTime) {
                const thisPauseDurationMs = now - prev.pauseStartTime;
                const newCumulativeDelay = prev.cumulativeDelayMs + thisPauseDurationMs;
                console.log('🔄 PlayContext PLAY accumulation:', {thisPauseDurationMs, prevCumulative: prev.cumulativeDelayMs, newCumulative: newCumulativeDelay});
                return {
                    ...prev,
                    playbackState: 'PLAYING',
                    pauseStartTime: null,
                    cumulativeDelayMs: newCumulativeDelay,
                    lastPauseDurationMs: thisPauseDurationMs // Store for external access
                };
            }

            // Starting fresh
            return {
                ...prev,
                playbackState: 'PLAYING',
                startTime: now,
                currentTime: 0,
                pauseStartTime: null,
                cumulativeDelayMs: 0,
                lastPauseDurationMs: undefined
            };
        });
    }, []);

    const pausePlayback = useCallback(() => {
        const now = Date.now();
        setPlayState(prev => ({
            ...prev,
            playbackState: 'PAUSED',
            pauseStartTime: now
        }));
    }, []);

    const stopPlayback = useCallback(() => {
        setPlayState({
            playbackState: 'STOPPED',
            startTime: null,
            currentTime: null,
            playbackRate: 1.0,
            pauseStartTime: null,
            cumulativeDelayMs: 0,
            lastPauseDurationMs: undefined,
            elementStates: new Map(),
            elementBorderStates: new Map(),
            timingBoundaries: []
        });
    }, []);

    const safetyStop = useCallback(() => {
        const now = Date.now();
        setPlayState(prev => ({
            ...prev,
            playbackState: 'SAFETY',
            pauseStartTime: now
        }));
    }, []);

    const completePlayback = useCallback(() => {
        setPlayState(prev => {
            const clearedStates = new Map<string, ElementHighlightState>();
            // Set all elements to inactive (un-shade all)
            prev.elementStates.forEach((_, elementId) => {
                clearedStates.set(elementId, 'inactive');
            });
            
            return {
                ...prev,
                playbackState: 'COMPLETE',
                elementStates: clearedStates
                // Keep elementBorderStates, startTime, currentTime, cumulativeDelayMs unchanged
            };
        });
    }, []);

    const setElementBoundaries = useCallback((elements: any[], lookaheadMs: number) => {
        const boundaries: TimingBoundary[] = [];
        const initialStates = new Map<string, ElementHighlightState>();
        const initialBorderStates = new Map<string, ElementBorderState>();
        
        const lookbehindMs = 5000; // Keep current highlight for 5s after element start
        const redBorderMs = 5000; // Red border active for 5s after start
        
        // Find the latest element end time for script completion detection
        let scriptEndTime = 0;
        elements.forEach(element => {
            const start = element.offset_ms || 0;
            const endTime = start + lookbehindMs; // 5s after start
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
            
            // Boundary: Element becomes inactive (5s after start, no duration dependency)
            boundaries.push({
                time: start + lookbehindMs,
                elementId: element.element_id,
                action: 'inactive'
            });
        });
        
        // Add script completion boundary
        if (scriptEndTime > 0) {
            boundaries.push({
                time: scriptEndTime,
                elementId: 'SCRIPT_COMPLETE',
                action: 'inactive' // Dummy action for script completion detection
            });
        }
        
        // Sort boundaries by time
        boundaries.sort((a, b) => a.time - b.time);
        
        setPlayState(prev => ({
            ...prev,
            timingBoundaries: boundaries,
            elementStates: initialStates, // Empty map - no initial states
            elementBorderStates: initialBorderStates // Empty map - no initial border states
        }));
    }, []);

    const processBoundariesForTime = useCallback((currentTimeMs: number) => {
        setPlayState(prev => {
            // Skip processing if stopped - but allow processing during PAUSED, SAFETY, and COMPLETE
            if (prev.playbackState === 'STOPPED') {
                return prev;
            }
            
            const newStates = new Map(prev.elementStates);
            const newBorderStates = new Map(prev.elementBorderStates);
            let hasChanges = false;
            
            // Get unique element IDs from boundaries
            const elementIds = new Set<string>();
            prev.timingBoundaries.forEach(boundary => {
                elementIds.add(boundary.elementId);
            });
            
            // Check for script completion first
            const scriptCompleteBoundary = prev.timingBoundaries.find(
                b => b.elementId === 'SCRIPT_COMPLETE' && b.time <= currentTimeMs
            );
            
            if (scriptCompleteBoundary) {
                // Trigger script completion - preserve border states and timing
                return {
                    ...prev,
                    playbackState: 'COMPLETE',
                    elementStates: new Map(Array.from(prev.elementStates.entries()).map(([id, _]) => [id, 'inactive' as ElementHighlightState])),
                    elementBorderStates: new Map(prev.elementBorderStates) // Explicitly preserve border states
                };
            }
            
            // Process each element's state
            elementIds.forEach(elementId => {
                // Skip the script completion marker
                if (elementId === 'SCRIPT_COMPLETE') return;
                // Find the most recent highlight boundary for this element at current time
                let currentState: ElementHighlightState = 'inactive'; // Default state
                let currentBorderState: ElementBorderState = 'none'; // Default border state
                
                prev.timingBoundaries
                    .filter(b => b.elementId === elementId && b.time <= currentTimeMs)
                    .forEach(boundary => {
                        if (boundary.action === 'upcoming' || boundary.action === 'current' || boundary.action === 'inactive') {
                            currentState = boundary.action as ElementHighlightState;
                        } else if (boundary.action === 'red_border' || boundary.action === 'none') {
                            currentBorderState = boundary.action as ElementBorderState;
                        }
                    });
                
                // Check for highlight state changes
                const previousState = prev.elementStates.get(elementId);
                if (previousState !== currentState) {
                    newStates.set(elementId, currentState);
                    hasChanges = true;
                } else {
                    // Keep existing state unchanged
                    if (previousState !== undefined) {
                        newStates.set(elementId, previousState);
                    }
                }
                
                // Check for border state changes
                const previousBorderState = prev.elementBorderStates.get(elementId);
                if (previousBorderState !== currentBorderState) {
                    newBorderStates.set(elementId, currentBorderState);
                    hasChanges = true;
                } else {
                    // Keep existing border state unchanged
                    if (previousBorderState !== undefined) {
                        newBorderStates.set(elementId, previousBorderState);
                    }
                }
            });
            
            // Only update if there were actual changes
            if (hasChanges) {
                return {
                    ...prev,
                    elementStates: newStates,
                    elementBorderStates: newBorderStates
                };
            }
            return prev; // No changes - prevent re-render
        });
    }, []);

    const clearAllElementStates = useCallback(() => {
        setPlayState(prev => {
            const clearedStates = new Map<string, ElementHighlightState>();
            const clearedBorderStates = new Map<string, ElementBorderState>();
            // Set all elements to inactive
            prev.elementStates.forEach((_, elementId) => {
                clearedStates.set(elementId, 'inactive');
            });
            prev.elementBorderStates.forEach((_, elementId) => {
                clearedBorderStates.set(elementId, 'none');
            });
            
            return {
                ...prev,
                elementStates: clearedStates,
                elementBorderStates: clearedBorderStates
            };
        });
    }, []);

    const getElementHighlightState = useCallback((elementId: string): ElementHighlightState | undefined => {
        // Don't apply overlays when playback is complete
        if (playState.playbackState === 'COMPLETE') return undefined;
        
        const state = playState.elementStates.get(elementId);
        return state; // Return undefined if no state is set
    }, [playState.elementStates, playState.playbackState]);

    const getElementBorderState = useCallback((elementId: string): ElementBorderState | undefined => {
        const state = playState.elementBorderStates.get(elementId);
        return state; // Return undefined if no state is set
    }, [playState.elementBorderStates]);

    const setCurrentTime = useCallback((timeMs: number) => {
        setPlayState(prev => ({
            ...prev,
            currentTime: timeMs
        }));
    }, []);

    const setPlaybackRate = useCallback((rate: number) => {
        setPlayState(prev => ({
            ...prev,
            playbackRate: rate
        }));
    }, []);

    const getElapsedTime = useCallback((): number => {
        if (!playState.startTime) return 0;
        return Date.now() - playState.startTime;
    }, [playState.startTime]);

    const isElementActive = useCallback((elementOffsetMs: number, elementDurationMs?: number | null): boolean => {
        if (playState.playbackState !== 'PLAYING' || playState.currentTime === null) return false;
        
        const currentMs = playState.currentTime;
        const elementStart = elementOffsetMs;
        const elementEnd = elementDurationMs ? elementStart + elementDurationMs : elementStart;
        
        return currentMs >= elementStart && (elementDurationMs ? currentMs <= elementEnd : true);
    }, [playState.playbackState, playState.currentTime]);

    const contextValue: PlayContextValue = {
        // State
        playbackState: playState.playbackState,
        isPlaybackPlaying: playState.playbackState === 'PLAYING',
        isPlaybackPaused: playState.playbackState === 'PAUSED',
        isPlaybackStopped: playState.playbackState === 'STOPPED',
        isPlaybackSafety: playState.playbackState === 'SAFETY',
        isPlaybackComplete: playState.playbackState === 'COMPLETE',
        startTime: playState.startTime,
        currentTime: playState.currentTime,
        playbackRate: playState.playbackRate,
        cumulativeDelayMs: playState.cumulativeDelayMs,
        pauseStartTime: playState.pauseStartTime,
        lastPauseDurationMs: playState.lastPauseDurationMs,
        elementStates: playState.elementStates,
        elementBorderStates: playState.elementBorderStates,
        timingBoundaries: playState.timingBoundaries,
        
        // Actions
        startPlayback,
        pausePlayback,
        stopPlayback,
        safetyStop,
        completePlayback,
        setCurrentTime,
        setPlaybackRate,
        setElementBoundaries,
        processBoundariesForTime,
        clearAllElementStates,
        
        // Computed values
        getElapsedTime,
        isElementActive,
        getElementHighlightState,
        getElementBorderState
    };

    return (
        <PlayContext.Provider value={contextValue}>
            {children}
        </PlayContext.Provider>
    );
};

export const usePlayContext = (): PlayContextValue => {
    const context = useContext(PlayContext);
    if (!context) {
        throw new Error('usePlayContext must be used within a PlayProvider');
    }
    return context;
};

// Convenience hooks for specific use cases
export const usePlayState = () => {
    const { playbackState, isPlaybackPlaying, isPlaybackPaused, isPlaybackStopped, currentTime, playbackRate } = usePlayContext();
    return { playbackState, isPlaybackPlaying, isPlaybackPaused, isPlaybackStopped, currentTime, playbackRate };
};

export const usePlayActions = () => {
    const { startPlayback, pausePlayback, stopPlayback, setCurrentTime, setPlaybackRate } = usePlayContext();
    return { startPlayback, pausePlayback, stopPlayback, setCurrentTime, setPlaybackRate };
};

export const useElementPlayState = (elementOffsetMs: number, elementDurationMs?: number | null) => {
    const { isElementActive } = usePlayContext();
    return isElementActive(elementOffsetMs, elementDurationMs);
};
