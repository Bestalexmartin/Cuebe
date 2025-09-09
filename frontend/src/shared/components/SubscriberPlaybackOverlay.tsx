import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { Box, HStack, Text } from "@chakra-ui/react";
import { useSynchronizedPlayContext } from '../../contexts/SynchronizedPlayContext';

// Clock timing context for subscriber side
const SubscriberClockContext = createContext<{ timestamp: number }>({ timestamp: Date.now() });

// Playback timing context - isolated for boundary processing (like auth side)
const SubscriberPlaybackTimingContext = createContext<{ 
    currentPlaybackTime: number | null;
    processBoundariesForTime: (timeMs: number) => void;
}>({ 
    currentPlaybackTime: null,
    processBoundariesForTime: () => {}
});

const SubscriberClockProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
    const [timestamp, setTimestamp] = useState(Date.now());

    useEffect(() => {
        const intervalId = setInterval(() => {
            setTimestamp(Date.now());
        }, 1000);

        return () => {
            clearInterval(intervalId);
        };
    }, []);

    return (
        <SubscriberClockContext.Provider value={{ timestamp }}>
            {children}
        </SubscriberClockContext.Provider>
    );
});

const useSubscriberClock = () => {
    const context = useContext(SubscriberClockContext);
    return context.timestamp;
};

const SubscriberPlaybackTimingProvider: React.FC<{ 
    children: React.ReactNode;
    script: any;
    processBoundariesForTime: (timeMs: number) => void;
}> = React.memo(({ children, script, processBoundariesForTime }) => {
    const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number | null>(null);
    const finalShowTimeRef = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);
    const nextIndexRef = useRef<number>(0);
    const { timingBoundaries, setCurrentTime, cumulativeDelayMs, playbackState, isPlaybackPlaying, isPlaybackComplete, isPlaybackPaused, isPlaybackSafety } = useSynchronizedPlayContext();

    const computeShowTime = useCallback(() => {
        if (!script?.start_time) return null;
        const showTime = Date.now() - new Date(script.start_time).getTime() + (cumulativeDelayMs || 0);
        console.log('⏰ computeShowTime:', showTime, 'script.start_time:', script.start_time, 'cumulativeDelayMs:', cumulativeDelayMs);
        return showTime;
    }, [script?.start_time, cumulativeDelayMs]);

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

        console.log('🔄 Guest scheduleNext: currentTime =', now, 'cumulativeDelayMs =', cumulativeDelayMs);
        setCurrentPlaybackTime(now);
        setCurrentTime(now);
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
            setCurrentTime(current);
            processBoundariesForTime(current);
            nextIndexRef.current = findNextIndex(current);
            if (isPlaybackPlaying && script?.start_time) {
                scheduleNext();
            }
        }, delay);
    }, [clearTimer, computeShowTime, findNextIndex, isPlaybackPlaying, processBoundariesForTime, timingBoundaries, script?.start_time]);

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
                setCurrentTime(now);
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
    }, [isPlaybackPlaying, isPlaybackComplete, isPlaybackPaused, isPlaybackSafety, script?.start_time, scheduleNext, clearTimer, computeShowTime, processBoundariesForTime]);

    useEffect(() => {
        if (isPlaybackPlaying && script?.start_time) {
            scheduleNext();
            return () => clearTimer();
        }
    }, [timingBoundaries, isPlaybackPlaying, script?.start_time, scheduleNext, clearTimer]);

    // Process boundaries immediately when cumulativeDelayMs changes during playback
    useEffect(() => {
        if (playbackState !== 'STOPPED' && (isPlaybackPlaying || isPlaybackPaused) && script?.start_time) {
            const current = computeShowTime();
            if (current !== null) {
                console.log('🔄 cumulativeDelayMs changed, reprocessing boundaries at time:', current, 'playbackState:', playbackState);
                setCurrentTime(current);
                processBoundariesForTime(current);
            }
        }
    }, [cumulativeDelayMs, playbackState, isPlaybackPlaying, isPlaybackPaused, script?.start_time, computeShowTime, setCurrentTime, processBoundariesForTime]);

    // Process boundaries immediately when timing boundaries change and we have a current time
    useEffect(() => {
        if (playbackState !== 'STOPPED' && (isPlaybackPlaying || isPlaybackPaused) && script?.start_time && timingBoundaries.length > 0) {
            const current = computeShowTime();
            if (current !== null) {
                console.log('📋 timingBoundaries changed, processing at time:', current, 'playbackState:', playbackState);
                setCurrentTime(current);
                processBoundariesForTime(current);
            }
        }
    }, [timingBoundaries, playbackState, isPlaybackPlaying, isPlaybackPaused, script?.start_time, computeShowTime, setCurrentTime, processBoundariesForTime]);

    return (
        <SubscriberPlaybackTimingContext.Provider value={{ currentPlaybackTime, processBoundariesForTime }}>
            {children}
        </SubscriberPlaybackTimingContext.Provider>
    );
});

