// frontend/src/features/script/components/modals/DuplicateScriptModal.tsx

import React, { useEffect } from 'react';
import {
    FormControl,
    FormLabel,
    Select,
    VStack,
} from '@chakra-ui/react';
import { useValidatedForm } from '../../../../hooks/useValidatedForm';
import { ValidationRules, FormValidationConfig } from '../../../../types/validation';
import { FormInput } from '../../../../components/form/FormField';
import { BaseModal } from '../../../../components/base/BaseModal';
import { useStandardFormValidation } from '../../../../hooks/useFormValidation';
import { SCRIPT_STATUS_OPTIONS } from '../../constants';

// TypeScript interfaces
interface ScriptFormData {
    scriptName: string;
    scriptStatus: string;
}


interface DuplicateScriptModalProps {
    isOpen: boolean;
    onClose: () => void;
    showId: string;
    scriptId: string;
    originalScriptName: string;
    onScriptDuplicated: (newScriptId: string) => void;
    onProcessingStart: () => void;
    onError?: () => void;
}

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

export const DuplicateScriptModal: React.FC<DuplicateScriptModalProps> = ({
    isOpen,
    onClose,
    showId,
    scriptId,
    originalScriptName,
    onScriptDuplicated,
    onProcessingStart,
    onError
}) => {
    // Create initial form state with pre-populated values
    const getInitialFormState = (): ScriptFormData => ({
        scriptName: `${originalScriptName} copy`,
        scriptStatus: 'COPY',
    });

    const form = useValidatedForm<ScriptFormData>(getInitialFormState(), {
        validationConfig: VALIDATION_CONFIG,
        validateOnBlur: true,
        showFieldErrorsInToast: false // Only show validation errors in red alert box
    });

    // Update form when originalScriptName changes
    useEffect(() => {
        const newFormState = getInitialFormState();
        form.setFormData(newFormState);
    }, [originalScriptName, form.setFormData]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // Close this modal and show processing modal
        handleModalClose();
        onProcessingStart();

        try {
            const scriptData = {
                scriptName: form.formData.scriptName,
                scriptStatus: form.formData.scriptStatus
            };

            const response = await form.submitForm(
                `/api/scripts/${scriptId}/duplicate`,
                'POST',
                `"${form.formData.scriptName}" has been duplicated successfully`,
                scriptData
            );

            // Extract the new script ID from the response
            const newScriptId = response?.scriptID;
            if (!newScriptId) {
                throw new Error('Script ID not returned from server');
            }

            onScriptDuplicated(newScriptId);

        } catch (error) {
            // Error handling is done in submitForm
            if (onError) {
                onError();
            }
        }
    };

    const handleModalClose = () => {
        // Reset form to initial state (with pre-populated values)
        form.setFormData(getInitialFormState());
        onClose();
    };

    const { canSubmit } = useStandardFormValidation(form, ['scriptName']);

    return (
        <BaseModal
            title="Duplicate Script"
            isOpen={isOpen}
            onClose={handleModalClose}
            onCloseComplete={() => form.setFormData(getInitialFormState())}
            onSubmit={handleSubmit}
            primaryAction={{
                label: "Duplicate Script",
                variant: "primary",
                onClick: () => handleSubmit({} as React.FormEvent<HTMLFormElement>),
                isLoading: form.isSubmitting,
                isDisabled: !canSubmit
            }}
            validationErrors={form.fieldErrors}
            showValidationErrors={form.fieldErrors.length > 0}
            errorBoundaryContext="DuplicateScriptModal"
        >
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
        </BaseModal>
    );
};
