// frontend/src/components/shared/PreferenceBadges.tsx

import React from 'react';
import {
    HStack,
    Badge,
    Text
} from '@chakra-ui/react';

interface PreferenceBadgesProps {
    dangerMode: boolean;
    autoSaveInterval: number;
    isAutoSaving?: boolean;
    secondsUntilNextSave?: number;
    isPaused?: boolean;
    onTogglePause?: () => void;
}

export const PreferenceBadges: React.FC<PreferenceBadgesProps> = ({
    autoSaveInterval,
    isAutoSaving = false,
    secondsUntilNextSave = 0,
    isPaused = false,
    onTogglePause
}) => {
    // Don't render anything if auto-save is disabled
    if (autoSaveInterval === 0) {
        return null;
    }

    return (
        <HStack spacing={2} mb={3} justifyContent="flex-end">
            <Badge 
                colorScheme={isAutoSaving ? "green" : isPaused ? "gray" : "blue"}
                variant="solid"
                fontSize="xs"
                px={2}
                py={1}
                borderRadius="md"
                opacity={secondsUntilNextSave <= 5 && secondsUntilNextSave > 0 ? 0.7 + (secondsUntilNextSave * 0.06) : 1}
                transition="opacity 0.3s ease-in-out"
                cursor={onTogglePause ? "pointer" : "default"}
                onClick={onTogglePause}
                _hover={onTogglePause ? {
                    transform: "scale(1.05)",
                    transition: "transform 0.2s"
                } : undefined}
                userSelect="none"
            >
                <Text fontWeight="bold">
                    {isAutoSaving 
                        ? "SAVING..." 
                        : isPaused 
                            ? "AUTO-SAVE (PAUSED)"
                            : `AUTO-SAVE ${Math.floor(autoSaveInterval / 60)}min${secondsUntilNextSave > 0 && secondsUntilNextSave <= 10 ? ` (${secondsUntilNextSave})` : ''}`
                    }
                </Text>
            </Badge>
        </HStack>
    );
};