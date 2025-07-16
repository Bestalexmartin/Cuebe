// frontend/src/CreateVenueModal.jsx

import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
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
    useToast
} from '@chakra-ui/react';

export const CreateVenueModal = ({ isOpen, onClose, onVenueCreated }) => {
    const { getToken } = useAuth();
    const toast = useToast();
    const [venueName, setVenueName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetForm = () => {
        setVenueName('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const token = await getToken();
            const response = await fetch('/api/venues/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ venueName: venueName })
            });

            if (!response.ok) {
                throw new Error('Failed to create venue');
            }

            toast({
                title: 'Venue Created',
                description: `"${venueName}" has been added to your venues`,
            });

            resetForm();
            onVenueCreated(); // This will be a refetch function
            onClose();
        } catch (error) {
            console.error("Failed to create venue", error);
            toast({
                title: 'Error Creating Venue',
                description: error.message || 'Something went wrong',
                status: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} onCloseComplete={resetForm}>
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
                    <FormControl isRequired>
                        <FormLabel>Venue Name</FormLabel>
                        <Input
                            value={venueName}
                            onChange={(e) => setVenueName(e.target.value)}
                            placeholder="e.g., The Grand Theater"
                        />
                    </FormControl>
                </ModalBody>
                <ModalFooter>
                    <Button
                        bg="blue.400"
                        color="white"
                        size="xs"
                        mr={3}
                        type="submit"
                        isLoading={isSubmitting}
                        isDisabled={!venueName.trim()}
                        _hover={{ bg: 'orange.400' }}
                    >
                        Create Venue
                    </Button>
                    <Button
                        size="xs"
                        onClick={onClose}
                        _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
                    >
                        Cancel
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};