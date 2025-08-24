// frontend/src/components/shared/PreferenceBadges.tsx

import React from 'react';
import {
    HStack,
    Badge,
    Text,
    Box
} from '@chakra-ui/react';

interface PreferenceBadgesProps {
    dangerMode: boolean;
    autoSaveInterval: number;
    isAutoSaving?: boolean;
    secondsUntilNextSave?: number;
}

export const PreferenceBadges: React.FC<PreferenceBadgesProps> = ({
    dangerMode,
    autoSaveInterval,
    isAutoSaving = false,
    secondsUntilNextSave = 0
}) => {
    // Don't render anything if auto-save is disabled
    if (autoSaveInterval === 0) {
        return null;
    }

    return (
        <HStack spacing={2} mb={3} justifyContent="flex-end">
            <Badge 
                colorScheme={isAutoSaving ? "green" : "blue"}
                variant="solid"
                fontSize="xs"
                px={2}
                py={1}
                borderRadius="md"
                opacity={secondsUntilNextSave <= 5 && secondsUntilNextSave > 0 ? 0.7 + (secondsUntilNextSave * 0.06) : 1}
                transition="opacity 0.3s ease-in-out"
            >
                <Text fontWeight="bold">
                    {isAutoSaving 
                        ? "SAVING..." 
                        : `AUTO-SAVE ${autoSaveInterval}s${secondsUntilNextSave > 0 && secondsUntilNextSave <= 10 ? ` (${secondsUntilNextSave})` : ''}`
                    }
                </Text>
            </Badge>
        </HStack>
    );
};