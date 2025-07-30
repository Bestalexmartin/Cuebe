// frontend/src/components/modals/RevertToPointModal.tsx

import React, { useState } from 'react';
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
    Box,
    Badge,
    Divider
} from '@chakra-ui/react';
import { AppIcon } from '../AppIcon';
import { EditOperation } from '../../types/editQueue';
import { EditQueueFormatter } from '../../utils/editQueueFormatter';

interface RevertToPointModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    targetOperation: EditOperation | null;
    operationsToLose: EditOperation[];
    isReverting?: boolean;
}

export const RevertToPointModal: React.FC<RevertToPointModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    targetOperation,
    operationsToLose,
    isReverting = false
}) => {
    const [showFinalConfirmation, setShowFinalConfirmation] = useState(false);

    const handleInitialConfirm = () => {
        setShowFinalConfirmation(true);
    };

    const handleFinalConfirm = () => {
        onConfirm();
        setShowFinalConfirmation(false);
    };

    const handleClose = () => {
        setShowFinalConfirmation(false);
        onClose();
    };

    const handleBack = () => {
        setShowFinalConfirmation(false);
    };

    if (!targetOperation) return null;

    const targetTimestamp = EditQueueFormatter.formatTimestamp(targetOperation.timestamp);
    const targetDescription = EditQueueFormatter.formatOperation(targetOperation, []);

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose}
            closeOnOverlayClick={false}
            closeOnEsc={false}
            isCentered
            size="md"
        >
            <ModalOverlay bg="blackAlpha.600" />
            <ModalContent bg="window.background" borderRadius="lg" border="1px solid" borderColor="ui.border">
                {!showFinalConfirmation ? (
                    // First confirmation step
                    <>
                        <ModalHeader pb={2}>
                            <HStack spacing={3}>
                                <AppIcon name="warning" boxSize="24px" color="orange.500" />
                                <Text fontSize="lg" fontWeight="bold" color="page.text">
                                    Revert to This Point?
                                </Text>
                            </HStack>
                        </ModalHeader>

                        <ModalBody py={4}>
                            <VStack spacing={4} align="stretch">
                                <Box 
                                    bg="card.background" 
                                    p={3} 
                                    borderRadius="md" 
                                    border="1px solid" 
                                    borderColor="ui.border"
                                >
                                    <VStack spacing={2} align="stretch">
                                        <HStack justify="space-between">
                                            <Text fontSize="sm" fontWeight="semibold" color="page.text">
                                                Target Change
                                            </Text>
                                            <Badge colorScheme="blue" size="sm">
                                                {targetTimestamp}
                                            </Badge>
                                        </HStack>
                                        <Text fontSize="sm" color="detail.text">
                                            {targetDescription}
                                        </Text>
                                    </VStack>
                                </Box>

                                <Text color="page.text" lineHeight="1.6">
                                    This will revert your script back to this point in time.
                                </Text>
                                
                                <Box 
                                    bg="orange.50" 
                                    _dark={{ bg: "orange.900" }}
                                    p={3} 
                                    borderRadius="md" 
                                    border="1px solid" 
                                    borderColor="orange.200"
                                    _dark={{ borderColor: "orange.600" }}
                                >
                                    <VStack spacing={2} align="stretch">
                                        <HStack spacing={2}>
                                            <AppIcon name="warning" boxSize="16px" color="orange.500" />
                                            <Text fontSize="sm" fontWeight="semibold" color="orange.700" _dark={{ color: "orange.300" }}>
                                                {operationsToLose.length} change{operationsToLose.length !== 1 ? 's' : ''} will be lost
                                            </Text>
                                        </HStack>
                                        <Text fontSize="sm" color="orange.600" _dark={{ color: "orange.400" }}>
                                            All changes made after this point will be permanently removed from your edit history.
                                        </Text>
                                    </VStack>
                                </Box>
                            </VStack>
                        </ModalBody>

                        <ModalFooter pt={2}>
                            <HStack spacing={3} width="100%" justify="flex-end">
                                <Button
                                    variant="ghost"
                                    onClick={handleClose}
                                    _hover={{ bg: 'card.background' }}
                                >
                                    Cancel
                                </Button>
                                
                                <Button
                                    colorScheme="orange"
                                    onClick={handleInitialConfirm}
                                    _hover={{ bg: 'orange.600' }}
                                >
                                    Continue
                                </Button>
                            </HStack>
                        </ModalFooter>
                    </>
                ) : (
                    // Final confirmation step
                    <>
                        <ModalHeader pb={2}>
                            <HStack spacing={3}>
                                <AppIcon name="warning" boxSize="24px" color="red.500" />
                                <Text fontSize="lg" fontWeight="bold" color="page.text">
                                    Final Confirmation
                                </Text>
                            </HStack>
                        </ModalHeader>

                        <ModalBody py={4}>
                            <VStack spacing={4} align="stretch">
                                <Text color="page.text" fontSize="lg" fontWeight="semibold" textAlign="center">
                                    Are you absolutely sure?
                                </Text>
                                
                                <Box 
                                    bg="red.50" 
                                    _dark={{ bg: "red.900" }}
                                    p={4} 
                                    borderRadius="md" 
                                    border="2px solid" 
                                    borderColor="red.200"
                                    _dark={{ borderColor: "red.600" }}
                                >
                                    <VStack spacing={3} align="stretch">
                                        <HStack justify="center" spacing={2}>
                                            <AppIcon name="warning" boxSize="20px" color="red.500" />
                                            <Text fontSize="md" fontWeight="bold" color="red.700" _dark={{ color: "red.300" }}>
                                                This action cannot be undone
                                            </Text>
                                        </HStack>
                                        
                                        <Divider borderColor="red.200" _dark={{ borderColor: "red.600" }} />
                                        
                                        <VStack spacing={1}>
                                            <Text fontSize="sm" color="red.600" _dark={{ color: "red.400" }} textAlign="center">
                                                You will lose <Text as="span" fontWeight="bold">{operationsToLose.length} change{operationsToLose.length !== 1 ? 's' : ''}</Text>
                                            </Text>
                                            <Text fontSize="sm" color="red.600" _dark={{ color: "red.400" }} textAlign="center">
                                                The script will revert to: <Text as="span" fontWeight="bold">{targetTimestamp}</Text>
                                            </Text>
                                        </VStack>
                                    </VStack>
                                </Box>
                            </VStack>
                        </ModalBody>

                        <ModalFooter pt={2}>
                            <HStack spacing={3} width="100%" justify="flex-end">
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                    _hover={{ bg: 'card.background' }}
                                    isDisabled={isReverting}
                                >
                                    Back
                                </Button>
                                
                                <Button
                                    variant="ghost"
                                    onClick={handleClose}
                                    _hover={{ bg: 'card.background' }}
                                    isDisabled={isReverting}
                                >
                                    Cancel
                                </Button>
                                
                                <Button
                                    colorScheme="red"
                                    onClick={handleFinalConfirm}
                                    isLoading={isReverting}
                                    loadingText="Reverting..."
                                    _hover={{ bg: 'red.600' }}
                                >
                                    Do It!
                                </Button>
                            </HStack>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};