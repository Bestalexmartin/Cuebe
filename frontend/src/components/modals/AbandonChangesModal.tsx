// frontend/src/components/modals/AbandonChangesModal.tsx

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
interface AbandonChangesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
    changesCount: number;
    customMainText?: string; // Custom main text, overrides default
    warningMessage?: string; // Additional warning text
}

export const AbandonChangesModal: React.FC<AbandonChangesModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false,
    changesCount,
    customMainText,
    warningMessage
}) => {
    const defaultMainText = `${changesCount} unsaved change${changesCount !== 1 ? 's' : ''} will be permanently discarded.`;
    const defaultWarning = "You can recreate these changes later, but any unsaved work will be lost.";

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalOverlay />
            <ModalContent
                bg="orange.800"
                border="3px solid"
                borderColor="orange.400"
                color="white"
            >
                <ModalHeader>
                    <HStack spacing="3">
                        <AppIcon name="warning" boxSize="24px" color="orange.300" />
                        <Text>Abandon Changes</Text>
                    </HStack>
                </ModalHeader>

                <ModalBody>
                    <VStack spacing="4" align="center" width="100%">
                        <Text fontSize="lg" textAlign="center" fontWeight="bold">
                            {customMainText || defaultMainText}
                        </Text>
                        <Text fontSize="md" textAlign="center" color="orange.200" lineHeight="1.6">
                            {warningMessage || defaultWarning}
                        </Text>
                        <Text fontSize="lg" textAlign="center" color="orange.300" fontWeight="bold">
                            This action cannot be undone.
                        </Text>
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <HStack spacing="3">
                        <Button
                            bg="orange.600"
                            color="white"
                            onClick={onConfirm}
                            size="sm"
                            isLoading={isLoading}
                            loadingText="Abandoning..."
                            _hover={{ bg: 'orange.500' }}
                            _focus={{ boxShadow: 'none' }}
                            fontWeight="bold"
                        >
                            Abandon Changes
                        </Button>
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
                            Keep Changes
                        </Button>
                    </HStack>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};