// frontend/src/features/shows/components/modals/CreateScriptModal.tsx

import React from 'react';
import {
    FormControl,
    FormLabel,
    Select,
    VStack,
} from '@chakra-ui/react';
import { FormInput } from '../../../../components/form/FormField';
import { BaseModal } from '../../../../components/base/BaseModal';
import { useStandardFormValidation } from '../../../../hooks/useFormValidation';
import { useValidatedFormSchema } from '../../../../components/forms/ValidatedForm';
import { SCRIPT_STATUS_OPTIONS } from '../../../script/constants';

// TypeScript interfaces
interface ScriptFormData {
    script_name: string;
    script_status: string;
}


interface CreateScriptModalProps {
    isOpen: boolean;
    onClose: () => void;
    showId: string;
    onScriptCreated: () => void;
    onImportRequest?: (scriptName: string) => void;
}

const INITIAL_FORM_STATE: ScriptFormData = {
    script_name: '',
    script_status: 'DRAFT',
};


export const CreateScriptModal: React.FC<CreateScriptModalProps> = ({
    isOpen,
    onClose,
    showId,
    onScriptCreated
}) => {
    
    const form = useValidatedFormSchema<ScriptFormData>(
        INITIAL_FORM_STATE,
        'show',
        'script',
        undefined,
        {
            validateOnBlur: true,
            showFieldErrorsInToast: false // Only show validation errors in red alert box
        }
    );

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            const scriptData = {
                script_name: form.formData.script_name,
                script_status: form.formData.script_status
            };

            await form.submitForm(
                `/api/shows/${showId}/scripts/`,
                'POST',
                `"${form.formData.script_name}" has been created successfully`,
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

    const { canSubmit } = useStandardFormValidation(form, ['script_name']);

    return (
        <>
        <BaseModal
            title="Create New Script"
            isOpen={isOpen}
            onClose={handleModalClose}
            onCloseComplete={form.resetForm}
            onSubmit={handleSubmit}
            secondaryAction={{
                label: "Cancel",
                variant: "secondary",
                onClick: handleModalClose
            }}
            primaryAction={{
                label: "Create Script",
                variant: "primary",
                isLoading: form.isSubmitting,
                isDisabled: !canSubmit,
                onClick: () => {}
            }}
            validationErrors={form.fieldErrors}
            showValidationErrors={form.fieldErrors.length > 0}
            errorBoundaryContext="CreateScriptModal"
        >
            <VStack spacing={4} align="stretch">
                <FormInput
                    form={form}
                    name="script_name"
                    label="Script Name"
                    placeholder="Enter script name"
                    isRequired
                />

                <FormControl>
                    <FormLabel>Script Status</FormLabel>
                    <Select
                        value={form.formData.script_status}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => form.updateField('script_status', e.target.value)}
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
        </>
    );
};
