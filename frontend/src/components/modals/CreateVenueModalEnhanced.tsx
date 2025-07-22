// frontend/src/components/modals/CreateVenueModalEnhanced.tsx

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
    VStack,
    HStack,
    Alert,
    AlertIcon,
    AlertDescription,
    Box
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

interface CreateVenueModalEnhancedProps {
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
        required: true,
        rules: [
            ValidationRules.minLength(2, 'Venue name must be at least 2 characters'),
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
            ValidationRules.maxLength(50, 'State must be no more than 50 characters')
        ]
    }
};

export const CreateVenueModalEnhanced: React.FC<CreateVenueModalEnhancedProps> = ({
    isOpen,
    onClose,
    onVenueCreated
}) => {
    const form = useValidatedForm<VenueFormData>(INITIAL_FORM_STATE, {
        validationConfig: VALIDATION_CONFIG,
        validateOnBlur: true,
        showFieldErrorsInToast: true
    });

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            const venueData = {
                venueName: form.formData.venueName,
                ...(form.formData.city.trim() && { city: form.formData.city.trim() }),
                ...(form.formData.state.trim() && { state: form.formData.state.trim() }),
            };

            await form.submitForm('/api/me/venues', 'POST', 'Venue created successfully!', venueData);
            
            handleClose();
            onVenueCreated();
        } catch (error) {
            // Error is already handled by the form's error handling system
            console.error('Failed to create venue:', error);
        }
    };

    const handleClose = () => {
        form.resetForm();
        onClose();
    };

    return (
        <ErrorBoundary context="CreateVenueModal">
            <Modal isOpen={isOpen} onClose={handleClose} size="md">
                <ModalOverlay />
                <ModalContent>
                    <form onSubmit={handleSubmit}>
                        <ModalHeader>Create New Venue</ModalHeader>
                        <ModalCloseButton />
                        
                        <ModalBody>
                            <VStack spacing={4} align="stretch">
                                {/* Show form-level validation errors */}
                                {form.fieldErrors.length > 0 && (
                                    <Alert status="error" borderRadius="md">
                                        <AlertIcon />
                                        <Box>
                                            <AlertDescription>
                                                Please fix the following errors:
                                                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                                                    {form.fieldErrors.map((error, index) => (
                                                        <li key={index}>{error.field}: {error.message}</li>
                                                    ))}
                                                </ul>
                                            </AlertDescription>
                                        </Box>
                                    </Alert>
                                )}

                                <FormInput
                                    form={form}
                                    name="venueName"
                                    label="Venue Name"
                                    placeholder="Enter venue name"
                                    isRequired
                                />

                                <FormInput
                                    form={form}
                                    name="city"
                                    label="City"
                                    placeholder="Enter city (optional)"
                                    helperText="The city where this venue is located"
                                />

                                <FormInput
                                    form={form}
                                    name="state"
                                    label="State"
                                    placeholder="Enter state (optional)"
                                    helperText="The state where this venue is located"
                                />
                            </VStack>
                        </ModalBody>

                        <ModalFooter>
                            <HStack spacing={2}>
                                <Button 
                                    variant="outline" 
                                    onClick={handleClose}
                                    isDisabled={form.isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    bg="blue.400"
                                    color="white"
                                    _hover={{ bg: 'orange.400' }}
                                    isLoading={form.isSubmitting}
                                    loadingText="Creating..."
                                    isDisabled={!form.isValid && form.fieldErrors.length > 0}
                                >
                                    Create Venue
                                </Button>
                            </HStack>
                        </ModalFooter>
                    </form>
                </ModalContent>
            </Modal>
        </ErrorBoundary>
    );
};