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
    Box,
    Text,
} from '@chakra-ui/react';
import { useValidatedForm } from '../../hooks/useValidatedForm';
import { ValidationRules, FormValidationConfig } from '../../types/validation';
import { FormInput } from '../form/FormField';
import { ErrorBoundary } from '../ErrorBoundary';

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

const VALIDATION_CONFIG: FormValidationConfig = {
    venueName: {
        required: false, // Handle required validation manually for button state
        rules: [
            {
                validator: (value: string) => {
                    if (!value || value.trim().length === 0) {
                        return true; // Empty is valid
                    }
                    return value.trim().length >= 4; // Must have 4+ chars if not empty
                },
                message: 'Venue name must be at least 4 characters',
                code: 'MIN_LENGTH'
            },
            ValidationRules.maxLength(100, 'Venue name must be no more than 100 characters')
        ]
    },
    city: {
        required: false,
        rules: [
            ValidationRules.maxLength(50, 'City must be no more than 50 characters')
        ]
    },
    state: {
        required: false,
        rules: [
            ValidationRules.maxLength(2, 'State must be no more than 2 characters')
        ]
    }
};

export const CreateVenueModal: React.FC<CreateVenueModalProps> = ({
    isOpen,
    onClose,
    onVenueCreated
}) => {
    const form = useValidatedForm<VenueFormData>(INITIAL_FORM_STATE, {
        validationConfig: VALIDATION_CONFIG,
        validateOnBlur: true,
        showFieldErrorsInToast: false // Only show validation errors in red alert box
    });

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            const venueData = {
                venueName: form.formData.venueName,
                ...(form.formData.city.trim() && { city: form.formData.city.trim() }),
                ...(form.formData.state.trim() && { state: form.formData.state.trim() }),
            };

            await form.submitForm(
                '/api/me/venues',
                'POST',
                `"${form.formData.venueName}" has been added to your venues`,
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

    const isFormValid = (): boolean => {
        const hasRequiredFields = form.formData.venueName.trim() !== '';
        const hasNoValidationErrors = form.fieldErrors.length === 0;
        return hasRequiredFields && hasNoValidationErrors;
    };

    return (
        <ErrorBoundary context="CreateVenueModal">
            <Modal isOpen={isOpen} onClose={handleModalClose} onCloseComplete={form.resetForm}>
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
                            <FormInput
                                form={form}
                                name="venueName"
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
                                    maxLength={2}
                                />
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
                            isLoading={form.isSubmitting}
                            isDisabled={!isFormValid()}
                            _hover={{ bg: 'orange.400' }}
                        >
                            Create Venue
                        </Button>
                    </ModalFooter>
                    
                    {/* Show form-level validation errors */}
                    {form.fieldErrors.length > 0 && (
                        <Box p={3} bg="red.500" color="white" borderRadius="md" mx={6} mb={6}>
                            <Text fontWeight="semibold" mb={2}>Validation Errors:</Text>
                            {form.fieldErrors.map((error, i) => (
                                <Text key={i} fontSize="sm">
                                    • {error.message}
                                </Text>
                            ))}
                        </Box>
                    )}
                </ModalContent>
            </Modal>
        </ErrorBoundary>
    );
};