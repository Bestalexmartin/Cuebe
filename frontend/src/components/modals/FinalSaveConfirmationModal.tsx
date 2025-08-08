// frontend/src/components/modals/FinalSaveConfirmationModal.tsx

import React from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Text,
    VStack,
    HStack
} from "@chakra-ui/react";
import { AppIcon } from '../AppIcon';

// TypeScript interfaces
interface FinalSaveConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
    changesCount: number;
    customMainText?: string;
    warningMessage?: string;
}

export const FinalSaveConfirmationModal: React.FC<FinalSaveConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false,
    changesCount,
    customMainText,
    warningMessage
}) => {
    const defaultMainText = `${changesCount} change${changesCount !== 1 ? 's' : ''} will be saved to the database.`;
    const defaultWarning = "This will apply all active changes and reset your edit history.";

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalOverlay />
            <ModalContent
                bg="blue.800"
                border="3px solid"
                borderColor="blue.400"
                color="white"
            >
                <ModalHeader>
                    <HStack spacing="3">
                        <AppIcon name="save" boxSize="24px" color="white" />
                        <Text>Final Confirmation</Text>
                    </HStack>
                </ModalHeader>

                <ModalBody>
                    <VStack spacing="4" align="center" width="100%">
                        <Text fontSize="lg" textAlign="center" fontWeight="bold">
                            {customMainText || defaultMainText}
                        </Text>
                        <Text fontSize="md" textAlign="center" color="blue.200" lineHeight="1.6">
                            {warningMessage || defaultWarning}
                        </Text>
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <HStack spacing="3">
                        <Button
                            bg="gray.600"
                            color="white"
                            onClick={onClose}
                            size="sm"
                            isDisabled={isLoading}
                            _hover={{ bg: 'gray.500' }}
                            _focus={{ boxShadow: 'none' }}
                            minWidth="120px"
                        >
                            Cancel
                        </Button>
                        <Button
                            bg="blue.400"
                            color="white"
                            onClick={onConfirm}
                            size="sm"
                            isLoading={isLoading}
                            loadingText="Saving..."
                            _hover={{ bg: 'orange.400' }}
                            _focus={{ boxShadow: 'none' }}
                            fontWeight="bold"
                        >
                            Save Changes
                        </Button>
                    </HStack>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};