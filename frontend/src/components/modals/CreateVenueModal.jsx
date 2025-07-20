// frontend/src/components/modals/CreateVenueModal.jsx

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
    HStack,
} from '@chakra-ui/react';
import { useFormManager } from '../../hooks/useFormManager';

const INITIAL_FORM_STATE = {
    venueName: '',
    city: '',
    state: '',
};

export const CreateVenueModal = ({ isOpen, onClose, onVenueCreated }) => {
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
            const venueData = {
                venueName: formData.venueName,
                ...(formData.city.trim() && { city: formData.city.trim() }),
                ...(formData.state.trim() && { state: formData.state.trim() }),
            };

            await submitForm(
                '/api/me/venues',
                'POST',
                `"${formData.venueName}" has been added to your venues`,
                venueData
            );

            handleModalClose();
            onVenueCreated();

        } catch (error) {
        }
    };

    const handleModalClose = () => {
        resetForm();
        onClose();
    };

    const isFormValid = () => {
        return formData.venueName.trim();
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
                <ModalHeader>Create New Venue</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <VStack spacing={4} align="stretch">
                        <FormControl isRequired>
                            <FormLabel>Venue Name</FormLabel>
                            <Input
                                placeholder="Enter venue name"
                                value={formData.venueName}
                                onChange={(e) => updateField('venueName', e.target.value)}
                            />
                        </FormControl>

                        <HStack spacing={4}>
                            <FormControl>
                                <FormLabel>City</FormLabel>
                                <Input
                                    placeholder="Enter city"
                                    value={formData.city}
                                    onChange={(e) => updateField('city', e.target.value)}
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel>State</FormLabel>
                                <Input
                                    placeholder="CA"
                                    value={formData.state}
                                    onChange={(e) => updateField('state', e.target.value)}
                                    maxLength={2}
                                />
                            </FormControl>
                        </HStack>
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
                        Create Venue
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