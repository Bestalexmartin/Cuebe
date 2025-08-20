// frontend/src/features/script/components/modes/InfoMode.tsx

import React from 'react';
import { VStack, HStack } from '@chakra-ui/react';
import { useValidatedFormSchema } from '../../../../components/forms/ValidatedForm';
import { SCRIPT_STATUS_OPTIONS } from '../../constants';
import { EditPageFormField } from '../../../../components/base/EditPageFormField';

interface ScriptFormData {
    script_name: string;
    script_status: string;
    start_time: string;
    end_time: string;
    script_notes: string;
}

interface InfoModeProps {
    form: ReturnType<typeof useValidatedFormSchema<ScriptFormData>>;
}


export const InfoMode: React.FC<InfoModeProps> = ({ form }) => {
    return (
        <VStack spacing={4} align="stretch" width="100%">
            <EditPageFormField
                type="input"
                label="Script Name"
                value={form.formData.script_name}
                onChange={(value) => form.updateField('script_name', value)}
                onBlur={() => form.validateField('script_name')}
                placeholder="Enter script name"
                isRequired
            />

            <EditPageFormField
                type="select"
                label="Script Status"
                value={form.formData.script_status}
                onChange={(value) => form.updateField('script_status', value)}
                options={SCRIPT_STATUS_OPTIONS}
            />

            {/* Time fields side-by-side */}
            <HStack spacing={4}>
                <EditPageFormField
                    type="input"
                    inputType="datetime-local"
                    label="Start Time"
                    value={form.formData.start_time}
                    onChange={(value) => form.updateField('start_time', value)}
                    placeholder="Select start time"
                />
                <EditPageFormField
                    type="input"
                    inputType="datetime-local"
                    label="End Time"
                    value={form.formData.end_time}
                    onChange={(value) => form.updateField('end_time', value)}
                    placeholder="Select end time"
                />
            </HStack>

            <EditPageFormField
                type="textarea"
                label="Notes"
                value={form.formData.script_notes}
                onChange={(value) => form.updateField('script_notes', value)}
                onBlur={() => form.validateField('script_notes')}
                placeholder="Script notes or special instructions..."
                minHeight="120px"
            />
        </VStack>
    );
};
