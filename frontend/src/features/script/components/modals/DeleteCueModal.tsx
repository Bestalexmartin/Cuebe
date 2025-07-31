// frontend/src/features/script/components/modals/DeleteCueModal.tsx

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
} from '@chakra-ui/react';
import { AppIcon } from '../../../../components/AppIcon';

interface DeleteCueModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    cueName: string;
    isDeleting?: boolean;
}

export const DeleteCueModal: React.FC<DeleteCueModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    cueName,
    isDeleting = false
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
                        <Text>Delete Script Element</Text>
                    </HStack>
                </ModalHeader>

                <ModalBody>
                    <VStack spacing="4" align="stretch">
                        <VStack align="center" spacing="4" width="100%">
                            <Text fontSize="md" textAlign="center">
                                Are you sure you want to delete "{cueName}"?
                            </Text>
                            <Text fontSize="md" color="red.500" fontWeight="bold" textAlign="center" lineHeight="1.4">
                                This script element will be permanently removed.
                                <br />
                                This action cannot be undone.
                            </Text>
                        </VStack>
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <HStack spacing="3">
                        <Button
                            onClick={onClose}
                            size="sm"
                            isDisabled={isDeleting}
                            _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
                        >
                            Cancel
                        </Button>
                        <Button
                            bg="blue.400"
                            color="white"
                            onClick={onConfirm}
                            size="sm"
                            isLoading={isDeleting}
                            loadingText="Deleting..."
                            _hover={{ bg: 'orange.400' }}
                            _focus={{ boxShadow: 'none' }}
                        >
                            Delete Script Element
                        </Button>
                    </HStack>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
