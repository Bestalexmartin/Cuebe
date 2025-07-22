// frontend/src/components/modals/CreateCrewModal.tsx

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
    Select,
    VStack,
    HStack,
    Box,
    Text,
} from '@chakra-ui/react';
import { useAuth } from '@clerk/clerk-react';
import { useValidatedForm } from '../../hooks/useValidatedForm';
import { ValidationRules, FormValidationConfig } from '../../types/validation';
import { FormInput } from '../form/FormField';
import { ErrorBoundary } from '../ErrorBoundary';

// TypeScript interfaces
interface CrewFormData {
    emailAddress: string;
    fullnameFirst: string;
    fullnameLast: string;
    userRole: string;
}

interface CreateCrewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCrewCreated: () => void;
}

interface RoleOption {
    value: string;
    label: string;
}

interface ExistingUser {
    ID: string;
    fullnameFirst: string;
    fullnameLast: string;
}

const INITIAL_FORM_STATE: CrewFormData = {
    emailAddress: '',
    fullnameFirst: '',
    fullnameLast: '',
    userRole: 'crew',
};

const VALIDATION_CONFIG: FormValidationConfig = {
    emailAddress: {
        required: false, // Handle required validation manually for button state
        rules: [
            ValidationRules.email('Please enter a valid email address')
        ]
    },
    fullnameFirst: {
        required: false, // Handle required validation manually for button state
        rules: [
            ValidationRules.minLength(2, 'First name must be at least 2 characters'),
            ValidationRules.maxLength(50, 'First name must be no more than 50 characters')
        ]
    },
    fullnameLast: {
        required: false, // Handle required validation manually for button state
        rules: [
            ValidationRules.minLength(2, 'Last name must be at least 2 characters'),
            ValidationRules.maxLength(50, 'Last name must be no more than 50 characters')
        ]
    }
};

const ROLE_OPTIONS: RoleOption[] = [
    { value: 'crew', label: 'Crew Member' },
    { value: 'department_head', label: 'Department Head' },
    { value: 'stage_manager', label: 'Stage Manager' },
    { value: 'assistant_stage_manager', label: 'Assistant Stage Manager' },
    { value: 'director', label: 'Director' },
    { value: 'producer', label: 'Producer' },
    { value: 'designer', label: 'Designer' },
    { value: 'technician', label: 'Technician' },
    { value: 'admin', label: 'Administrator' },
];

export const CreateCrewModal: React.FC<CreateCrewModalProps> = ({
    isOpen,
    onClose,
    onCrewCreated
}) => {
    const { getToken } = useAuth();

    const form = useValidatedForm<CrewFormData>(INITIAL_FORM_STATE, {
        validationConfig: VALIDATION_CONFIG,
        validateOnBlur: true,
        showFieldErrorsInToast: false // Only show validation errors in red alert box
    });

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            const checkEmailResponse = await fetch(`/api/users/check-email?email=${encodeURIComponent(form.formData.emailAddress)}`, {
                headers: {
                    'Authorization': `Bearer ${await getToken()}`
                }
            });

            if (checkEmailResponse.ok) {
                const existingUser: ExistingUser | null = await checkEmailResponse.json();

                if (existingUser) {
                    const relationshipData = {
                        crew_user_id: existingUser.ID
                    };

                    await submitForm(
                        '/api/crew-relationships/',
                        'POST',
                        `"${existingUser.fullnameFirst} ${existingUser.fullnameLast}" has been added to your crew`,
                        relationshipData
                    );
                } else {
                    const userData = {
                        emailAddress: form.formData.emailAddress,
                        fullnameFirst: form.formData.fullnameFirst,
                        fullnameLast: form.formData.fullnameLast,
                        userRole: form.formData.userRole,
                    };

                    await form.submitForm(
                        '/api/users/create-guest-with-relationship',
                        'POST',
                        `"${form.formData.fullnameFirst} ${form.formData.fullnameLast}" has been added as a guest user`,
                        userData
                    );
                }
            } else {
                throw new Error('Failed to check for existing user');
            }

            handleModalClose();
            onCrewCreated();

        } catch (error) {
            // Error handling is done in submitForm
        }
    };

    const handleModalClose = () => {
        form.resetForm();
        onClose();
    };

    const isFormValid = (): boolean => {
        const hasRequiredFields = form.formData.emailAddress.trim() !== '' &&
            form.formData.fullnameFirst.trim() !== '' &&
            form.formData.fullnameLast.trim() !== '';
        
        const hasNoValidationErrors = form.fieldErrors.length === 0;
        
        return hasRequiredFields && hasNoValidationErrors;
    };

    return (
        <Modal isOpen={isOpen} onClose={handleModalClose} onCloseComplete={form.resetForm}>
            <ModalOverlay />
            <ModalContent
                as="form"
                onSubmit={handleSubmit}
                bg="page.background"
                border="2px solid"
                borderColor="gray.600"
            >
                <ModalHeader>Add New Crew</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <VStack spacing={4} align="stretch">
                        <HStack spacing={4}>
                            <FormInput
                                form={form}
                                name="fullnameFirst"
                                label="First Name"
                                placeholder="Enter first name"
                                isRequired
                            />

                            <FormInput
                                form={form}
                                name="fullnameLast"
                                label="Last Name"
                                placeholder="Enter last name"
                                isRequired
                            />
                        </HStack>

                        <FormInput
                            form={form}
                            name="emailAddress"
                            label="Email Address"
                            type="email"
                            placeholder="crew@example.com"
                            isRequired
                        />

                        <FormControl isRequired>
                            <FormLabel>Role</FormLabel>
                            <Select
                                value={form.formData.userRole}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => form.updateField('userRole', e.target.value)}
                            >
                                {ROLE_OPTIONS.map((role) => (
                                    <option key={role.value} value={role.value}>
                                        {role.label}
                                    </option>
                                ))}
                            </Select>
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
                        Add Crew
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};