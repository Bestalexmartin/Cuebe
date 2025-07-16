// frontend/src/CreateShowModal.jsx

import { useState, useEffect } from 'react';
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
  Select,
  HStack,
  VStack,
  Text,
  useToast,
} from '@chakra-ui/react';

export const CreateShowModal = ({ isOpen, onClose, onShowCreated }) => {
  const { getToken } = useAuth();
  const toast = useToast();

  // Form state
  const [showName, setShowName] = useState('');
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [newVenueName, setNewVenueName] = useState('');
  const [showDate, setShowDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Venue management state
  const [venues, setVenues] = useState([]);
  const [isAddingNewVenue, setIsAddingNewVenue] = useState(false);
  const [isLoadingVenues, setIsLoadingVenues] = useState(true);

  // Load venues when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchVenues();
    }
  }, [isOpen]);

  const fetchVenues = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/venues/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const venuesData = await response.json();
        setVenues(venuesData);
      } else {
        throw new Error('Failed to fetch venues');
      }
    } catch (error) {
      toast({
        title: 'Error Loading Venues',
        description: 'Could not load venue list',
        status: 'error',
      });
    } finally {
      setIsLoadingVenues(false);
    }
  };

  const createVenue = async (venueName) => {
    try {
      const token = await getToken();
      const response = await fetch('/api/venues/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          venueName: venueName
        })
      });

      if (response.ok) {
        const newVenue = await response.json();
        return newVenue;
      } else {
        throw new Error('Failed to create venue');
      }
    } catch (error) {
      console.error('Error creating venue:', error);
      throw error;
    }
  };

  const handleVenueSelectChange = (e) => {
    const value = e.target.value;
    if (value === 'add_new') {
      setIsAddingNewVenue(true);
      setSelectedVenueId('');
    } else {
      setIsAddingNewVenue(false);
      setSelectedVenueId(value);
      setNewVenueName('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      let venueId = selectedVenueId;

      // If adding a new venue, create it first
      if (isAddingNewVenue && newVenueName.trim()) {
        const newVenue = await createVenue(newVenueName.trim());
        venueId = newVenue.venueID;

        toast({
          title: 'Venue Created',
          description: `"${newVenueName}" has been added to your venues`,
        });
      }

      // Create the show
      const token = await getToken();
      const response = await fetch('/api/shows/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          showName: showName,
          venueID: venueId ? parseInt(venueId) : null, // Convert to integer or null
          showDate: showDate,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create show.');
      }

      toast({
        title: 'Show Created',
        description: `"${showName}" has been created successfully`,
      });

      // Reset form and close modal
      resetForm();
      onShowCreated();
      onClose();

    } catch (error) {
      console.error(error);
      toast({
        title: 'Error Creating Show',
        description: error.message || 'Something went wrong',
        status: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowName('');
    setSelectedVenueId('');
    setNewVenueName('');
    setShowDate('');
    setIsAddingNewVenue(false);
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
        <ModalHeader>Create a New Show</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <FormControl isRequired>
            <FormLabel>Show Name</FormLabel>
            <Input
              placeholder="Enter show name"
              value={showName}
              onChange={(e) => setShowName(e.target.value)}
            />
          </FormControl>

          <FormControl mt={4}>
            <FormLabel>Venue</FormLabel>
            <VStack align="stretch" spacing={3}>
              <Select
                placeholder={isLoadingVenues ? "Loading venues..." : "Select a venue (optional)"}
                value={isAddingNewVenue ? 'add_new' : selectedVenueId}
                onChange={handleVenueSelectChange}
                disabled={isLoadingVenues}
              >
                {venues.map((venue) => (
                  <option key={venue.venueID} value={venue.venueID}>
                    {venue.venueName}
                  </option>
                ))}
                <option value="add_new">+ Add New Venue</option>
              </Select>

              {isAddingNewVenue && (
                <Input
                  placeholder="Enter new venue name"
                  value={newVenueName}
                  onChange={(e) => setNewVenueName(e.target.value)}
                />
              )}
            </VStack>
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
          <Button
            bg="blue.400"
            color="white"
            size="xs"
            mr={3}
            type="submit"
            isLoading={isSubmitting}
            isDisabled={!showName.trim() || (isAddingNewVenue && !newVenueName.trim())}
            _hover={{ bg: 'orange.400' }}
          >
            Create Show
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