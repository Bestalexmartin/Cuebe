// frontend/src/contexts/PlayContext.tsx

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type PlaybackState = 'STOPPED' | 'PLAYING' | 'PAUSED' | 'SAFETY';

interface PlayState {
    playbackState: PlaybackState;
    startTime: number | null; // Performance start timestamp
    currentTime: number | null; // Current performance time offset in ms
    playbackRate: number; // Playback speed multiplier (1.0 = normal)
    pauseStartTime: number | null; // When current pause/safety started
    cumulativeDelayMs: number; // Total accumulated delay from all pauses
}

interface PlayContextValue {
    // State
    playbackState: PlaybackState;
    isPlaybackPlaying: boolean; // Convenience getter for playbackState === 'PLAYING'
    isPlaybackPaused: boolean; // Convenience getter for playbackState === 'PAUSED'
    isPlaybackStopped: boolean; // Convenience getter for playbackState === 'STOPPED'
    isPlaybackSafety: boolean; // Convenience getter for playbackState === 'SAFETY'
    startTime: number | null;
    currentTime: number | null;
    playbackRate: number;
    cumulativeDelayMs: number;
    pauseStartTime: number | null;
    
    // Actions
    startPlayback: () => void;
    pausePlayback: () => void;
    stopPlayback: () => void;
    safetyStop: () => void;
    setCurrentTime: (timeMs: number) => void;
    setPlaybackRate: (rate: number) => void;
    
    // Offset adjustment callback
    onOffsetAdjustment?: (delayMs: number, currentTimeMs: number) => void;
    setOnOffsetAdjustment: (callback: ((delayMs: number, currentTimeMs: number) => void) | undefined) => void;
    
    // Computed values
    getElapsedTime: () => number; // Time elapsed since start in ms
    isElementActive: (elementOffsetMs: number, elementDurationMs?: number | null) => boolean;
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
        cumulativeDelayMs: 0
    });
    
    const [onOffsetAdjustment, setOnOffsetAdjustment] = useState<((delayMs: number, currentTimeMs: number) => void) | undefined>();

    const startPlayback = useCallback(() => {
        const now = Date.now();
        setPlayState(prev => {
            // If resuming from pause/safety, calculate offset adjustments for THIS pause session
            if ((prev.playbackState === 'PAUSED' || prev.playbackState === 'SAFETY') && prev.pauseStartTime && onOffsetAdjustment) {
                const thisPauseDurationMs = now - prev.pauseStartTime;
                const newCumulativeDelay = prev.cumulativeDelayMs + thisPauseDurationMs;
                const currentPlaybackTime = prev.currentTime || 0;
                
                console.log(`[PLAY CONTEXT] Resuming - Previous cumulative: ${prev.cumulativeDelayMs}ms, This pause: ${thisPauseDurationMs}ms, New cumulative: ${newCumulativeDelay}ms`);
                
                // Trigger offset adjustment for THIS pause duration only
                onOffsetAdjustment(thisPauseDurationMs, currentPlaybackTime);
                
                return {
                    ...prev,
                    playbackState: 'PLAYING',
                    pauseStartTime: null,
                    cumulativeDelayMs: newCumulativeDelay
                };
            }
            
            // Starting fresh
            return {
                ...prev,
                playbackState: 'PLAYING',
                startTime: now,
                currentTime: 0,
                pauseStartTime: null,
                cumulativeDelayMs: 0
            };
        });
    }, [onOffsetAdjustment]);

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
            cumulativeDelayMs: 0
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
        startTime: playState.startTime,
        currentTime: playState.currentTime,
        playbackRate: playState.playbackRate,
        cumulativeDelayMs: playState.cumulativeDelayMs,
        pauseStartTime: playState.pauseStartTime,
        
        // Actions
        startPlayback,
        pausePlayback,
        stopPlayback,
        safetyStop,
        setCurrentTime,
        setPlaybackRate,
        
        // Offset adjustment callback
        onOffsetAdjustment,
        setOnOffsetAdjustment,
        
        // Computed values
        getElapsedTime,
        isElementActive
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