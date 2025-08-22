// frontend/src/features/script/components/modals/EditElementModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
    VStack,
    HStack,
    Text,
    Input,
    Textarea,
    Select,
    FormControl,
    FormLabel,
    FormErrorMessage,
    Box,
    Flex,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button
} from '@chakra-ui/react';
import { AppIcon } from '../../../../components/AppIcon';
import { BaseModal } from '../../../../components/base/BaseModal';
import { ScriptElement } from '../../types/scriptElements';
import { useDepartments } from '../../../departments/hooks/useDepartments';
import { FieldError } from '../../../../types/validation';
import { parseTimeToMs, formatTimeOffset } from '../../../../utils/timeUtils';
import { ColorSelector, PRESET_COLORS } from '../ColorSelector';
import { useUserPreferences } from '../../../../hooks/useUserPreferences';


interface EditElementModalProps {
    isOpen: boolean;
    onClose: () => void;
    element: ScriptElement | null;
    onSave: (changes: Record<string, { old_value: any; new_value: any }>) => void;
}

interface FormData {
    element_name: string;
    cue_notes: string;
    department_id: string;
    offset_ms: number;
    duration_ms: number;
    priority: string;
    location_details: string;
    custom_color: string;
}

interface TimeInputs {
    timeOffsetInput: string;
    durationInput: string;
}

