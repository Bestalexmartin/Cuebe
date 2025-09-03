import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Box, HStack, Text } from "@chakra-ui/react";
import { useSynchronizedPlayContext } from '../../../contexts/SynchronizedPlayContext';

// Clock timing context for subscriber side
const SubscriberClockContext = createContext<{ timestamp: number }>({ timestamp: Date.now() });

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
            color="gray.300" 
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
    const [frozenTimestamp, setFrozenTimestamp] = useState<number | null>(null);
    
    useEffect(() => {
        if ((playbackState === 'COMPLETE' || playbackState === 'PAUSED' || playbackState === 'SAFETY') && frozenTimestamp === null) {
            setFrozenTimestamp(liveTimestamp);
        } else if (playbackState === 'PLAYING') {
            setFrozenTimestamp(null);
        }
    }, [playbackState, liveTimestamp, frozenTimestamp]);
    
    const timestamp = (playbackState === 'COMPLETE' || playbackState === 'PAUSED' || playbackState === 'SAFETY') && frozenTimestamp ? frozenTimestamp : liveTimestamp;
    
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

    const tMinusTime = calculateTMinusTime(frozenTimestamp || timestamp);

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
const PlaybackStatus: React.FC<{ playbackState: string }> = ({ playbackState }) => {
    if (playbackState === 'STOPPED') return null;

    const getStatusColor = () => {
        if (playbackState === 'SAFETY') return 'orange.500';
        if (playbackState === 'COMPLETE') return 'green.500';
        return 'red.500';
    };

    const isComplete = playbackState === 'COMPLETE';
    const hasDelayTimer = playbackState === 'PAUSED' || playbackState === 'SAFETY' || playbackState === 'COMPLETE';
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
    const liveTimestamp = useSubscriberClock();
    const { pauseStartTime } = useSynchronizedPlayContext();
    const timestamp = playbackState === 'COMPLETE' ? 0 : liveTimestamp;

    if (playbackState !== 'PAUSED' && playbackState !== 'SAFETY' && playbackState !== 'COMPLETE') return null;

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
}

export const SubscriberPlaybackOverlay: React.FC<SubscriberPlaybackOverlayProps> = ({
    contentAreaBounds,
    script,
    useMilitaryTime
}) => {
    const { playbackState, isPlaybackSafety, cumulativeDelayMs } = useSynchronizedPlayContext();
    
    if (playbackState === 'STOPPED') return null;

    return (
        <SubscriberClockProvider>
            {/* Red border overlay */}
            <Box
                position="fixed"
                top={`${contentAreaBounds.top - 1}px`}
                left={`${contentAreaBounds.left - 1}px`}
                width={`${contentAreaBounds.width + 2}px`}
                height={`${contentAreaBounds.height + 2}px`}
                border="2px solid"
                borderColor={isPlaybackSafety ? "#EAB308" : "red.500"}
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
            
            {/* Time and Status Display - positioned at top center exactly like auth side */}
            <Box
                position="fixed"
                top="16px"
                left="50%"
                transform="translateX(-50%)"
                zIndex={1001}
                pointerEvents="none"
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
        </SubscriberClockProvider>
    );
};