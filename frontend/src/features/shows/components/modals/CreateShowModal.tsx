// frontend/src/features/shows/components/modals/CreateShowModal.tsx

import React, { useState, useEffect } from 'react';
import {
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  Textarea,
} from '@chakra-ui/react';
import { useValidatedForm } from '../../../../hooks/useValidatedForm';
import { ValidationRules, FormValidationConfig } from '../../../../types/validation';
import { FormInput } from '../../../../components/form/FormField';
import { BaseModal } from '../../../../components/base/BaseModal';
import { useStandardFormValidation } from '../../../../hooks/useFormValidation';
import { useResource } from '../../../../hooks/useResource';
import { convertLocalToUTC } from '../../../../utils/dateTimeUtils';

// TypeScript interfaces
interface Venue {
  venue_id: string;
  venue_name: string;
}

interface ShowFormData {
  show_name: string;
  venue_id: string;
  show_date: string;
  show_notes: string;
  deadline: string;
}

interface CreateShowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowCreated: () => void;
}

const INITIAL_FORM_STATE: ShowFormData = {
  show_name: '',
  venue_id: '',
  show_date: '',
  show_notes: '',
  deadline: '',
};

const VALIDATION_CONFIG: FormValidationConfig = {
  show_name: {
    required: false, // Handle required validation manually for button state
    rules: [
      {
        validator: (value: string) => {
          if (!value || value.trim().length === 0) {
            return true; // Empty is valid
          }
          return value.trim().length >= 4; // Must have 4+ chars if not empty
        },
        message: 'Show name must be at least 4 characters',
        code: 'MIN_LENGTH'
      },
      ValidationRules.maxLength(100, 'Show name must be no more than 100 characters')
    ]
  },
  show_notes: {
    required: false,
    rules: [
      ValidationRules.maxLength(500, 'Notes must be no more than 500 characters')
    ]
  },
  show_date: {
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
      form.updateField('venue_id', '');
    } else {
      setIsAddingNewVenue(false);
      form.updateField('venue_id', value);
      setNewVenueName('');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      let venueId = form.formData.venue_id;

      if (isAddingNewVenue && newVenueName.trim()) {
        const newVenue = await createVenue({ venue_name: newVenueName.trim() });
        venueId = newVenue.venue_id;
      }

      const showData = {
        show_name: form.formData.show_name,
        venue_id: venueId || null,
        show_date: convertLocalToUTC(form.formData.show_date),
        show_notes: form.formData.show_notes || null,
        deadline: convertLocalToUTC(form.formData.deadline),
      };

      await form.submitForm(
        '/api/shows/',
        'POST',
        `"${form.formData.show_name}" has been created successfully`,
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

  const { canSubmit } = useStandardFormValidation(form, ['show_name']);

  return (
    <BaseModal
      title="Create New Show"
      isOpen={isOpen}
      onClose={handleModalClose}
      onCloseComplete={form.resetForm}
      onSubmit={handleSubmit}
      primaryAction={{
        label: "Create Show",
        variant: "primary",
        onClick: () => handleSubmit({} as React.FormEvent<HTMLFormElement>),
        isLoading: form.isSubmitting,
        isDisabled: !canSubmit
      }}
      validationErrors={form.fieldErrors}
      showValidationErrors={form.fieldErrors.length > 0}
      errorBoundaryContext="CreateShowModal"
    >
      <VStack spacing={4} align="stretch">
        <FormInput
          form={form}
          name="show_name"
          label="Show Name"
          placeholder="Enter show name"
          isRequired
        />

        <FormControl>
          <FormLabel>Venue</FormLabel>
          <VStack align="stretch" spacing={3}>
            <Select
              placeholder={isLoadingVenues ? "Loading venues..." : "Select venue"}
              value={isAddingNewVenue ? 'add_new' : form.formData.venue_id}
              onChange={handleVenueSelectChange}
              disabled={isLoadingVenues}
            >
              {venues?.map((venue) => (
                <option key={venue.venue_id} value={venue.venue_id}>
                  {venue.venue_name}
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
          name="show_date"
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
            value={form.formData.show_notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => form.updateField('show_notes', e.target.value)}
            onBlur={() => form.validateField('show_notes')}
            rows={2}
            resize="vertical"
          />
        </FormControl>
      </VStack>
    </BaseModal>
  );
};
