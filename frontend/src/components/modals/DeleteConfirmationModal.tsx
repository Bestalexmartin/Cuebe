// frontend/src/components/DeleteConfirmationModal.tsx

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
interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
    entityType: string;
    entityName: string;
    additionalInfo?: string[];
    actionWord?: string; // Defaults to "Delete"
    customQuestion?: string; // Custom question text, overrides default
    customWarning?: string; // Custom warning text, overrides default
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false,
    entityType,
    entityName,
    additionalInfo = [],
    actionWord = "Delete",
    customQuestion,
    customWarning
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalOverlay />
            <ModalContent
                bg="page.background"
                border="2px solid"
                borderColor="gray.600"
            >
                <ModalHeader>
                    <HStack spacing="3">
                        <AppIcon name="warning" boxSize="20px" color="red.500" />
                        <Text>{actionWord} {entityType}</Text>
                    </HStack>
                </ModalHeader>

                <ModalBody>
                    <VStack spacing="4" align="stretch">
                        <VStack align="center" spacing="4" width="100%">
                            <Text fontSize="md" textAlign="center">
                                {customQuestion || `Are you sure you want to delete "${entityName}"?`}
                            </Text>
                            <Text fontSize="md" color="red.500" fontWeight="bold" textAlign="center" lineHeight="1.4">
                                {customWarning || (
                                    <>
                                        This {entityType.toLowerCase()} will be permanently removed.
                                        <br />
                                        This action cannot be undone.
                                    </>
                                )}
                            </Text>
                        </VStack>

                        {additionalInfo.length > 0 && (
                            <VStack align="start" spacing="2">
                                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                                    This will also remove:
                                </Text>
                                <VStack align="start" spacing="1" pl="4">
                                    {additionalInfo.map((info, index) => (
                                        <Text key={index} fontSize="sm" color="gray.600">
                                            • {info}
                                        </Text>
                                    ))}
                                </VStack>
                            </VStack>
                        )}
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <HStack spacing="3">
                        <Button
                            onClick={onClose}
                            size="sm"
                            isDisabled={isLoading}
                            _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
                        >
                            Cancel
                        </Button>
                        <Button
                            bg="blue.400"
                            color="white"
                            onClick={onConfirm}
                            size="sm"
                            isLoading={isLoading}
                            loadingText="Deleting..."
                            _hover={{ bg: 'orange.400' }}
                            _focus={{ boxShadow: 'none' }}
                        >
                            {actionWord} {entityType}
                        </Button>
                    </HStack>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};