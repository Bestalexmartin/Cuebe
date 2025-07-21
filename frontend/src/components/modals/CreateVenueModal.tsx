// frontend/src/components/modals/CreateVenueModal.tsx

import React from 'react';
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

// TypeScript interfaces
interface VenueFormData {
    venueName: string;
    city: string;
    state: string;
}

interface CreateVenueModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVenueCreated: () => void;
}

const INITIAL_FORM_STATE: VenueFormData = {
    venueName: '',
    city: '',
    state: '',
};

export const CreateVenueModal: React.FC<CreateVenueModalProps> = ({
    isOpen,
    onClose,
    onVenueCreated
}) => {
    const {
        formData,
        isSubmitting,
        updateField,
        resetForm,
        submitForm,
    } = useFormManager<VenueFormData>(INITIAL_FORM_STATE);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
            // Error handling is done in submitForm
        }
    };

    const handleModalClose = () => {
        resetForm();
        onClose();
    };

    const isFormValid = (): boolean => {
        return formData.venueName.trim() !== '';
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
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('venueName', e.target.value)}
                            />
                        </FormControl>

                        <HStack spacing={4}>
                            <FormControl>
                                <FormLabel>City</FormLabel>
                                <Input
                                    placeholder="Enter city"
                                    value={formData.city}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('city', e.target.value)}
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel>State</FormLabel>
                                <Input
                                    placeholder="CA"
                                    value={formData.state}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('state', e.target.value)}
                                    maxLength={2}
                                />
                            </FormControl>
                        </HStack>
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <Button
                        size="sm"
                        mr={3}
                        onClick={handleModalClose}
                        _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
                    >
                        Cancel
                    </Button>
                    <Button
                        bg="blue.400"
                        color="white"
                        size="sm"
                        type="submit"
                        isLoading={isSubmitting}
                        isDisabled={!isFormValid()}
                        _hover={{ bg: 'orange.400' }}
                    >
                        Create Venue
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};