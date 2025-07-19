// frontend/src/components/modals/CreateScriptModal.jsx

import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    FormControl,
    FormLabel,
    Input,
    VStack,
} from '@chakra-ui/react';
import { useFormManager } from '../../hooks/useFormManager';

const INITIAL_FORM_STATE = {
    scriptName: '',
};

export const CreateScriptModal = ({ isOpen, onClose, showId, onScriptCreated }) => {
    const {
        formData,
        isSubmitting,
        updateField,
        resetForm,
        submitForm,
    } = useFormManager(INITIAL_FORM_STATE);

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            const scriptData = {
                scriptName: formData.scriptName
            };

            await submitForm(
                `/api/shows/${showId}/scripts/`,
                'POST',
                `"${formData.scriptName}" has been created successfully`,
                scriptData
            );

            handleModalClose();
            onScriptCreated();

        } catch (error) {
        }
    };

    const handleModalClose = () => {
        resetForm();
        onClose();
    };

    const isFormValid = () => {
        return formData.scriptName.trim();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleModalClose} onCloseComplete={resetForm}>
            <ModalOverlay />
            <ModalContent
                as="form"
                onSubmit={handleSubmit}
                bg="page.background"
                border="2px solid"
                borderColor="gray.600"
            >
                <ModalHeader>Create New Script</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <VStack spacing={4} align="stretch">
                        <FormControl isRequired>
                            <FormLabel>Script Name</FormLabel>
                            <Input
                                placeholder="Enter script name"
                                value={formData.scriptName}
                                onChange={(e) => updateField('scriptName', e.target.value)}
                            />
                        </FormControl>
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <Button
                        bg="blue.400"
                        color="white"
                        size="xs"
                        mr={3}
                        type="submit"
                        isLoading={isSubmitting}
                        isDisabled={!isFormValid()}
                        _hover={{ bg: 'orange.400' }}
                    >
                        Create Script
                    </Button>
                    <Button
                        size="xs"
                        onClick={handleModalClose}
                        _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
                    >
                        Cancel
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};