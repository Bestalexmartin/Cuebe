// frontend/src/features/script/components/modals/EditGroupModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
    VStack,
    Input,
    Textarea,
    FormControl,
    FormLabel,
    FormErrorMessage
} from '@chakra-ui/react';
import { BaseModal } from '../../../../components/base/BaseModal';
import { ScriptElement } from '../../types/scriptElements';
import { formatTimeOffset, parseTimeToMs } from '../../../../utils/timeUtils';
import { ColorSelector, PRESET_COLORS } from '../ColorSelector';
import { getGroupChildren } from '../../utils/groupUtils';

interface EditGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    element: ScriptElement | null;
    allElements: ScriptElement[];
    onSave: (changes: Record<string, { old_value: any; new_value: any }>, offsetDelta: number, affectedChildren: string[]) => void;
}

interface FormData {
    element_name: string;
    cue_notes: string;
    custom_color: string;
    offset_ms: number;
}

const INITIAL_FORM_DATA: FormData = {
    element_name: '',
    cue_notes: '',
    custom_color: PRESET_COLORS[0].value,
    offset_ms: 0
};

export const EditGroupModal: React.FC<EditGroupModalProps> = ({
    isOpen,
    onClose,
    element,
    allElements,
    onSave
}) => {
    const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
    const [timeString, setTimeString] = useState('00:00');
    const [errors, setErrors] = useState<{ element_name?: string; timeOffset?: string }>({});

    useEffect(() => {
        if (element) {
            setFormData({
                element_name: element.element_name || '',
                cue_notes: element.cue_notes || '',
                custom_color: element.custom_color || PRESET_COLORS[0].value,
                offset_ms: element.offset_ms || 0
            });
            setTimeString(formatTimeOffset(element.offset_ms || 0, false) || '0:00');
        }
    }, [element]);

    const childrenIds = useMemo(() => 
        element ? getGroupChildren(element.element_id, allElements).map(el => el.element_id) : []
    , [element, allElements]);

    const resetForm = () => {
        setFormData(INITIAL_FORM_DATA);
        setTimeString('00:00');
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleTimeChange = (value: string) => {
        setTimeString(value);
        const timeMs = parseTimeToMs(value);
        if (timeMs !== null) {
            setFormData(prev => ({ ...prev, offset_ms: timeMs }));
            setErrors(prev => ({ ...prev, timeOffset: undefined }));
        } else {
            setErrors(prev => ({ ...prev, timeOffset: 'Invalid time format' }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: { element_name?: string; timeOffset?: string } = {};

        if (!formData.element_name.trim()) {
            newErrors.element_name = 'Group name is required';
        }

        // Allow negative time offsets for pre-show timing
        if (!Number.isFinite(formData.offset_ms)) {
            newErrors.timeOffset = 'Time must be a valid time value';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const calculateChanges = () => {
        if (!element) return {};

        const changes: Record<string, { old_value: any; new_value: any }> = {};
        
        if (formData.element_name !== element.element_name) {
            changes.element_name = { old_value: element.element_name, new_value: formData.element_name };
        }
        
        if (formData.cue_notes !== element.cue_notes) {
            changes.cue_notes = { old_value: element.cue_notes, new_value: formData.cue_notes };
        }
        
        if (formData.custom_color !== element.custom_color) {
            changes.custom_color = { old_value: element.custom_color, new_value: formData.custom_color };
        }

        const originalOffsetMs = element.offset_ms || 0;
        const offsetDelta = formData.offset_ms - originalOffsetMs;
        
        if (offsetDelta !== 0) {
            changes.offset_ms = { old_value: originalOffsetMs, new_value: formData.offset_ms };
        }

        return { changes, offsetDelta };
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        
        if (!element || !validateForm()) return;

        const { changes, offsetDelta } = calculateChanges();

        if (changes && Object.keys(changes).length > 0) {
            onSave(changes, offsetDelta || 0, childrenIds);
        }

        handleClose();
    };

    const isFormValid = formData.element_name.trim() && Number.isFinite(formData.offset_ms);

    return (
        <BaseModal
            title="Edit Group"
            isOpen={isOpen}
            onClose={handleClose}
            onSubmit={handleSubmit}
            primaryAction={{
                label: "Update Group",
                onClick: () => handleSubmit({} as React.FormEvent),
                variant: "primary",
                isLoading: false,
                isDisabled: !isFormValid
            }}
            secondaryAction={{
                label: "Cancel",
                variant: "outline",
                onClick: handleClose
            }}
            size="md"
        >
            <VStack spacing={4} align="stretch">
                <FormControl isInvalid={!!errors.timeOffset} isRequired>
                    <FormLabel>Time Offset</FormLabel>
                    <Input
                        value={timeString}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        placeholder="MM:SS or HH:MM:SS"
                    />
                    <FormErrorMessage>{errors.timeOffset}</FormErrorMessage>
                </FormControl>

                <FormControl>
                    <FormLabel>Background Color</FormLabel>
                    <ColorSelector
                        selectedColor={formData.custom_color}
                        onColorChange={(color) => setFormData(prev => ({ ...prev, custom_color: color }))}
                    />
                </FormControl>

                <FormControl isInvalid={!!errors.element_name} isRequired>
                    <FormLabel>Group Name</FormLabel>
                    <Input
                        value={formData.element_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, element_name: e.target.value }))}
                        placeholder="Enter group name"
                    />
                    <FormErrorMessage>{errors.element_name}</FormErrorMessage>
                </FormControl>

                <FormControl>
                    <FormLabel>Notes</FormLabel>
                    <Textarea
                        value={formData.cue_notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, cue_notes: e.target.value }))}
                        placeholder="Optional notes"
                        resize="vertical"
                        minHeight="80px"
                    />
                </FormControl>
            </VStack>
        </BaseModal>
    );
};