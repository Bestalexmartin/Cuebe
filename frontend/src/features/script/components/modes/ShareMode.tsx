// frontend/src/features/script/components/modes/ShareMode.tsx

import React from 'react';
import { Flex, Text } from '@chakra-ui/react';

interface ShareModeProps {
    // Future props for sharing and collaboration features
}

export const ShareMode: React.FC<ShareModeProps> = () => {
    return (
        <Flex
            height="100%"
            alignItems="center"
            justifyContent="center"
        >
            <Text color="gray.500" fontSize="lg">
                Script sharing - Coming soon
            </Text>
        </Flex>
    );
};
