// frontend/src/CreateScriptModal.jsx

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
} from '@chakra-ui/react';

export const CreateScriptModal = ({ isOpen, onClose, showId, onScriptCreated }) => {
    const { getToken } = useAuth();
    const [scriptName, setScriptName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);

        try {
            const token = await getToken();
            // The API endpoint to create a script for a specific show
            const response = await fetch(`/api/shows/${showId}/scripts/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                // Our model gives scriptName a default, so this body could be empty,
                // but we'll include it for customization.
                body: JSON.stringify({
                    scriptName: scriptName || "New Script" // Use input or a default
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create script.');
            }

            onScriptCreated(); // This will be our refetchShows function
            onClose(); // Close the modal

        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent as="form" onSubmit={handleSubmit}>
                <ModalHeader>Create a New Script</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <FormControl>
                        <FormLabel>Script Name (optional)</FormLabel>
                        <Input
                            placeholder=""
                            value={scriptName}
                            onChange={(e) => setScriptName(e.target.value)}
                        />
                    </FormControl>
                </ModalBody>

                <ModalFooter>
                    <Button colorScheme="blue" mr={3} type="submit" isLoading={isSubmitting}>
                        Create
                    </Button>
                    <Button onClick={onClose}>Cancel</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};