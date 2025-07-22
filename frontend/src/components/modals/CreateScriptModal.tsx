// frontend/src/components/modals/CreateScriptModal.tsx

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
    Box,
    Text,
} from '@chakra-ui/react';
import { useValidatedForm } from '../../hooks/useValidatedForm';
import { ValidationRules, FormValidationConfig } from '../../types/validation';
import { FormInput } from '../form/FormField';
import { ErrorBoundary } from '../ErrorBoundary';

// TypeScript interfaces
interface ScriptFormData {
    scriptName: string;
    scriptStatus: string;
}

// Script status options
const SCRIPT_STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'COPY', label: 'Copy' },
    { value: 'WORKING', label: 'Working' },
    { value: 'FINAL', label: 'Final' },
    { value: 'BACKUP', label: 'Backup' },
];

interface CreateScriptModalProps {
    isOpen: boolean;
    onClose: () => void;
    showId: string;
    onScriptCreated: () => void;
}

const INITIAL_FORM_STATE: ScriptFormData = {
    scriptName: '',
    scriptStatus: 'DRAFT',
};

const VALIDATION_CONFIG: FormValidationConfig = {
    scriptName: {
        required: false, // Handle required validation manually for button state
        rules: [
            {
                validator: (value: string) => {
                    if (!value || value.trim().length === 0) {
                        return true; // Empty is valid
                    }
                    return value.trim().length >= 4; // Must have 4+ chars if not empty
                },
                message: 'Script name must be at least 4 characters',
                code: 'MIN_LENGTH'
            },
            ValidationRules.maxLength(100, 'Script name must be no more than 100 characters')
        ]
    }
};

export const CreateScriptModal: React.FC<CreateScriptModalProps> = ({
    isOpen,
    onClose,
    showId,
    onScriptCreated
}) => {
    const form = useValidatedForm<ScriptFormData>(INITIAL_FORM_STATE, {
        validationConfig: VALIDATION_CONFIG,
        validateOnBlur: true,
        showFieldErrorsInToast: false // Only show validation errors in red alert box
    });

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            const scriptData = {
                scriptName: form.formData.scriptName,
                scriptStatus: form.formData.scriptStatus
            };

            await form.submitForm(
                `/api/shows/${showId}/scripts/`,
                'POST',
                `"${form.formData.scriptName}" has been created successfully`,
                scriptData
            );

            handleModalClose();
            onScriptCreated();

        } catch (error) {
            // Error handling is done in submitForm
        }
    };

    const handleModalClose = () => {
        form.resetForm();
        onClose();
    };

    const isFormValid = (): boolean => {
        return form.formData.scriptName.trim() !== '';
    };

    return (
        <ErrorBoundary context="CreateScriptModal">
            <Modal isOpen={isOpen} onClose={handleModalClose} onCloseComplete={form.resetForm}>
            <ModalOverlay />
            <ModalContent
                as="form"
                onSubmit={handleSubmit}
                bg="page.background"
                border="2px solid"
                borderColor="gray.600"
            >
                <ModalHeader>Create New Script</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <VStack spacing={4} align="stretch">
                        <FormInput
                            form={form}
                            name="scriptName"
                            label="Script Name"
                            placeholder="Enter script name"
                            isRequired
                        />

                        <FormControl>
                            <FormLabel>Script Status</FormLabel>
                            <Select
                                value={form.formData.scriptStatus}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => form.updateField('scriptStatus', e.target.value)}
                            >
                                {SCRIPT_STATUS_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>

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
                        Create Script
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