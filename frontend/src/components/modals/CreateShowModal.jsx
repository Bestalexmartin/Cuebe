// frontend/src/components/modals/CreateShowModal.jsx

import { useState, useEffect } from 'react';
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
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useFormManager } from '../../hooks/useFormManager';
import { useResource } from '../../hooks/useResource';

const INITIAL_FORM_STATE = {
  showName: '',
  venueID: '',
  showDate: '',
  showNotes: '',
  deadline: '',
};

export const CreateShowModal = ({ isOpen, onClose, onShowCreated }) => {
  const toast = useToast();
  const [isAddingNewVenue, setIsAddingNewVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');

  // Form management
  const {
    formData,
    isSubmitting,
    updateField,
    resetForm,
    submitForm,
  } = useFormManager(INITIAL_FORM_STATE);

  // Venue data management
  const {
    data: venues,
    isLoading: isLoadingVenues,
    createResource: createVenue,
    refetch: refetchVenues,
  } = useResource('/api/venues/', {
    fetchOnMount: false, // Only fetch when modal opens
  });

  // Fetch venues when modal opens
  useEffect(() => {
    if (isOpen) {
      refetchVenues();
    }
  }, [isOpen]); // Removed refetchVenues from dependencies

  const handleVenueSelectChange = (e) => {
    const value = e.target.value;
    if (value === 'add_new') {
      setIsAddingNewVenue(true);
      updateField('venueID', '');
    } else {
      setIsAddingNewVenue(false);
      updateField('venueID', value);
      setNewVenueName('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      let venueId = formData.venueID;

      // Create new venue if needed
      if (isAddingNewVenue && newVenueName.trim()) {
        const newVenue = await createVenue({ venueName: newVenueName.trim() });
        venueId = newVenue.venueID;

        toast({
          title: 'Venue Created',
          description: `"${newVenueName}" has been added to your venues`,
          status: 'success',
          containerStyle: {
            width: '400px',
            maxWidth: '400px',
          },
        });
      }

      // Prepare show data with proper formatting
      const showData = {
        showName: formData.showName,
        venueID: venueId ? parseInt(venueId) : null,
        showDate: formData.showDate || null,
        showNotes: formData.showNotes || null,
        deadline: formData.deadline || null,
      };

      // Create the show using custom data
      await submitForm(
        '/api/shows/',
        'POST',
        `"${formData.showName}" has been created successfully`,
        showData // Pass the custom data
      );

      // Reset and close
      handleModalClose();
      onShowCreated();

    } catch (error) {
      // Error handling is done in submitForm
      console.error('Show creation failed:', error);
    }
  };

  const handleModalClose = () => {
    resetForm();
    setIsAddingNewVenue(false);
    setNewVenueName('');
    onClose();
  };

  const isFormValid = () => {
    return formData.showName.trim() &&
      (!isAddingNewVenue || newVenueName.trim());
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
        <ModalHeader>Create a New Show</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Show Name</FormLabel>
              <Input
                placeholder=""
                value={formData.showName}
                onChange={(e) => updateField('showName', e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Venue</FormLabel>
              <VStack align="stretch" spacing={3}>
                <Select
                  placeholder={isLoadingVenues ? "Loading venues..." : "Select a Venue"}
                  value={isAddingNewVenue ? 'add_new' : formData.venueID}
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
                    placeholder=""
                    value={newVenueName}
                    onChange={(e) => setNewVenueName(e.target.value)}
                  />
                )}
              </VStack>
            </FormControl>

            <FormControl>
              <FormLabel>Show Date</FormLabel>
              <Input
                type="date"
                value={formData.showDate}
                onChange={(e) => updateField('showDate', e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Deadline</FormLabel>
              <Input
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => updateField('deadline', e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Input
                placeholder=""
                value={formData.showNotes}
                onChange={(e) => updateField('showNotes', e.target.value)}
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
            Create Show
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