import React, { useState, useEffect, createContext, useCallback, useRef } from 'react';
import { Box, HStack, Text } from "@chakra-ui/react";
import { useSharedShowTimeEngine } from '../contexts/SharedShowTimeEngineProvider';
import type { Script } from '../../features/shows/types';
import { formatShowTimer } from '../../utils/showTimeUtils';

// Playback timing context - isolated for boundary processing (like auth side)
const SubscriberPlaybackTimingContext = createContext<{ 
    currentPlaybackTime: number | null;
    processBoundariesForTime: (timeMs: number) => void;
}>({ 
    currentPlaybackTime: null,
    processBoundariesForTime: () => {}
});


const SubscriberPlaybackTimingProvider: React.FC<{ 
    children: React.ReactNode;
    script: (Pick<Script, 'start_time'> & { script_id?: string }) | null;
    processBoundariesForTime: (timeMs: number) => void;
}> = React.memo(({ children, script, processBoundariesForTime }) => {
    const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number | null>(null);
    const finalShowTimeRef = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);
    const nextIndexRef = useRef<number>(0);
    const { timingBoundaries, engine, isPlaybackPlaying, isPlaybackComplete, isPlaybackPaused, isPlaybackSafety } = useSharedShowTimeEngine();

    const computeShowTime = useCallback(() => {
        if (!script?.start_time) return null;
        const showTime = engine.getCurrentShowTime();
        return showTime;
    }, [script?.start_time, engine]);

    const clearTimer = useCallback(() => {
        if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const findNextIndex = useCallback((t: number) => {
        const arr = timingBoundaries || [];
        let lo = 0, hi = arr.length;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (arr[mid].time <= t) lo = mid + 1; else hi = mid;
        }
        return lo;
    }, [timingBoundaries]);

    const scheduleNext = useCallback(() => {
        clearTimer();
        const now = computeShowTime();
        if (now === null) return;

        setCurrentPlaybackTime(now);
        processBoundariesForTime(now);

        const arr = timingBoundaries || [];
        nextIndexRef.current = findNextIndex(now);
        if (nextIndexRef.current >= arr.length) {
            return;
        }
        const nextTime = arr[nextIndexRef.current].time;
        const delay = Math.max(0, nextTime - now);
        timerRef.current = window.setTimeout(() => {
            const current = computeShowTime();
            if (current === null) return;
            setCurrentPlaybackTime(current);
            processBoundariesForTime(current);
            nextIndexRef.current = findNextIndex(current);
            if (engine.isPlaying() && script?.start_time) {
                scheduleNext();
            }
        }, delay);
    }, [clearTimer, computeShowTime, findNextIndex, processBoundariesForTime, timingBoundaries, script?.start_time, engine]);

    useEffect(() => {
        if (!script?.start_time) {
            clearTimer();
            return;
        }

        if (isPlaybackComplete) {
            clearTimer();
            if (finalShowTimeRef.current !== null) {
                setCurrentPlaybackTime(finalShowTimeRef.current);
            }
            return;
        }

        if (isPlaybackPaused || isPlaybackSafety) {
            clearTimer();
            const now = computeShowTime();
            if (now !== null) {
                finalShowTimeRef.current = now;
                setCurrentPlaybackTime(now);
                processBoundariesForTime(now);
            }
            return;
        }

        if (isPlaybackPlaying) {
            finalShowTimeRef.current = null;
            scheduleNext();
            return () => clearTimer();
        }

        clearTimer();
    }, [script?.start_time, scheduleNext, clearTimer, computeShowTime, processBoundariesForTime, isPlaybackPlaying, isPlaybackComplete, isPlaybackPaused, isPlaybackSafety]);

    return (
        <SubscriberPlaybackTimingContext.Provider value={{ currentPlaybackTime, processBoundariesForTime }}>
            {children}
        </SubscriberPlaybackTimingContext.Provider>
    );
});

