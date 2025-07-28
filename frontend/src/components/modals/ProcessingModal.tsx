// frontend/src/components/modals/ProcessingsModal.tsx

import React from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalBody,
    VStack,
    Text,
    Spinner,
    Box
} from '@chakra-ui/react';

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
        <Modal
            isOpen={isOpen}
            onClose={() => { }}
            isCentered
            closeOnOverlayClick={false}
            closeOnEsc={false}
        >
            <ModalOverlay bg="blackAlpha.600" />
            <ModalContent maxWidth="400px" mx="4">
                <ModalBody py="8">
                    <VStack spacing={6} align="center">
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
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};