// frontend/src/components/base/FloatingValidationErrorPanel.tsx

import React from 'react';
import { Box, Text } from '@chakra-ui/react';

interface FieldError {
    field: string;
    message: string;
    code?: string;
}

interface FloatingValidationErrorPanelProps {
    fieldErrors: FieldError[];
}

export const FloatingValidationErrorPanel: React.FC<FloatingValidationErrorPanelProps> = ({
    fieldErrors
}) => {
    if (fieldErrors.length === 0) {
        return null;
    }

    return (
        <Box
            position="fixed"
            bottom="20px"
            left="50%"
            transform="translateX(-50%)"
            bg="red.500"
            color="white"
            px="8"
            py="6"
            borderRadius="lg"
            boxShadow="xl"
            flexShrink={0}
            minWidth="450px"
            zIndex={9999}
        >
            <Text fontWeight="semibold" fontSize="md" display="inline">
                Validation Errors:
            </Text>
            <Text fontSize="md" display="inline" ml={1}>
                {fieldErrors.map((error, i) => (
                    <Text key={i} as="span">
                        {i > 0 && '; '}{error.message}
                    </Text>
                ))}
            </Text>
        </Box>
    );
};