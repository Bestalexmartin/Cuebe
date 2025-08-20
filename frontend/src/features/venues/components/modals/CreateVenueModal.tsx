// frontend/src/features/venues/components/modals/CreateVenueModal.tsx

import React from 'react';
import {
    VStack,
    HStack,
} from '@chakra-ui/react';
import { useValidatedFormSchema } from '../../../../components/forms/ValidatedForm';
import { FormInput } from '../../../../components/form/FormField';
import { BaseModal } from '../../../../components/base/BaseModal';
import { useStandardFormValidation } from '../../../../hooks/useFormValidation';

// TypeScript interfaces
interface VenueFormData {
    venue_name: string;
    city: string;
    state: string;
}

interface CreateVenueModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVenueCreated: () => void;
}

const INITIAL_FORM_STATE: VenueFormData = {
    venue_name: '',
    city: '',
    state: '',
};


export const CreateVenueModal: React.FC<CreateVenueModalProps> = ({
    isOpen,
    onClose,
    onVenueCreated
}) => {
    const form = useValidatedFormSchema<VenueFormData>(
        INITIAL_FORM_STATE,
        'venue',
        'venue',
        undefined,
        {
            validateOnBlur: true,
            showFieldErrorsInToast: false // Only show validation errors in red alert box
        }
    );

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            const venueData = {
                venue_name: form.formData.venue_name,
                ...(form.formData.city.trim() && { city: form.formData.city.trim() }),
                ...(form.formData.state.trim() && { state: form.formData.state.trim() }),
            };

            await form.submitForm(
                '/api/me/venues',
                'POST',
                `"${form.formData.venue_name}" has been added to your venues`,
                venueData
            );

            handleModalClose();
            onVenueCreated();

        } catch (error) {
            // Error handling is done in submitForm
        }
    };

    const handleModalClose = () => {
        form.resetForm();
        onClose();
    };

    const { canSubmit } = useStandardFormValidation(form, ['venue_name']);

    return (
        <BaseModal
            title="Create New Venue"
            isOpen={isOpen}
            onClose={handleModalClose}
            onCloseComplete={form.resetForm}
            onSubmit={handleSubmit}
            primaryAction={{
                label: "Create Venue",
                variant: "primary",
                onClick: () => handleSubmit({} as React.FormEvent<HTMLFormElement>),
                isLoading: form.isSubmitting,
                isDisabled: !canSubmit
            }}
            validationErrors={form.fieldErrors}
            showValidationErrors={form.fieldErrors.length > 0}
            errorBoundaryContext="CreateVenueModal"
        >
            <VStack spacing={4} align="stretch">
                <FormInput
                    form={form}
                    name="venue_name"
                    label="Venue Name"
                    placeholder="Enter venue name"
                    isRequired
                />

                <HStack spacing={4}>
                    <FormInput
                        form={form}
                        name="city"
                        label="City"
                        placeholder="Enter city"
                    />

                    <FormInput
                        form={form}
                        name="state"
                        label="State"
                        placeholder="CA"
                    />
                </HStack>
            </VStack>
        </BaseModal>
    );
};
