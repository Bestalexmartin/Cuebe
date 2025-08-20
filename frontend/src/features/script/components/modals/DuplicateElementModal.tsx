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
import { useValidatedFormSchema } from '../../../../components/forms/ValidatedForm';
import { formatTimeOffset, parseTimeToMs } from '../../../../utils/timeUtils';

interface DuplicateElementFormData {
    element_name: string;
    timeOffsetInput: string;
}

interface DuplicateElementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (element_name: string, offset_ms: number) => void;
    originalElementName: string;
    originalTimeOffset: number;
    isProcessing?: boolean;
}


// Helper functions moved to shared utils

export const DuplicateElementModal: React.FC<DuplicateElementModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    originalElementName,
    originalTimeOffset,
    isProcessing = false
}) => {
    const form = useValidatedFormSchema<DuplicateElementFormData>(
        {
            element_name: `${originalElementName} (Copy)`,
            timeOffsetInput: formatTimeOffset(originalTimeOffset) || ''
        },
        'scriptElement',
        'duplicateElement',
        undefined,
        {
            validateOnBlur: true,
            showFieldErrorsInToast: false
        }
    );

    // Update form when modal opens with new data
    useEffect(() => {
        if (isOpen) {
            form.setFormData({
                element_name: `${originalElementName} (Copy)`,
                timeOffsetInput: formatTimeOffset(originalTimeOffset) || ''
            });
        }
    }, [isOpen, originalElementName, originalTimeOffset, form.setFormData]);

    const handleSubmit = () => {
        if (form.isValid && !isProcessing) {
            const timeOffsetMs = parseTimeToMs(form.formData.timeOffsetInput);
            if (timeOffsetMs !== null) {
                onConfirm(form.formData.element_name, timeOffsetMs);
            }
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
                    name="element_name"
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
