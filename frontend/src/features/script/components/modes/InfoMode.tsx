// frontend/src/features/script/components/modes/InfoMode.tsx

import React from 'react';
import { VStack, HStack, FormControl, FormLabel, Input, Select, Textarea, FormErrorMessage } from '@chakra-ui/react';
import { useValidatedForm } from '../../../../hooks/useValidatedForm';
import { SCRIPT_STATUS_OPTIONS } from '../../constants';

interface ScriptFormData {
    script_name: string;
    script_status: string;
    start_time: string;
    end_time: string;
    script_notes: string;
}

interface InfoModeProps {
    form: ReturnType<typeof useValidatedForm<ScriptFormData>>;
}


export const InfoMode: React.FC<InfoModeProps> = ({ form }) => {
    return (
        <VStack spacing={4} align="stretch" width="100%">
            <FormControl isRequired isInvalid={!!form.getFieldError('script_name')}>
                <FormLabel>Script Name</FormLabel>
                <Input
                    value={form.formData.script_name}
                    onChange={(e) => form.updateField('script_name', e.target.value)}
                    onBlur={() => form.validateField('script_name')}
                    placeholder="Enter script name"
                />
                <FormErrorMessage>
                    {form.getFieldError('script_name')?.message}
                </FormErrorMessage>
            </FormControl>

            <FormControl>
                <FormLabel>Script Status</FormLabel>
                <Select
                    value={form.formData.script_status}
                    onChange={(e) => form.updateField('script_status', e.target.value)}
                >
                    {SCRIPT_STATUS_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>
            </FormControl>

            {/* Time fields side-by-side */}
            <HStack spacing={4}>
                <FormControl>
                    <FormLabel>Start Time</FormLabel>
                    <Input
                        type="datetime-local"
                        value={form.formData.start_time}
                        onChange={(e) => form.updateField('start_time', e.target.value)}
                        placeholder="Select start time"
                    />
                </FormControl>
                <FormControl>
                    <FormLabel>End Time</FormLabel>
                    <Input
                        type="datetime-local"
                        value={form.formData.end_time}
                        onChange={(e) => form.updateField('end_time', e.target.value)}
                        placeholder="Select end time"
                    />
                </FormControl>
            </HStack>

            <FormControl isInvalid={!!form.getFieldError('script_notes')}>
                <FormLabel>Notes</FormLabel>
                <Textarea
                    value={form.formData.script_notes}
                    onChange={(e) => form.updateField('script_notes', e.target.value)}
                    onBlur={() => form.validateField('script_notes')}
                    placeholder="Script notes or special instructions..."
                    minHeight="120px"
                    resize="vertical"
                />
                <FormErrorMessage>
                    {form.getFieldError('script_notes')?.message}
                </FormErrorMessage>
            </FormControl>
        </VStack>
    );
};
