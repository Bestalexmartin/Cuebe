// frontend/src/pages/script/components/modes/InfoMode.tsx

import React from 'react';
import { VStack, FormControl, FormLabel, Input, Select, Textarea } from '@chakra-ui/react';
import { useValidatedForm } from '../../../../hooks/useValidatedForm';

interface ScriptFormData {
    scriptName: string;
    scriptStatus: string;
    startTime: string;
    scriptNotes: string;
}

interface InfoModeProps {
    form: ReturnType<typeof useValidatedForm<ScriptFormData>>;
}

// Script status options - matching the workflow states
const SCRIPT_STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'COPY', label: 'Copy' },
    { value: 'WORKING', label: 'Working' },
    { value: 'FINAL', label: 'Final' },
    { value: 'BACKUP', label: 'Backup' },
];

export const InfoMode: React.FC<InfoModeProps> = ({ form }) => {
    return (
        <VStack spacing={4} align="stretch" width="100%">
            <FormControl isRequired>
                <FormLabel>Script Name</FormLabel>
                <Input
                    value={form.formData.scriptName}
                    onChange={(e) => form.updateField('scriptName', e.target.value)}
                    onBlur={() => form.validateField('scriptName')}
                    placeholder="Enter script name"
                />
            </FormControl>

            <FormControl isRequired>
                <FormLabel>Script Status</FormLabel>
                <Select
                    value={form.formData.scriptStatus}
                    onChange={(e) => form.updateField('scriptStatus', e.target.value)}
                >
                    {SCRIPT_STATUS_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>
            </FormControl>

            <FormControl>
                <FormLabel>Start Time</FormLabel>
                <Input
                    type="datetime-local"
                    value={form.formData.startTime}
                    onChange={(e) => form.updateField('startTime', e.target.value)}
                    placeholder="Select start time"
                />
            </FormControl>

            <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                    value={form.formData.scriptNotes}
                    onChange={(e) => form.updateField('scriptNotes', e.target.value)}
                    onBlur={() => form.validateField('scriptNotes')}
                    placeholder="Script notes or special instructions..."
                    minHeight="120px"
                    resize="vertical"
                />
            </FormControl>
        </VStack>
    );
};