// Exact clock component from auth side
const RealtimeClock: React.FC<{ useMilitaryTime: boolean }> = ({ useMilitaryTime }) => {
    const { currentTimestamp: timestamp } = useSharedShowTimeEngine();
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const hours = useMilitaryTime ? date.getHours() : date.getHours() % 12 || 12;
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };

    return (
        <Box 
            bg="transparent" 
            color="amber" 
            pl="16px" pr="8px" py="2px" 
            borderRadius="none" 
            fontSize="2xl" 
            fontFamily="mono"
            minWidth="100px"
            textAlign="center"
        >
            {formatTime(timestamp)}
        </Box>
    );
};

// Show timer using ShowTimeEngine (pause-aware)
const ShowTimer: React.FC<{ script: any; playbackState: string }> = ({ script }) => {
    const { currentShowTime } = useSharedShowTimeEngine();
    const display = script?.start_time ? formatShowTimer(currentShowTime) : '00:00:00';
    return (
        <Box 
            bg="transparent" 
            color="red.500" 
            px="8px" py="2px" 
            borderRadius="none" 
            fontSize="2xl" 
            fontFamily="mono"
            minWidth="110px"
            textAlign="center"
        >
            {display}
        </Box>
    );
};

// Exact playback status from auth side
const PlaybackStatus: React.FC<{ playbackState: string }> = ({ playbackState }) => {
    const { engine } = useSharedShowTimeEngine();
    if (playbackState === 'STOPPED') return null;

    const getStatusColor = () => {
        if (playbackState === 'SAFETY') return 'orange.500';
        if (playbackState === 'COMPLETE') return 'green.500';
        return 'red.500';
    };

    const isComplete = playbackState === 'COMPLETE';
    const hasDelayTimer = playbackState === 'PAUSED' || playbackState === 'SAFETY' || (playbackState === 'COMPLETE' && engine.totalPauseTime > 0);
    return (
        <Box 
            bg="transparent" 
            color={getStatusColor()} 
            pl="8px" 
            pr={hasDelayTimer ? "8px" : "16px"}
            py="2px" 
            borderRadius="none" 
            fontSize="2xl" 
            fontFamily="mono"
            fontWeight="bold"
            minWidth="100px"
            textAlign="center"
            animation={playbackState === 'PAUSED' ? "flash 1s infinite" : undefined}
            sx={playbackState === 'PAUSED' ? {
                "@keyframes flash": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.3 }
                }
            } : {}}
        >
            {isComplete ? 'COMPLETE' : playbackState}
        </Box>
    );
};

