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
    Checkbox,
    FormControl,
    FormLabel,
    FormErrorMessage,
    Box,
    Divider
} from '@chakra-ui/react';
import { BaseModal } from '../../../../components/base/BaseModal';
import { ScriptElement } from '../../types/scriptElements';
import { useDepartments } from '../../../departments/hooks/useDepartments';
import { FieldError } from '../../../../types/validation';

interface EditElementModalProps {
    isOpen: boolean;
    onClose: () => void;
    element: ScriptElement | null;
    onSave: (changes: Record<string, { oldValue: any; newValue: any }>) => void;
}

interface FormData {
    description: string;
    cueID: string;
    cueNotes: string;
    departmentID: string;
    timeOffsetMs: number;
    duration: number;
    priority: string;
    isSafetyCritical: boolean;
    safetyNotes: string;
    locationDetails: string;
    customColor: string;
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
        cueID: '',
        cueNotes: '',
        departmentID: '',
        timeOffsetMs: 0,
        duration: 0,
        priority: 'NORMAL',
        isSafetyCritical: false,
        safetyNotes: '',
        locationDetails: '',
        customColor: ''
    });
    const [validationErrors, setValidationErrors] = useState<FieldError[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize form data when element changes
    useEffect(() => {
        if (!element) return;

        const newFormData: FormData = {
            description: element.description || '',
            cueID: element.cueID || '',
            cueNotes: (element as any).cueNotes || '',
            departmentID: element.departmentID || '',
            timeOffsetMs: element.timeOffsetMs || 0,
            duration: element.duration || 0,
            priority: element.priority || 'NORMAL',
            isSafetyCritical: element.isSafetyCritical || false,
            safetyNotes: element.safetyNotes || '',
            locationDetails: element.locationDetails || '',
            customColor: element.customColor || ''
        };

        setFormData(newFormData);
        setHasChanges(false);
        setValidationErrors([]);
    }, [element]);

    // Track changes
    const originalData = useMemo(() => {
        if (!element) return null;
        return {
            description: element.description || '',
            cueID: element.cueID || '',
            cueNotes: (element as any).cueNotes || '',
            departmentID: element.departmentID || '',
            timeOffsetMs: element.timeOffsetMs || 0,
            duration: element.duration || 0,
            priority: element.priority || 'NORMAL',
            isSafetyCritical: element.isSafetyCritical || false,
            safetyNotes: element.safetyNotes || '',
            locationDetails: element.locationDetails || '',
            customColor: element.customColor || ''
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

        // Cue ID validation for cue elements
        if ((element as any)?.elementType === 'CUE' && !formData.cueID.trim()) {
            errors.push({
                field: 'cueID',
                message: 'Cue ID is required for cue elements',
                code: 'required'
            });
        }

        // Department validation for cue elements
        if ((element as any)?.elementType === 'CUE' && !formData.departmentID) {
            errors.push({
                field: 'departmentID',
                message: 'Department is required for cue elements',
                code: 'required'
            });
        }

        // Time offset validation
        if (formData.timeOffsetMs < 0) {
            errors.push({
                field: 'timeOffsetMs',
                message: 'Time offset cannot be negative',
                code: 'min_value'
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

    const formatTimeOffset = (timeOffsetMs: number): string => {
        const totalSeconds = Math.round(timeOffsetMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    };

    const parseTimeOffset = (timeString: string): number => {
        const parts = timeString.split(':').map(part => parseInt(part, 10));
        if (parts.length === 2) {
            // MM:SS format
            return (parts[0] * 60 + parts[1]) * 1000;
        } else if (parts.length === 3) {
            // HH:MM:SS format
            return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
        }
        return 0;
    };

    const handleTimeOffsetChange = (value: string) => {
        const timeOffsetMs = parseTimeOffset(value);
        setFormData(prev => ({ ...prev, timeOffsetMs }));
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

    const isNote = (element as any)?.elementType === 'NOTE';
    const isCue = (element as any)?.elementType === 'CUE';

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
        >
            <VStack spacing={6} align="stretch">
                {/* Basic Information */}
                <Box>
                    <Text fontSize="lg" fontWeight="semibold" mb={4}>
                        Basic Information
                    </Text>
                    
                    <VStack spacing={4} align="stretch">
                        {/* Description */}
                        <FormControl isInvalid={!!getFieldError('description')}>
                            <FormLabel>Description</FormLabel>
                            <Input
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="Enter description..."
                            />
                            <FormErrorMessage>{getFieldError('description')}</FormErrorMessage>
                        </FormControl>

                        {/* Cue ID (for cues only) */}
                        {isCue && (
                            <FormControl isInvalid={!!getFieldError('cueID')}>
                                <FormLabel>Cue ID</FormLabel>
                                <Input
                                    value={formData.cueID}
                                    onChange={(e) => handleInputChange('cueID', e.target.value)}
                                    placeholder="e.g., LX-01, SND-05"
                                />
                                <FormErrorMessage>{getFieldError('cueID')}</FormErrorMessage>
                            </FormControl>
                        )}

                        {/* Department (for cues, optional for notes) */}
                        <FormControl isInvalid={!!getFieldError('departmentID')}>
                            <FormLabel>Department {isCue && '*'}</FormLabel>
                            <Select
                                value={formData.departmentID}
                                onChange={(e) => handleInputChange('departmentID', e.target.value)}
                                placeholder="Select department..."
                                isDisabled={departmentsLoading}
                            >
                                {departments.map(dept => (
                                    <option key={dept.departmentID} value={dept.departmentID}>
                                        {dept.departmentName}
                                    </option>
                                ))}
                            </Select>
                            <FormErrorMessage>{getFieldError('departmentID')}</FormErrorMessage>
                        </FormControl>

                        {/* Notes */}
                        <FormControl>
                            <FormLabel>{isNote ? 'Content' : 'Cue Notes'}</FormLabel>
                            <Textarea
                                value={formData.cueNotes}
                                onChange={(e) => handleInputChange('cueNotes', e.target.value)}
                                placeholder={isNote ? "Enter note content..." : "Enter cue notes..."}
                                rows={3}
                            />
                        </FormControl>
                    </VStack>
                </Box>

                <Divider />

                {/* Timing */}
                <Box>
                    <Text fontSize="lg" fontWeight="semibold" mb={4}>
                        Timing
                    </Text>
                    
                    <HStack spacing={4}>
                        {/* Time Offset */}
                        <FormControl isInvalid={!!getFieldError('timeOffsetMs')}>
                            <FormLabel>Time Offset</FormLabel>
                            <Input
                                value={formatTimeOffset(formData.timeOffsetMs)}
                                onChange={(e) => handleTimeOffsetChange(e.target.value)}
                                placeholder="0:00 or 0:00:00"
                            />
                            <FormErrorMessage>{getFieldError('timeOffsetMs')}</FormErrorMessage>
                        </FormControl>

                        {/* Duration */}
                        <FormControl isInvalid={!!getFieldError('duration')}>
                            <FormLabel>Duration (seconds)</FormLabel>
                            <NumberInput
                                value={formData.duration}
                                onChange={(valueString, valueNumber) => 
                                    handleNumberChange('duration', valueNumber || 0)
                                }
                                min={0}
                            >
                                <NumberInputField />
                            </NumberInput>
                            <FormErrorMessage>{getFieldError('duration')}</FormErrorMessage>
                        </FormControl>
                    </HStack>
                </Box>

                <Divider />

                {/* Priority and Safety */}
                <Box>
                    <Text fontSize="lg" fontWeight="semibold" mb={4}>
                        Priority & Safety
                    </Text>
                    
                    <VStack spacing={4} align="stretch">
                        {/* Priority */}
                        <FormControl>
                            <FormLabel>Priority</FormLabel>
                            <Select
                                value={formData.priority}
                                onChange={(e) => handleInputChange('priority', e.target.value)}
                            >
                                <option value="CRITICAL">Critical</option>
                                <option value="HIGH">High</option>
                                <option value="NORMAL">Normal</option>
                                <option value="LOW">Low</option>
                                <option value="OPTIONAL">Optional</option>
                            </Select>
                        </FormControl>

                        {/* Safety Critical */}
                        <FormControl>
                            <Checkbox
                                isChecked={formData.isSafetyCritical}
                                onChange={(e) => handleInputChange('isSafetyCritical', e.target.checked)}
                            >
                                Safety Critical
                            </Checkbox>
                        </FormControl>

                        {/* Safety Notes */}
                        {formData.isSafetyCritical && (
                            <FormControl>
                                <FormLabel>Safety Notes</FormLabel>
                                <Textarea
                                    value={formData.safetyNotes}
                                    onChange={(e) => handleInputChange('safetyNotes', e.target.value)}
                                    placeholder="Enter safety notes..."
                                    rows={2}
                                />
                            </FormControl>
                        )}

                        {/* Location Details */}
                        <FormControl>
                            <FormLabel>Location Details</FormLabel>
                            <Input
                                value={formData.locationDetails}
                                onChange={(e) => handleInputChange('locationDetails', e.target.value)}
                                placeholder="e.g., Stage left, Booth, etc."
                            />
                        </FormControl>
                    </VStack>
                </Box>

                {/* Custom Color for Notes */}
                {isNote && (
                    <>
                        <Divider />
                        <Box>
                            <Text fontSize="lg" fontWeight="semibold" mb={4}>
                                Appearance
                            </Text>
                            
                            <FormControl>
                                <FormLabel>Custom Color</FormLabel>
                                <Input
                                    type="color"
                                    value={formData.customColor || '#E2E8F0'}
                                    onChange={(e) => handleInputChange('customColor', e.target.value)}
                                    w="100px"
                                />
                            </FormControl>
                        </Box>
                    </>
                )}
            </VStack>
        </BaseModal>
    );
};