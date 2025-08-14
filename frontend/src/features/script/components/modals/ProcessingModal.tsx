// frontend/src/features/script/components/modals/ProcessingModal.tsx

import React from 'react';
import { VStack, Text, Spinner, Box } from '@chakra-ui/react';
import { BaseModal } from '../../../../components/base/BaseModal';

interface ProcessingModalProps {
    isOpen: boolean;
    title?: string;
    message?: string;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({
    isOpen,
    title = "Processing",
    message = "Please wait while we process your request..."
}) => {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={() => { }}
            closeOnOverlayClick={false}
            closeOnEsc={false}
            showHeader={false}
            showFooter={false}
            maxWidth="400px"
            mx="4"
        >
            <VStack spacing={6} align="center" py="8">
                <Box>
                    <Spinner
                        size="xl"
                        thickness="4px"
                        speed="0.8s"
                        color="blue.400"
                    />
                </Box>

                <VStack spacing={2} textAlign="center">
                    <Text
                        fontSize="lg"
                        fontWeight="semibold"
                        color="gray.700"
                        _dark={{ color: "gray.200" }}
                    >
                        {title}
                    </Text>
                    <Text
                        fontSize="sm"
                        color="gray.600"
                        _dark={{ color: "gray.400" }}
                    >
                        {message}
                    </Text>
                </VStack>
            </VStack>
        </BaseModal>
    );
};
