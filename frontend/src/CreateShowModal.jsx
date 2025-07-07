// frontend/src/CreateShowModal.jsx

import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react'; // <-- Import useAuth to get the token
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

export const CreateShowModal = ({ isOpen, onClose, onShowCreated }) => {
  const { getToken } = useAuth(); // <-- Get the token function from Clerk
  const [showName, setShowName] = useState('');
  const [showVenue, setShowVenue] = useState('');
  const [showDate, setShowDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const token = await getToken();
      const response = await fetch('/api/shows/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          showName: showName,
          showVenue: showVenue,
          showDate: showDate,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create show.');
      }

      // This function will be passed from the parent to refresh the show list
      onShowCreated();
      onClose(); // Close the modal on success

    } catch (error) {
      console.error(error);
      // Here you could add an error message for the user
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Create a New Show</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <FormControl isRequired>
            <FormLabel>Show Name</FormLabel>
            <Input
              placeholder=""
              value={showName}
              onChange={(e) => setShowName(e.target.value)}
            />
          </FormControl>

          <FormControl mt={4}>
            <FormLabel>Venue</FormLabel>
            <Input
              placeholder=""
              value={showVenue}
              onChange={(e) => setShowVenue(e.target.value)}
            />
          </FormControl>

          <FormControl mt={4}>
            <FormLabel>Show Date</FormLabel>
            <Input
              type="date"
              value={showDate}
              onChange={(e) => setShowDate(e.target.value)}
            />
          </FormControl>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} type="submit" isLoading={isSubmitting}>
            Save
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};