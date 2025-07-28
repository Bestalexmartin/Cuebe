// frontend/src/components/modals/OptionsModal.tsx

import React from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Button,
    VStack,
    FormControl,
    FormLabel,
    Checkbox,
    HStack,
    Text
} from '@chakra-ui/react';

interface OptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    colorizeDepNames: boolean;
    onColorizeDepNamesChange: (value: boolean) => void;
}

export const OptionsModal: React.FC<OptionsModalProps> = ({
    isOpen,
    onClose,
    colorizeDepNames,
    onColorizeDepNamesChange
}) => {
    const handleColorizeChange = (value: string) => {
        onColorizeDepNamesChange(value === 'true');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Script Display Options</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <VStack spacing={6} align="stretch">
                        <FormControl>
                            <HStack align="center">
                                <Checkbox
                                    isChecked={colorizeDepNames}
                                    onChange={(e) => handleColorizeChange(e.target.checked ? 'true' : 'false')}
                                />
                                <FormLabel
                                    mb="0"
                                    fontSize="md"
                                    fontWeight="semibold"
                                    onClick={() => handleColorizeChange(colorizeDepNames ? 'false' : 'true')}
                                    cursor="pointer"
                                >
                                    Colorize Department Names
                                </FormLabel>
                            </HStack>
                        </FormControl>
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <Button onClick={onClose}>
                        Close
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};