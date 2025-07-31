// frontend/src/features/script/components/modals/DuplicateElementModal.tsx

import React, { useEffect } from 'react';
import {
    VStack,
    FormControl,
    FormLabel,
    Text,
    HStack
} from '@chakra-ui/react';
import { BaseModal } from '../../../../components/base/BaseModal';
import { FormInput } from '../../../../components/form/FormField';
import { useValidatedForm } from '../../../../hooks/useValidatedForm';
import { ValidationRules, FormValidationConfig } from '../../../../types/validation';
import { msToMMSS, mmssToMs } from '../../../../utils/timeUtils';

interface DuplicateElementFormData {
    description: string;
    timeOffsetInput: string;
}

interface DuplicateElementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (description: string, timeOffsetMs: number) => void;
    originalElementName: string;
    originalTimeOffset: number;
    isProcessing?: boolean;
}

const VALIDATION_CONFIG: FormValidationConfig = {
    description: {
        required: true,
        rules: [
            ValidationRules.minLength(3, 'Description must be at least 3 characters'),
            ValidationRules.maxLength(200, 'Description must be no more than 200 characters')
        ]
    },
    timeOffsetInput: {
        required: true,
        rules: [
            {
                validator: (value: string) => {
                    const timePattern = /^(\d{1,2}):([0-5]\d)$/;
                    return timePattern.test(value);
                },
                message: 'Time must be in MM:SS format (e.g., 5:30)',
                code: 'INVALID_TIME_FORMAT'
            }
        ]
    }
};

// Helper functions moved to shared utils

export const DuplicateElementModal: React.FC<DuplicateElementModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    originalElementName,
    originalTimeOffset,
    isProcessing = false
}) => {
    const form = useValidatedForm<DuplicateElementFormData>(
        {
            description: `${originalElementName} (Copy)`,
            timeOffsetInput: msToMMSS(originalTimeOffset)
        },
        {
            validationConfig: VALIDATION_CONFIG,
            validateOnChange: true,
            validateOnBlur: true,
            showFieldErrorsInToast: false
        }
    );

    // Update form when modal opens with new data
    useEffect(() => {
        if (isOpen) {
            form.setFormData({
                description: `${originalElementName} (Copy)`,
                timeOffsetInput: msToMMSS(originalTimeOffset)
            });
        }
    }, [isOpen, originalElementName, originalTimeOffset, form.setFormData]);

    const handleSubmit = () => {
        if (form.isValid && !isProcessing) {
            const timeOffsetMs = mmssToMs(form.formData.timeOffsetInput);
            onConfirm(form.formData.description, timeOffsetMs);
        }
    };

    const canSubmit = form.isValid && !isProcessing;

    return (
        <BaseModal
            title="Duplicate Script Element"
            isOpen={isOpen}
            onClose={onClose}
            primaryAction={{
                label: "Duplicate",
                variant: "primary",
                onClick: handleSubmit,
                isDisabled: !canSubmit,
                isLoading: isProcessing,
                loadingText: "Duplicating..."
            }}
            secondaryAction={{
                label: "Cancel",
                variant: "secondary",
                onClick: onClose
            }}
            validationErrors={form.fieldErrors}
            showValidationErrors={form.fieldErrors.length > 0}
            errorBoundaryContext="DuplicateElementModal"
        >
            <VStack spacing={4} align="stretch">
                <FormInput
                    form={form}
                    name="description"
                    label="Description"
                    placeholder="Enter description for the duplicated element"
                    isRequired
                />

                <FormControl>
                    <FormLabel>Time Offset</FormLabel>
                    <HStack spacing={4}>
                        <FormInput
                            form={form}
                            name="timeOffsetInput"
                            placeholder="MM:SS"
                            width="100px"
                            isRequired
                        />
                        <Text fontSize="sm" color="gray.500" ml={2}>
                            Format: MM:SS
                        </Text>
                    </HStack>
                </FormControl>
            </VStack>
        </BaseModal>
    );
};
