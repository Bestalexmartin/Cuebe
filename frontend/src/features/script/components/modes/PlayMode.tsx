// frontend/src/features/script/components/modes/PlayMode.tsx

import React from 'react';
import { Flex, Text } from '@chakra-ui/react';

interface PlayModeProps {
    // Future props for performance/playback features
}

export const PlayMode: React.FC<PlayModeProps> = () => {
    return (
        <Flex
            height="100%"
            alignItems="center"
            justifyContent="center"
        >
            <Text color="gray.500" fontSize="lg">
                Performance mode - Coming soon
            </Text>
        </Flex>
    );
};
