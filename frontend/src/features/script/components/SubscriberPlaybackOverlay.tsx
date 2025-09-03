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

// Exact show timer from auth side
const ShowTimer: React.FC<{ script: any; playbackState: string }> = ({ script, playbackState }) => {
    const { currentTime } = useSynchronizedPlayContext();
    const [frozenTime, setFrozenTime] = useState<number | null>(null);
    
    useEffect(() => {
        if ((playbackState === 'COMPLETE' || playbackState === 'PAUSED' || playbackState === 'SAFETY') && frozenTime === null) {
            setFrozenTime(currentTime);
        } else if (playbackState === 'PLAYING') {
            setFrozenTime(null);
        }
    }, [playbackState, currentTime, frozenTime]);
    
    const displayTime = (playbackState === 'COMPLETE' || playbackState === 'PAUSED' || playbackState === 'SAFETY') && frozenTime !== null ? frozenTime : currentTime;
    
    const formatShowTime = useCallback((timeMs: number | null) => {
        if (timeMs === null) return "00:00:00";
        
        const totalSeconds = Math.abs(Math.floor(timeMs / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        return timeMs < 0 ? `–${timeStr}` : timeStr;
    }, []);

    const tMinusTime = formatShowTime(displayTime);

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
    return (
        <Box 
            bg="transparent" 
            color={getStatusColor()} 
            pl="8px" 
            pr="16px"
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
}> = React.memo(({ playbackState }) => {
    const liveTimestamp = useSubscriberClock();
    const { pauseStartTime } = useSynchronizedPlayContext();
    const timestamp = playbackState === 'COMPLETE' ? 0 : liveTimestamp;

    if (playbackState !== 'PAUSED' && playbackState !== 'SAFETY' && playbackState !== 'COMPLETE') return null;

    const sessionMs = pauseStartTime ? (timestamp - pauseStartTime) : 0;
    const totalDelaySeconds = Math.max(0, Math.ceil(sessionMs / 1000));
    
    // Hide timer in COMPLETE mode when delay is 0:00
    if (playbackState === 'COMPLETE' && totalDelaySeconds <= 0) return null;
    
    const minutes = Math.floor(totalDelaySeconds / 60);
    const seconds = totalDelaySeconds % 60;
    const displayTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

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
    return prevProps.playbackState === nextProps.playbackState;
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
    const { playbackState, isPlaybackSafety } = useSynchronizedPlayContext();
    
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
                        
                        {/* Bullet separator for paused/safety/complete mode */}
                        {(playbackState === 'PAUSED' || playbackState === 'SAFETY' || playbackState === 'COMPLETE') && (
                            <Box bg="#0F0F0F" px="4px" py="2px">
                                <Text fontSize="2xl" color="gray.500" fontFamily="mono">•</Text>
                            </Box>
                        )}
                        
                        {/* Delay Timer - in PAUSED, SAFETY, and COMPLETE modes */}
                        <DelayTimer playbackState={playbackState} />
                    </HStack>
                </Box>
            </Box>
        </SubscriberClockProvider>
    );
};