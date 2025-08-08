// frontend/src/components/modals/SaveProcessingModal.tsx

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

interface SaveProcessingModalProps {
    isOpen: boolean;
    changesCount: number;
}

export const SaveProcessingModal: React.FC<SaveProcessingModalProps> = ({
    isOpen,
    changesCount
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { }}
            closeOnOverlayClick={false}
            closeOnEsc={false}
        >
            <ModalOverlay />
            <ModalContent 
                maxWidth="400px" 
                mx="4"
                bg="page.background"
                border="2px solid"
                borderColor="gray.600"
            >
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
                                Saving Changes
                            </Text>
                            <Text
                                fontSize="sm"
                                color="gray.600"
                                _dark={{ color: "gray.400" }}
                            >
                                Saving {changesCount} change{changesCount !== 1 ? 's' : ''} to the database...
                            </Text>
                        </VStack>
                    </VStack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};