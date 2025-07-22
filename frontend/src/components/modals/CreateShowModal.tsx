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
  Box,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { useValidatedForm } from '../../hooks/useValidatedForm';
import { ValidationRules, FormValidationConfig } from '../../types/validation';
import { FormInput } from '../form/FormField';
import { ErrorBoundary } from '../ErrorBoundary';
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

const VALIDATION_CONFIG: FormValidationConfig = {
  showName: {
    required: false, // Handle required validation manually for button state
    rules: [
      ValidationRules.minLength(2, 'Show name must be at least 2 characters'),
      ValidationRules.maxLength(100, 'Show name must be no more than 100 characters')
    ]
  },
  showNotes: {
    required: false,
    rules: [
      ValidationRules.maxLength(500, 'Notes must be no more than 500 characters')
    ]
  },
  showDate: {
    required: false,
    rules: []
  },
  deadline: {
    required: false,
    rules: []
  }
};

export const CreateShowModal: React.FC<CreateShowModalProps> = ({
  isOpen,
  onClose,
  onShowCreated
}) => {
  const [isAddingNewVenue, setIsAddingNewVenue] = useState<boolean>(false);
  const [newVenueName, setNewVenueName] = useState<string>('');

  // Form management
  const form = useValidatedForm<ShowFormData>(INITIAL_FORM_STATE, {
    validationConfig: VALIDATION_CONFIG,
    validateOnBlur: true,
    showFieldErrorsInToast: false // Only show validation errors in red alert box
  });

  // Venue data management
  const {
    data: venues,
    isLoading: isLoadingVenues,
    createResource: createVenue,
    refetch: refetchVenues,
  } = useResource<Venue>('/api/me/venues', {
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
      form.updateField('venueID', '');
    } else {
      setIsAddingNewVenue(false);
      form.updateField('venueID', value);
      setNewVenueName('');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      let venueId = form.formData.venueID;

      if (isAddingNewVenue && newVenueName.trim()) {
        const newVenue = await createVenue({ venueName: newVenueName.trim() });
        venueId = newVenue.venueID;
      }

      const showData = {
        showName: form.formData.showName,
        venueID: venueId || null,
        showDate: convertLocalToUTC(form.formData.showDate),
        showNotes: form.formData.showNotes || null,
        deadline: convertLocalToUTC(form.formData.deadline),
      };

      await form.submitForm(
        '/api/shows/',
        'POST',
        `"${form.formData.showName}" has been created successfully`,
        showData
      );

      handleModalClose();
      onShowCreated();

    } catch (error) {
      // Error handling is done in submitForm
    }
  };

  const handleModalClose = () => {
    form.resetForm();
    setIsAddingNewVenue(false);
    setNewVenueName('');
    onClose();
  };

  const isFormValid = (): boolean => {
    return form.formData.showName.trim() !== '' &&
      (!isAddingNewVenue || newVenueName.trim() !== '');
  };

  return (
    <ErrorBoundary context="CreateShowModal">
      <Modal isOpen={isOpen} onClose={handleModalClose} onCloseComplete={form.resetForm}>
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
            <FormInput
              form={form}
              name="showName"
              label="Show Name"
              placeholder="Enter show name"
              isRequired
            />

            <FormControl>
              <FormLabel>Venue</FormLabel>
              <VStack align="stretch" spacing={3}>
                <Select
                  placeholder={isLoadingVenues ? "Loading venues..." : "Select venue"}
                  value={isAddingNewVenue ? 'add_new' : form.formData.venueID}
                  onChange={handleVenueSelectChange}
                  disabled={isLoadingVenues}
                >
                  {venues?.map((venue) => (
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

            <FormInput
              form={form}
              name="showDate"
              label="Show Date"
              type="datetime-local"
            />

            <FormInput
              form={form}
              name="deadline"
              label="Script Deadline"
              type="datetime-local"
            />

            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea
                placeholder="Additional notes about this show"
                value={form.formData.showNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => form.updateField('showNotes', e.target.value)}
                onBlur={() => form.validateField('showNotes')}
                rows={2}
                resize="vertical"
              />
            </FormControl>

            {/* Show form-level validation errors */}
            {form.fieldErrors.length > 0 && (
              <Box p={3} bg="red.500" color="white" borderRadius="md">
                <Text fontWeight="semibold">Validation Errors:</Text>
                {form.fieldErrors.map((error, i) => (
                  <Text key={i} fontSize="sm">
                    • {error.field}: {error.message}
                  </Text>
                ))}
              </Box>
            )}
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
            isLoading={form.isSubmitting}
            isDisabled={!isFormValid()}
            _hover={{ bg: 'orange.400' }}
          >
            Create Show
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
    </ErrorBoundary>
  );
};