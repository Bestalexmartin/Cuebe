// frontend/src/components/modals/CreateShowModal.tsx

import React, { useState, useEffect } from 'react';
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
import { toastConfig } from '../../ChakraTheme';
import { useFormManager } from '../../hooks/useFormManager';
import { useResource } from '../../hooks/useResource';
import { convertLocalToUTC } from '../../utils/dateTimeUtils';

// TypeScript interfaces
interface Venue {
  venueID: string;
  venueName: string;
}

interface ShowFormData {
  showName: string;
  venueID: string;
  showDate: string;
  showNotes: string;
  deadline: string;
}

interface CreateShowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowCreated: () => void;
}

const INITIAL_FORM_STATE: ShowFormData = {
  showName: '',
  venueID: '',
  showDate: '',
  showNotes: '',
  deadline: '',
};

export const CreateShowModal: React.FC<CreateShowModalProps> = ({ 
  isOpen, 
  onClose, 
  onShowCreated 
}) => {
  const toast = useToast();
  const [isAddingNewVenue, setIsAddingNewVenue] = useState<boolean>(false);
  const [newVenueName, setNewVenueName] = useState<string>('');

  // Form management
  const {
    formData,
    isSubmitting,
    updateField,
    resetForm,
    submitForm,
  } = useFormManager<ShowFormData>(INITIAL_FORM_STATE);

  // Venue data management
  const {
    data: venues,
    isLoading: isLoadingVenues,
    createResource: createVenue,
    refetch: refetchVenues,
  } = useResource<Venue[]>('/api/me/venues', {
    fetchOnMount: false,
  });

  useEffect(() => {
    if (isOpen) {
      refetchVenues();
    }
  }, [isOpen]); // Removed refetchVenues from dependencies to prevent infinite loop

  const handleVenueSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      let venueId = formData.venueID;

      if (isAddingNewVenue && newVenueName.trim()) {
        const newVenue = await createVenue({ venueName: newVenueName.trim() });
        venueId = newVenue.venueID;

        toast({
          title: 'Venue Created',
          description: `"${newVenueName}" has been added to your venues`,
          status: 'success',
          ...toastConfig,
        });
      }

      const showData = {
        showName: formData.showName,
        venueID: venueId || null,
        showDate: convertLocalToUTC(formData.showDate),
        showNotes: formData.showNotes || null,
        deadline: convertLocalToUTC(formData.deadline),
      };

      await submitForm(
        '/api/shows/',
        'POST',
        `"${formData.showName}" has been created successfully`,
        showData
      );

      handleModalClose();
      onShowCreated();

    } catch (error) {
      // Error handling is done in submitForm
    }
  };

  const handleModalClose = () => {
    resetForm();
    setIsAddingNewVenue(false);
    setNewVenueName('');
    onClose();
  };

  const isFormValid = (): boolean => {
    return formData.showName.trim() !== '' &&
      (!isAddingNewVenue || newVenueName.trim() !== '');
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
        <ModalHeader>Create New Show</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Show Name</FormLabel>
              <Input
                placeholder="Enter show name"
                value={formData.showName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('showName', e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Venue</FormLabel>
              <VStack align="stretch" spacing={3}>
                <Select
                  placeholder={isLoadingVenues ? "Loading venues..." : "Select venue"}
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
                    placeholder="Enter venue name"
                    value={newVenueName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewVenueName(e.target.value)}
                  />
                )}
              </VStack>
            </FormControl>

            <FormControl>
              <FormLabel>Show Date</FormLabel>
              <Input
                type="datetime-local"
                value={formData.showDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('showDate', e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Script Deadline</FormLabel>
              <Input
                type="datetime-local"
                value={formData.deadline}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('deadline', e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Input
                placeholder="Additional notes about this show"
                value={formData.showNotes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('showNotes', e.target.value)}
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            size="xs"
            mr={3}
            onClick={handleModalClose}
            _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
          >
            Cancel
          </Button>
          <Button
            bg="blue.400"
            color="white"
            size="xs"
            type="submit"
            isLoading={isSubmitting}
            isDisabled={!isFormValid()}
            _hover={{ bg: 'orange.400' }}
          >
            Create Show
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};