const DelayTimer: React.FC<{ 
    playbackState: string;
}> = ({ playbackState }) => {
    const { engine } = useSharedShowTimeEngine();
    const [, forceUpdate] = useState({});

    // Force re-render every second during pause to update timer display
    useEffect(() => {
        if (playbackState === 'PAUSED' || playbackState === 'SAFETY') {
            const interval = setInterval(() => {
                forceUpdate({});
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [playbackState]);

    // Early return to prevent unnecessary clock subscriptions
    if (playbackState !== 'PAUSED' && playbackState !== 'SAFETY' && playbackState !== 'COMPLETE') return null;

    let displayTime: string;
    if (playbackState === 'COMPLETE') {
        // Show cumulative delay for COMPLETE state
        const totalPauseTimeMs = engine.totalPauseTime || 0;
        if (totalPauseTimeMs <= 0) return null;
        const totalCumulativeSeconds = Math.floor(totalPauseTimeMs / 1000);
        const minutes = Math.floor(totalCumulativeSeconds / 60);
        const seconds = totalCumulativeSeconds % 60;
        displayTime = `+${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        // Show session delay for PAUSED/SAFETY states (resets each pause)
        const liveTimestamp = Date.now();
        const currentSessionMs = engine.pausedAt ? (liveTimestamp - engine.pausedAt) : 0;
        const sessionSeconds = Math.max(0, Math.floor(currentSessionMs / 1000)); // Use floor, not ceil
        const minutes = Math.floor(sessionSeconds / 60);
        const seconds = sessionSeconds % 60;
        displayTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    return (
        <Box 
            bg="transparent" 
            color={playbackState === 'SAFETY' ? 'orange.500' : 'red.500'} 
            pl="8px" pr="16px" py="2px" 
            borderRadius="none" 
            fontSize="2xl" 
            fontFamily="mono"
            fontWeight="normal"
            minWidth="80px"
            textAlign="center"
            animation={playbackState === 'PAUSED' ? "flash 1s infinite" : undefined}
            sx={playbackState === 'PAUSED' ? {
                "@keyframes flash": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.3 }
                }
            } : {}}
        >
            {displayTime}
        </Box>
    );
};

interface SubscriberPlaybackOverlayProps {
    contentAreaBounds: DOMRect;
    script: (Pick<Script, 'start_time'> & { script_id?: string }) | null;
    useMilitaryTime: boolean;
    processBoundariesForTime: (timeMs: number) => void;
}

export const SubscriberPlaybackOverlay: React.FC<SubscriberPlaybackOverlayProps> = React.memo(({
    contentAreaBounds,
    script,
    useMilitaryTime,
    processBoundariesForTime
}) => {
    const { playbackState, engine } = useSharedShowTimeEngine();
    
    if (playbackState === 'STOPPED') return null;

    return (
        <SubscriberPlaybackTimingProvider 
            script={script}
            processBoundariesForTime={processBoundariesForTime}
        >
                {/* Red border overlay */}
                <Box
                position="fixed"
                top={`${contentAreaBounds.top - 1}px`}
                left={`${contentAreaBounds.left - 1}px`}
                width={`${contentAreaBounds.width + 2}px`}
                height={`${contentAreaBounds.height + 2}px`}
                border={{ 
                    base: "none", 
                    sm: `2px solid ${playbackState === 'SAFETY' ? "#EAB308" : "#e23122"}` 
                }}
                borderRadius="md"
                pointerEvents="none"
                zIndex={1000}
                animation={playbackState === 'PAUSED' ? "flash 1s infinite" : undefined}
                sx={playbackState === 'PAUSED' ? {
                    "@keyframes flash": {
                        "0%, 100%": { opacity: 1 },
                        "50%": { opacity: 0.3 }
                    }
                } : {}}
            />
            
            {/* Time and Status Display - positioned at top center exactly like auth side, hidden on mobile */}
            <Box
                position="fixed"
                top="22px"
                left="50%"
                transform="translateX(-50%)"
                zIndex={1001}
                pointerEvents="none"
                display={{ base: 'none', lg: 'block' }}
            >
                <Box border="2px solid" borderColor="gray.700" bg="#0F0F0F" borderRadius="md">
                    <HStack spacing={0} align="center">
                        {/* Realtime Clock */}
                        <RealtimeClock useMilitaryTime={useMilitaryTime} />
                        
                        {/* Bullet separator */}
                        <Box bg="#0F0F0F" px="4px" py="2px">
                            <Text fontSize="2xl" color="gray.500" fontFamily="mono">•</Text>
                        </Box>
                        
                        {/* Show Timer */}
                        <ShowTimer 
                            script={script}
                            playbackState={playbackState}
                        />
                        
                        {/* Bullet separator */}
                        <Box bg="#0F0F0F" px="4px" py="2px">
                            <Text fontSize="2xl" color="gray.500" fontFamily="mono">•</Text>
                        </Box>
                        
                        {/* Playback Status */}
                        <PlaybackStatus playbackState={playbackState} />
                        
                        {/* Bullet separator for paused/safety/complete mode - only show if there will be a delay timer */}
                        {((playbackState === 'PAUSED' || playbackState === 'SAFETY') || 
                          (playbackState === 'COMPLETE' && engine.totalPauseTime > 0)) && (
                            <Box bg="#0F0F0F" px="4px" py="2px">
                                <Text fontSize="2xl" color="gray.500" fontFamily="mono">•</Text>
                            </Box>
                        )}
                        
                        {/* Delay Timer - in PAUSED, SAFETY, and COMPLETE modes */}
                        <DelayTimer playbackState={playbackState} />
                    </HStack>
                </Box>
            </Box>
        </SubscriberPlaybackTimingProvider>
    );
});
