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

// Mobile-optimized clock component
const MobileRealtimeClock: React.FC<{ useMilitaryTime: boolean }> = ({ useMilitaryTime }) => {
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
            px="6px" py="1px" 
            borderRadius="none" 
            fontSize={{ base: "lg", md: "xl" }}
            fontFamily="mono"
            minWidth={{ base: "70px", md: "90px" }}
            textAlign="center"
        >
            {formatTime(timestamp)}
        </Box>
    );
};

// Mobile-optimized show timer
const MobileShowTimer: React.FC<{ script: any; playbackState: string }> = ({ script, playbackState }) => {
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
            px="6px" py="1px" 
            borderRadius="none" 
            fontSize={{ base: "lg", md: "xl" }}
            fontFamily="mono"
            minWidth={{ base: "80px", md: "100px" }}
            textAlign="center"
        >
            {tMinusTime}
        </Box>
    );
};

// Mobile-optimized playback status
const MobilePlaybackStatus: React.FC<{ playbackState: string }> = ({ playbackState }) => {
    if (playbackState === 'STOPPED') return null;

    const getStatusColor = () => {
        if (playbackState === 'SAFETY') return 'orange.500';
        if (playbackState === 'COMPLETE') return 'green.500';
        return 'red.500';
    };

    const getStatusText = () => {
        switch (playbackState) {
            case 'PLAYING': return 'PLAY';
            case 'PAUSED': return 'PAUSE';
            case 'SAFETY': return 'SAFETY';
            case 'COMPLETE': return 'DONE';
            default: return playbackState;
        }
    };

    return (
        <Box 
            bg="transparent" 
            color={getStatusColor()} 
            px="6px" py="1px" 
            borderRadius="none" 
            fontSize={{ base: "lg", md: "xl" }}
            fontFamily="mono"
            fontWeight="bold"
            minWidth={{ base: "60px", md: "80px" }}
            textAlign="center"
            animation={playbackState === 'PAUSED' ? "flash 1s infinite" : undefined}
            sx={playbackState === 'PAUSED' ? {
                "@keyframes flash": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.3 }
                }
            } : {}}
        >
            {getStatusText()}
        </Box>
    );
};

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
            
            {/* Mobile-optimized time and status display */}
            <Box
                position="fixed"
                top="8px"
                left="50%"
                transform="translateX(-50%)"
                zIndex={1001}
                pointerEvents="none"
            >
                <Box border="2px solid" borderColor="gray.700" bg="#0F0F0F">
                    <HStack spacing={0} align="center">
                        {/* Realtime Clock */}
                        <MobileRealtimeClock useMilitaryTime={useMilitaryTime} />
                        
                        {/* Bullet separator */}
                        <Box bg="#0F0F0F" px="2px" py="1px">
                            <Text fontSize={{ base: "lg", md: "xl" }} color="gray.500" fontFamily="mono">•</Text>
                        </Box>
                        
                        {/* Show Timer */}
                        <MobileShowTimer 
                            script={script}
                            playbackState={playbackState}
                        />
                        
                        {/* Bullet separator */}
                        <Box bg="#0F0F0F" px="2px" py="1px">
                            <Text fontSize={{ base: "lg", md: "xl" }} color="gray.500" fontFamily="mono">•</Text>
                        </Box>
                        
                        {/* Playback Status */}
                        <MobilePlaybackStatus playbackState={playbackState} />
                    </HStack>
                </Box>
            </Box>
        </SubscriberClockProvider>
    );
};