export const EditElementModal: React.FC<EditElementModalProps> = ({
    isOpen,
    onClose,
    element,
    onSave
}) => {
    const { departments, isLoading: departmentsLoading } = useDepartments();
    const { preferences } = useUserPreferences();
    const [formData, setFormData] = useState<FormData>({
        element_name: '',
        cue_notes: '',
        department_id: '',
        offset_ms: 0,
        duration_ms: 0,
        priority: 'NORMAL',
        location_details: '',
        custom_color: ''
    });
    const [validationErrors, setValidationErrors] = useState<FieldError[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeInputs, setTimeInputs] = useState<TimeInputs>({
        timeOffsetInput: '',
        durationInput: ''
    });

    // Initialize form data when element changes
    useEffect(() => {
        if (!element) return;

        const newFormData: FormData = {
            element_name: element.element_name || '',
            cue_notes: (element as any).cue_notes || '',
            department_id: element.department_id || '',
            offset_ms: element.offset_ms || 0,
            duration_ms: element.duration_ms || 0,
            priority: element.priority || 'NORMAL',
            location_details: element.location_details || '',
            custom_color: element.custom_color || ''
        };

        setFormData(newFormData);
        setTimeInputs({
            timeOffsetInput: formatTimeOffset(newFormData.offset_ms, preferences.useMilitaryTime) || '0:00',
            durationInput: formatTimeOffset(newFormData.duration_ms, preferences.useMilitaryTime) || '0:00'
        });
        setHasChanges(false);
        setValidationErrors([]);
    }, [element, preferences.useMilitaryTime]);

    // Track changes
    const originalData = useMemo(() => {
        if (!element) return null;
        return {
            element_name: element.element_name || '',
            cue_notes: (element as any).cue_notes || '',
            department_id: element.department_id || '',
            offset_ms: element.offset_ms || 0,
            duration_ms: element.duration_ms || 0,
            priority: element.priority || 'NORMAL',
            location_details: element.location_details || '',
            custom_color: element.custom_color || ''
        };
    }, [element]);

    // Check for changes
    useEffect(() => {
        if (!originalData) return;
        
        const changed = Object.keys(formData).some(key => {
            const formValue = formData[key as keyof FormData];
            const originalValue = originalData[key as keyof FormData];
            return formValue !== originalValue;
        });
        
        setHasChanges(changed);
    }, [formData, originalData]);

    const validateForm = (): boolean => {
        const errors: FieldError[] = [];

        // Required fields validation
        if (!formData.element_name.trim()) {
            errors.push({
                field: 'element_name',
                message: 'Element name is required',
                code: 'required'
            });
        }


        // Department validation for cue elements
        if ((element as any)?.element_type === 'CUE' && !formData.department_id) {
            errors.push({
                field: 'department_id',
                message: 'Department is required for cue elements',
                code: 'required'
            });
        }

        // Time offset validation - now allows negative values for pre-show timing
        if (!Number.isFinite(formData.offset_ms)) {
            errors.push({
                field: 'offset_ms',
                message: 'Time offset must be a valid time value',
                code: 'invalid_time'
            });
        }

        // Duration validation
        if (formData.duration_ms < 0) {
            errors.push({
                field: 'duration_ms',
                message: 'Duration cannot be negative',
                code: 'min_value'
            });
        }

        setValidationErrors(errors);
        return errors.length === 0;
    };

    const handleSubmit = async () => {
        if (!element || !originalData || !validateForm()) return;

        setIsSubmitting(true);
        try {
            // Create change objects for modified fields
            const changes: Record<string, { old_value: any; new_value: any }> = {};

            Object.keys(formData).forEach(key => {
                const formValue = formData[key as keyof FormData];
                const originalValue = originalData[key as keyof FormData];
                
                if (formValue !== originalValue) {
                    changes[key] = {
                        old_value: originalValue,
                        new_value: formValue
                    };
                }
            });

            if (Object.keys(changes).length > 0) {
                onSave(changes);
            }
            
            onClose();
        } catch (error) {
            console.error('Error saving element changes:', error);
        } finally {
            setIsSubmitting(false);
        }
    };


    const parseTimeWithHours = (timeString: string): number => {
        if (!timeString || timeString.trim() === '') return 0;
        
        const isNegative = timeString.trim().startsWith('-');
        const cleanTimeString = timeString.replace(/^-/, '').trim();
        
        const parts = cleanTimeString.split(':').map(part => parseInt(part, 10) || 0);
        let ms = 0;
        
        if (parts.length === 1) {
            // Just seconds - treat as MM:SS with M=0
            ms = parts[0] * 1000;
        } else if (parts.length === 2) {
            // MM:SS format - use existing utility (but clean string without negative)
            const parsedMs = parseTimeToMs(cleanTimeString);
            ms = parsedMs !== null ? parsedMs : 0;
        } else if (parts.length === 3) {
            // HH:MM:SS format
            ms = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
        } else {
            // Invalid format - return 0
            return 0;
        }
        
        return isNegative ? -ms : ms;
    };

    const handleTimeOffsetChange = (value: string) => {
        setTimeInputs(prev => ({ ...prev, timeOffsetInput: value }));
    };

    const handleTimeOffsetBlur = () => {
        const timeOffsetMs = parseTimeWithHours(timeInputs.timeOffsetInput);
        const formatted = formatTimeOffset(timeOffsetMs, preferences.useMilitaryTime) || '0:00';
        setTimeInputs(prev => ({ ...prev, timeOffsetInput: formatted }));
        setFormData(prev => ({ ...prev, offset_ms: timeOffsetMs }));
    };

    const handleDurationChange = (value: string) => {
        setTimeInputs(prev => ({ ...prev, durationInput: value }));
    };

    const handleDurationBlur = () => {
        const durationMs = parseTimeWithHours(timeInputs.durationInput);
        const formatted = formatTimeOffset(durationMs, preferences.useMilitaryTime) || '0:00';
        setTimeInputs(prev => ({ ...prev, durationInput: formatted }));
        setFormData(prev => ({ ...prev, duration_ms: durationMs }));
    };


    const handleInputChange = (field: keyof FormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const getFieldError = (field: string): string | undefined => {
        return validationErrors.find(error => error.field === field)?.message;
    };

    const isNote = (element as any)?.element_type === 'NOTE';
    const isCue = (element as any)?.element_type === 'CUE';

    if (!element) return null;

    return (
        <BaseModal
            title={`Edit ${isNote ? 'Note' : 'Cue'}: ${element.element_name}`}
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            primaryAction={{
                label: 'Save Changes',
                onClick: handleSubmit,
                variant: 'primary',
                isLoading: isSubmitting,
                isDisabled: !hasChanges || validationErrors.length > 0
            }}
            validationErrors={validationErrors}
            errorBoundaryContext="EditElementModal"
        >
            <VStack spacing={4} align="stretch">
                {/* Row 1: Time and Duration */}
                <HStack spacing={4}>
                    {/* Time Offset */}
                    <FormControl isInvalid={!!getFieldError('offset_ms')}>
                        <FormLabel>Time Offset</FormLabel>
                        <Input
                            value={timeInputs.timeOffsetInput}
                            onChange={(e) => handleTimeOffsetChange(e.target.value)}
                            onBlur={handleTimeOffsetBlur}
                            placeholder="0:00 or 0:00:00"
                        />
                        <FormErrorMessage>{getFieldError('offset_ms')}</FormErrorMessage>
                    </FormControl>

                    {/* Duration */}
                    <FormControl isInvalid={!!getFieldError('duration_ms')}>
                        <FormLabel>Duration</FormLabel>
                        <Input
                            value={timeInputs.durationInput}
                            onChange={(e) => handleDurationChange(e.target.value)}
                            onBlur={handleDurationBlur}
                            placeholder="0:00 or 0:00:00"
                        />
                        <FormErrorMessage>{getFieldError('duration_ms')}</FormErrorMessage>
                    </FormControl>
                </HStack>

                {/* Row 2: Department or Color */}
                {isCue ? (
                    <FormControl isInvalid={!!getFieldError('department_id')}>
                        <FormLabel>Department *</FormLabel>
                        <Menu>
                            <MenuButton
                                as={Button}
                                rightIcon={<AppIcon name='openmenu' />}
                                variant="outline"
                                width="100%"
                                textAlign="left"
                                isDisabled={departmentsLoading}
                                height="40px"
                            >
                                {formData.department_id ? (
                                    <Flex align="center" gap={2}>
                                        <Box
                                            width="14px"
                                            height="14px"
                                            borderRadius="50%"
                                            bg={departments?.find(d => d.department_id === formData.department_id)?.department_color || 'gray.400'}
                                            flexShrink={0}
                                        />
                                        <Text isTruncated>
                                            {departments?.find(d => d.department_id === formData.department_id)?.department_name || 'Select department'}
                                        </Text>
                                    </Flex>
                                ) : (
                                    <Text color="gray.500">Select department...</Text>
                                )}
                            </MenuButton>
                            <MenuList>
                                {departments.map(dept => (
                                    <MenuItem
                                        key={dept.department_id}
                                        onClick={() => handleInputChange('department_id', dept.department_id)}
                                    >
                                        <Flex align="center" gap={2}>
                                            <Box
                                                width="14px"
                                                height="14px"
                                                borderRadius="50%"
                                                bg={dept.department_color}
                                                flexShrink={0}
                                            />
                                            <Text>{dept.department_name}</Text>
                                        </Flex>
                                    </MenuItem>
                                ))}
                            </MenuList>
                        </Menu>
                        <FormErrorMessage>{getFieldError('department_id')}</FormErrorMessage>
                    </FormControl>
                ) : (
                    <FormControl>
                        <FormLabel>Background Color</FormLabel>
                        <ColorSelector
                            selectedColor={formData.custom_color || PRESET_COLORS[0].value}
                            onColorChange={(color) => handleInputChange('custom_color', color)}
                        />
                    </FormControl>
                )}

                {/* Row 3: Cue (Description) */}
                <FormControl isInvalid={!!getFieldError('element_name')}>
                    <FormLabel>Cue</FormLabel>
                    <Input
                        value={formData.element_name}
                        onChange={(e) => handleInputChange('element_name', e.target.value)}
                        placeholder="Describe what happens during this cue or note..."
                    />
                    <FormErrorMessage>{getFieldError('element_name')}</FormErrorMessage>
                </FormControl>

                {/* Row 4: Notes */}
                <FormControl>
                    <FormLabel>Notes</FormLabel>
                    <Textarea
                        value={formData.cue_notes}
                        onChange={(e) => handleInputChange('cue_notes', e.target.value)}
                        placeholder="Additional instructions or details..."
                        minHeight="60px"
                        resize="vertical"
                    />
                </FormControl>

                {/* Row 5: Location */}
                <FormControl>
                    <FormLabel>Location</FormLabel>
                    <Input
                        value={formData.location_details}
                        onChange={(e) => handleInputChange('location_details', e.target.value)}
                        placeholder="e.g., Stage left, Booth, etc."
                    />
                </FormControl>

                {/* Row 6: Priority and Safety Critical */}
                <HStack spacing={4} align="flex-start">
                    {/* Priority */}
                    <FormControl>
                        <FormLabel>Priority</FormLabel>
                        <Select
                            value={formData.priority}
                            onChange={(e) => handleInputChange('priority', e.target.value)}
                        >
                            <option value="SAFETY">Safety</option>
                            <option value="CRITICAL">Critical</option>
                            <option value="HIGH">High</option>
                            <option value="NORMAL">Normal</option>
                            <option value="LOW">Low</option>
                            <option value="OPTIONAL">Optional</option>
                        </Select>
                    </FormControl>

                </HStack>

            </VStack>
        </BaseModal>
    );
};