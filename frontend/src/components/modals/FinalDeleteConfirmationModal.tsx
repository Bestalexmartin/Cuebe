// frontend/src/components/modals/FinalDeleteConfirmationModal.tsx

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
interface FinalDeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
    entityType: string;
    entityName: string;
    warningMessage: string | React.ReactNode;
    actionWord?: string; // Defaults to "Delete"
    customMainText?: string; // Custom main text, overrides default
}

export const FinalDeleteConfirmationModal: React.FC<FinalDeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false,
    entityType,
    entityName,
    warningMessage,
    actionWord = "Delete",
    customMainText
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalOverlay />
            <ModalContent
                bg="red.800"
                border="3px solid"
                borderColor="red.400"
                color="white"
            >
                <ModalHeader>
                    <HStack spacing="3">
                        <AppIcon name="warning" boxSize="24px" color="red.300" />
                        <Text>FINAL WARNING - {actionWord} {entityType}</Text>
                    </HStack>
                </ModalHeader>

                <ModalBody>
                    <VStack spacing="4" align="center" width="100%">
                        <Text fontSize="lg" textAlign="center" fontWeight="bold">
                            {customMainText || `"${entityName}" will be permanently deleted.`}
                        </Text>
                        <Text fontSize="md" textAlign="center" color="red.200" lineHeight="1.6">
                            {warningMessage}
                        </Text>
                        <Text fontSize="md" textAlign="center" color="red.300" fontWeight="bold">
                            THIS ACTION CAN NOT BE UNDONE!
                        </Text>
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <HStack spacing="3">
                        <Button
                            bg="red.600"
                            color="white"
                            onClick={onConfirm}
                            size="sm"
                            isLoading={isLoading}
                            loadingText="Deleting..."
                            _hover={{ bg: 'red.500' }}
                            _focus={{ boxShadow: 'none' }}
                            fontWeight="bold"
                        >
                            Do It!
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
                            Cancel
                        </Button>
                    </HStack>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};