// frontend/src/features/script/components/modals/EditElementModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
    VStack,
    HStack,
    Text,
    Input,
    Textarea,
    Select,
    NumberInput,
    NumberInputField,
    FormControl,
    FormLabel,
    FormErrorMessage,
    Box,
    Divider,
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
import { msToDurationString, durationStringToMs } from '../../../../utils/timeUtils';

// Preset colors for note backgrounds - consistent with Show Start and semantic tokens
const NOTE_PRESET_COLORS = [
    { name: 'Default', value: '#E2E8F0' },
    { name: 'Red', value: '#EF4444' },     // Matches semantic token note.preset.red
    { name: 'Grey', value: '#808080' },
    { name: 'Black', value: '#10151C' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Yellow', value: '#EAB308' },
];

interface EditElementModalProps {
    isOpen: boolean;
    onClose: () => void;
    element: ScriptElement | null;
    onSave: (changes: Record<string, { oldValue: any; newValue: any }>) => void;
}

interface FormData {
    description: string;
    cue_id: string;
    cue_notes: string;
    department_id: string;
    time_offset_ms: number;
    duration: number;
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
    const [formData, setFormData] = useState<FormData>({
        description: '',
        cue_id: '',
        cue_notes: '',
        department_id: '',
        time_offset_ms: 0,
        duration: 0,
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
            description: element.description || '',
            cue_id: element.cue_id || '',
            cue_notes: (element as any).cue_notes || '',
            department_id: element.department_id || '',
            time_offset_ms: element.time_offset_ms || 0,
            duration: element.duration || 0,
            priority: element.priority || 'NORMAL',
            location_details: element.location_details || '',
            custom_color: element.custom_color || ''
        };

        setFormData(newFormData);
        setTimeInputs({
            timeOffsetInput: formatTimeWithHours(newFormData.time_offset_ms),
            durationInput: formatTimeWithHours(newFormData.duration * 1000)
        });
        setHasChanges(false);
        setValidationErrors([]);
    }, [element]);

    // Track changes
    const originalData = useMemo(() => {
        if (!element) return null;
        return {
            description: element.description || '',
            cue_id: element.cue_id || '',
            cue_notes: (element as any).cue_notes || '',
            department_id: element.department_id || '',
            time_offset_ms: element.time_offset_ms || 0,
            duration: element.duration || 0,
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
        if (!formData.description.trim()) {
            errors.push({
                field: 'description',
                message: 'Description is required',
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
        if (!Number.isFinite(formData.time_offset_ms)) {
            errors.push({
                field: 'time_offset_ms',
                message: 'Time offset must be a valid time value',
                code: 'invalid_time'
            });
        }

        // Duration validation
        if (formData.duration < 0) {
            errors.push({
                field: 'duration',
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
            const changes: Record<string, { oldValue: any; newValue: any }> = {};

            Object.keys(formData).forEach(key => {
                const formValue = formData[key as keyof FormData];
                const originalValue = originalData[key as keyof FormData];
                
                if (formValue !== originalValue) {
                    changes[key] = {
                        oldValue: originalValue,
                        newValue: formValue
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

    // Enhanced time formatting to support both MM:SS and HH:MM:SS formats with negative values
    const formatTimeWithHours = (timeMs: number): string => {
        const isNegative = timeMs < 0;
        const absTimeMs = Math.abs(timeMs);
        const totalSeconds = Math.round(absTimeMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        const timeString = hours > 0 
            ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            : `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
        return isNegative ? `-${timeString}` : timeString;
    };

    const parseTimeWithHours = (timeString: string): number => {
        if (!timeString || timeString.trim() === '') return 0;
        
        const isNegative = timeString.trim().startsWith('-');
        const cleanTimeString = timeString.replace(/^-/, '').trim();
        
        const parts = cleanTimeString.split(':').map(part => parseInt(part, 10) || 0);
        let ms = 0;
        
        if (parts.length === 2) {
            // MM:SS format - use existing utility (but clean string without negative)
            ms = durationStringToMs(cleanTimeString);
        } else if (parts.length === 3) {
            // HH:MM:SS format
            ms = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
        }
        
        return isNegative ? -ms : ms;
    };

    const handleTimeOffsetChange = (value: string) => {
        setTimeInputs(prev => ({ ...prev, timeOffsetInput: value }));
    };

    const handleTimeOffsetBlur = () => {
        const timeOffsetMs = parseTimeWithHours(timeInputs.timeOffsetInput);
        const formatted = formatTimeWithHours(timeOffsetMs);
        setTimeInputs(prev => ({ ...prev, timeOffsetInput: formatted }));
        setFormData(prev => ({ ...prev, time_offset_ms: timeOffsetMs }));
    };

    const handleDurationChange = (value: string) => {
        setTimeInputs(prev => ({ ...prev, durationInput: value }));
    };

    const handleDurationBlur = () => {
        const durationMs = parseTimeWithHours(timeInputs.durationInput);
        const durationSeconds = Math.round(durationMs / 1000);
        const formatted = formatTimeWithHours(durationMs);
        setTimeInputs(prev => ({ ...prev, durationInput: formatted }));
        setFormData(prev => ({ ...prev, duration: durationSeconds }));
    };

    const handleNumberChange = (field: keyof FormData, value: number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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
            title={`Edit ${isNote ? 'Note' : 'Cue'}: ${element.description}`}
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
            showCloseButton={false}
        >
            <VStack spacing={4} align="stretch">
                {/* Row 1: Time and Duration */}
                <HStack spacing={4}>
                    {/* Time Offset */}
                    <FormControl isInvalid={!!getFieldError('time_offset_ms')}>
                        <FormLabel>Time Offset</FormLabel>
                        <Input
                            value={timeInputs.timeOffsetInput}
                            onChange={(e) => handleTimeOffsetChange(e.target.value)}
                            onBlur={handleTimeOffsetBlur}
                            placeholder="0:00 or 0:00:00"
                        />
                        <FormErrorMessage>{getFieldError('time_offset_ms')}</FormErrorMessage>
                    </FormControl>

                    {/* Duration */}
                    <FormControl isInvalid={!!getFieldError('duration')}>
                        <FormLabel>Duration</FormLabel>
                        <Input
                            value={timeInputs.durationInput}
                            onChange={(e) => handleDurationChange(e.target.value)}
                            onBlur={handleDurationBlur}
                            placeholder="0:00 or 0:00:00"
                        />
                        <FormErrorMessage>{getFieldError('duration')}</FormErrorMessage>
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
                        <HStack spacing={3} align="center">
                            <Input
                                type="color"
                                value={formData.custom_color || '#E2E8F0'}
                                onChange={(e) => handleInputChange('custom_color', e.target.value)}
                                width="60px"
                                height="40px"
                                padding="1"
                                cursor="pointer"
                            />
                            <Input
                                value={formData.custom_color || '#E2E8F0'}
                                onChange={(e) => handleInputChange('custom_color', e.target.value)}
                                placeholder="#E2E8F0"
                                width="120px"
                                fontFamily="mono"
                            />
                            <HStack spacing={1} ml={2}>
                                {/* Preset color buttons */}
                                {NOTE_PRESET_COLORS.map((color) => (
                                    <Button
                                        key={color.value}
                                        size="sm"
                                        height="30px"
                                        width="30px"
                                        minWidth="30px"
                                        backgroundColor={color.value}
                                        border={formData.custom_color === color.value ? '3px solid' : '1px solid'}
                                        borderColor={formData.custom_color === color.value ? 'white' : 'gray.300'}
                                        onClick={() => handleInputChange('custom_color', color.value)}
                                        _hover={{ transform: 'scale(1.1)' }}
                                        title={color.name}
                                        tabIndex={-1}
                                    />
                                ))}
                            </HStack>
                        </HStack>
                    </FormControl>
                )}

                {/* Row 3: Cue (Description) */}
                <FormControl isInvalid={!!getFieldError('description')}>
                    <FormLabel>Cue</FormLabel>
                    <Input
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Describe what happens during this cue or note..."
                    />
                    <FormErrorMessage>{getFieldError('description')}</FormErrorMessage>
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