// frontend/src/components/modals/UnsavedChangesModal.tsx

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
    HStack,
    VStack,
    Box
} from '@chakra-ui/react';
import { AppIcon } from '../AppIcon';

interface UnsavedChangesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => Promise<void>;
    onDiscard: () => void;
    changesCount: number;
    isSaving?: boolean;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onDiscard,
    changesCount,
    isSaving = false
}) => {
    const handleSave = async () => {
        await onSave();
    };

    const handleDiscard = () => {
        onDiscard();
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose}
            closeOnOverlayClick={false}
            closeOnEsc={false}
            isCentered
            size="md"
        >
            <ModalOverlay bg="blackAlpha.600" />
            <ModalContent bg="window.background" borderRadius="lg" border="1px solid" borderColor="ui.border">
                <ModalHeader pb={2}>
                    <HStack spacing={3}>
                        <AppIcon name="warning" boxSize="24px" color="orange.500" />
                        <Text fontSize="lg" fontWeight="bold" color="page.text">
                            Unsaved Changes
                        </Text>
                    </HStack>
                </ModalHeader>

                <ModalBody py={4}>
                    <VStack spacing={4} align="stretch">
                        <Text color="page.text" lineHeight="1.6">
                            You have <Text as="span" fontWeight="bold" color="orange.500">{changesCount} unsaved change{changesCount !== 1 ? 's' : ''}</Text> to this script.
                        </Text>
                        
                        <Text color="detail.text" fontSize="sm" lineHeight="1.5">
                            If you leave without saving, your changes will be lost permanently.
                        </Text>

                        <Box 
                            bg="card.background" 
                            p={3} 
                            borderRadius="md" 
                            border="1px solid" 
                            borderColor="ui.border"
                        >
                            <Text fontSize="sm" color="detail.text" fontWeight="medium">
                                What would you like to do?
                            </Text>
                        </Box>
                    </VStack>
                </ModalBody>

                <ModalFooter pt={2}>
                    <HStack spacing={3} width="100%" justify="flex-end">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            isDisabled={isSaving}
                            _hover={{ bg: 'card.background' }}
                        >
                            Cancel
                        </Button>
                        
                        <Button
                            colorScheme="red"
                            variant="outline"
                            onClick={handleDiscard}
                            isDisabled={isSaving}
                            _hover={{ bg: 'red.500', color: 'white' }}
                        >
                            Discard Changes
                        </Button>
                        
                        <Button
                            colorScheme="blue"
                            onClick={handleSave}
                            isLoading={isSaving}
                            loadingText="Saving..."
                            _hover={{ bg: 'blue.600' }}
                        >
                            Save & Continue
                        </Button>
                    </HStack>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};