// Exact clock component from auth side
const RealtimeClock: React.FC<{ useMilitaryTime: boolean }> = ({ useMilitaryTime }) => {
    const timestamp = useSubscriberClock();
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

// Show timer using wall clock like auth side
const ShowTimer: React.FC<{ script: any; playbackState: string }> = ({ script, playbackState }) => {
    const liveTimestamp = useSubscriberClock();
    const { pauseStartTime } = useSynchronizedPlayContext();
    
    // Use pauseStartTime as the frozen timestamp for PAUSED/SAFETY/COMPLETE, live for others
    const timestamp = (playbackState === 'PAUSED' || playbackState === 'SAFETY' || playbackState === 'COMPLETE') && pauseStartTime 
        ? pauseStartTime 
        : liveTimestamp;
    
    const calculateTMinusTime = useCallback((timestamp: number) => {
        if (!script?.start_time) {
            return "00:00:00";
        }

        const scriptStart = new Date(script.start_time);
        
        const diffMs = scriptStart.getTime() - timestamp;
        const diffSeconds = Math.round(diffMs / 1000);
        
        const hours = Math.floor(Math.abs(diffSeconds) / 3600);
        const minutes = Math.floor((Math.abs(diffSeconds) % 3600) / 60);
        const seconds = Math.abs(diffSeconds) % 60;
        
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        return diffSeconds < 0 ? timeStr : `–${timeStr}`;
    }, [script?.start_time]);

    const tMinusTime = calculateTMinusTime(timestamp);

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
            {tMinusTime}
        </Box>
    );
};

// Exact playback status from auth side
const PlaybackStatus: React.FC<{ playbackState: string; cumulativeDelayMs?: number }> = ({ playbackState, cumulativeDelayMs }) => {
    if (playbackState === 'STOPPED') return null;

    const getStatusColor = () => {
        if (playbackState === 'SAFETY') return 'orange.500';
        if (playbackState === 'COMPLETE') return 'green.500';
        return 'red.500';
    };

    const isComplete = playbackState === 'COMPLETE';
    const hasDelayTimer = playbackState === 'PAUSED' || playbackState === 'SAFETY' || (playbackState === 'COMPLETE' && cumulativeDelayMs && cumulativeDelayMs > 0);
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
    cumulativeDelayMs?: number;
}> = React.memo(({ playbackState, cumulativeDelayMs = 0 }) => {
    // Early return to prevent unnecessary clock subscriptions
    if (playbackState !== 'PAUSED' && playbackState !== 'SAFETY' && playbackState !== 'COMPLETE') return null;
    
    const liveTimestamp = useSubscriberClock();
    const { pauseStartTime } = useSynchronizedPlayContext();
    const timestamp = playbackState === 'COMPLETE' ? 0 : liveTimestamp;

    let displayTime: string;
    if (playbackState === 'COMPLETE') {
        if (!cumulativeDelayMs || cumulativeDelayMs <= 0) return null;
        const totalCumulativeSeconds = Math.floor((cumulativeDelayMs || 0) / 1000);
        const minutes = Math.floor(totalCumulativeSeconds / 60);
        const seconds = totalCumulativeSeconds % 60;
        displayTime = `+${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        const sessionMs = pauseStartTime ? (timestamp - pauseStartTime) : 0;
        const totalDelaySeconds = Math.max(0, Math.ceil(sessionMs / 1000));
        const minutes = Math.floor(totalDelaySeconds / 60);
        const seconds = totalDelaySeconds % 60;
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
}, (prevProps, nextProps) => {
    if (prevProps.playbackState === 'COMPLETE' && nextProps.playbackState === 'COMPLETE') {
        return prevProps.cumulativeDelayMs === nextProps.cumulativeDelayMs;
    }
    return prevProps.playbackState === nextProps.playbackState && 
           prevProps.cumulativeDelayMs === nextProps.cumulativeDelayMs;
});

interface SubscriberPlaybackOverlayProps {
    contentAreaBounds: DOMRect;
    script: any;
    useMilitaryTime: boolean;
    processBoundariesForTime: (timeMs: number) => void;
}

export const SubscriberPlaybackOverlay: React.FC<SubscriberPlaybackOverlayProps> = React.memo(({
    contentAreaBounds,
    script,
    useMilitaryTime,
    processBoundariesForTime
}) => {
    const { playbackState, isPlaybackPlaying, isPlaybackComplete, isPlaybackPaused, isPlaybackSafety, cumulativeDelayMs } = useSynchronizedPlayContext();
    
    // Debug logging
    
    if (playbackState === 'STOPPED') return null;

    return (
        <SubscriberClockProvider>
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
                        <PlaybackStatus playbackState={playbackState} cumulativeDelayMs={cumulativeDelayMs} />
                        
                        {/* Bullet separator for paused/safety/complete mode - only show if there will be a delay timer */}
                        {((playbackState === 'PAUSED' || playbackState === 'SAFETY') || 
                          (playbackState === 'COMPLETE' && cumulativeDelayMs > 0)) && (
                            <Box bg="#0F0F0F" px="4px" py="2px">
                                <Text fontSize="2xl" color="gray.500" fontFamily="mono">•</Text>
                            </Box>
                        )}
                        
                        {/* Delay Timer - in PAUSED, SAFETY, and COMPLETE modes */}
                        <DelayTimer playbackState={playbackState} cumulativeDelayMs={cumulativeDelayMs} />
                    </HStack>
                </Box>
            </Box>
            </SubscriberPlaybackTimingProvider>
        </SubscriberClockProvider>
    );
});