// frontend/src/pages/script/components/AddScriptElementModal.tsx

import React, { useState, useEffect } from 'react';
import {
    VStack,
    HStack,
    FormControl,
    FormLabel,
    Input,
    Select,
    Textarea,
    RadioGroup,
    Radio,
    Text,
    Box,
    Button,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Flex,
    Icon
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { BaseModal } from '../../../components/base/BaseModal';
import { useValidatedForm } from '../../../hooks/useValidatedForm';
import { useResource } from '../../../hooks/useResource';
import { ValidationRules, FormValidationConfig } from '../../../types/validation';
import { ScriptElementCreate, ElementType, TriggerType, PriorityLevel, LocationArea } from '../types/script-elements';

// TypeScript interfaces
interface Department {
    departmentID: string;
    departmentName: string;
    departmentColor: string;
}

interface AddScriptElementModalProps {
    isOpen: boolean;
    onClose: () => void;
    scriptId: string;
    onElementCreated: () => void;
}

const INITIAL_FORM_STATE: ScriptElementCreate = {
    elementType: 'cue',
    description: '',
    timeOffsetMs: 0,
    triggerType: 'manual', // Will be set automatically
    cueID: '', // Will be auto-generated
    cueNotes: '',
    departmentID: '',
    location: undefined, // Not needed in form
    priority: 'normal',
    isSafetyCritical: false
};

const VALIDATION_CONFIG: FormValidationConfig = {
    description: {
        required: true,
        rules: [
            ValidationRules.minLength(3, 'Cue Event must be at least 3 characters'),
            ValidationRules.maxLength(200, 'Cue Event must be no more than 200 characters')
        ]
    },
    departmentID: {
        required: false, // Will be conditionally required based on element type
        rules: [
            {
                validator: (value: string, formData?: any) => {
                    // Only require department for cues, not for notes
                    if (formData?.elementType === 'cue') {
                        return value && value.trim().length > 0;
                    }
                    return true; // Notes don't require a department
                },
                message: 'Please select a department for cues',
                code: 'DEPARTMENT_REQUIRED_FOR_CUE'
            }
        ]
    },
    timeOffsetMs: {
        required: true,
        rules: [
            {
                validator: (value: number) => value > 0,
                message: 'Time offset must be greater than 00:00',
                code: 'INVALID_TIME'
            }
        ]
    },
    cueNotes: {
        required: false,
        rules: [
            ValidationRules.maxLength(500, 'Cue Notes must be no more than 500 characters')
        ]
    }
};

const ELEMENT_TYPE_OPTIONS: { value: ElementType; label: string; description: string }[] = [
    { value: 'cue', label: 'Cue', description: 'Technical cue (lighting, sound, etc.)' },
    { value: 'note', label: 'Note', description: 'Informational note or reminder' }
];

const TRIGGER_TYPE_OPTIONS: { value: TriggerType; label: string }[] = [
    { value: 'manual', label: 'Manual' },
    { value: 'time', label: 'Time-based' },
    { value: 'auto', label: 'Auto-follow' },
    { value: 'follow', label: 'Follow Cue' },
    { value: 'go', label: 'GO Command' },
    { value: 'standby', label: 'Standby' }
];

const PRIORITY_OPTIONS: { value: PriorityLevel; label: string }[] = [
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'normal', label: 'Normal' },
    { value: 'low', label: 'Low' },
    { value: 'optional', label: 'Optional' }
];

const LOCATION_OPTIONS: { value: LocationArea; label: string }[] = [
    { value: 'center_stage', label: 'Center Stage' },
    { value: 'stage_left', label: 'Stage Left' },
    { value: 'stage_right', label: 'Stage Right' },
    { value: 'upstage', label: 'Upstage' },
    { value: 'downstage', label: 'Downstage' },
    { value: 'booth', label: 'Booth' },
    { value: 'fly_gallery', label: 'Fly Gallery' },
    { value: 'backstage', label: 'Backstage' },
    { value: 'wings_left', label: 'Wings Left' },
    { value: 'wings_right', label: 'Wings Right' },
    { value: 'house', label: 'House' },
    { value: 'other', label: 'Other' }
];

// Helper functions for MM:SS duration conversion
const msToDurationString = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const durationStringToMs = (durationString: string): number => {
    if (!durationString || durationString === '') return 0;
    
    // Handle partial input during typing
    const cleanInput = durationString.replace(/[^\d:]/g, '');
    if (cleanInput === '') return 0;
    
    // Split by colon and handle various input states
    const parts = cleanInput.split(':');
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    
    return (minutes * 60 + seconds) * 1000;
};

export const AddScriptElementModal: React.FC<AddScriptElementModalProps> = ({
    isOpen,
    onClose,
    scriptId,
    onElementCreated
}) => {
    // Separate state for time input to allow free typing
    const [timeInputValue, setTimeInputValue] = useState('00:00');
    
    const form = useValidatedForm<ScriptElementCreate>(INITIAL_FORM_STATE, {
        validationConfig: VALIDATION_CONFIG,
        validateOnChange: true,
        validateOnBlur: true,
        showFieldErrorsInToast: false
    });

    // Department data management
    const {
        data: departments,
        isLoading: isLoadingDepartments,
        refetch: refetchDepartments,
    } = useResource<Department>('/api/me/departments', {
        fetchOnMount: false,
    });

    // Reset time input and fetch departments when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeInputValue('00:00');
            refetchDepartments();
        }
    }, [isOpen]); // Removed refetchDepartments from dependencies to prevent infinite loop

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        
        try {
            // Convert enum values to uppercase for database
            const submitData = {
                ...form.formData,
                elementType: form.formData.elementType.toUpperCase(),
                triggerType: form.formData.triggerType?.toUpperCase() || 'MANUAL',
                priority: form.formData.priority?.toUpperCase() || 'NORMAL'
            };

            await form.submitForm(
                `/api/scripts/${scriptId}/elements`,
                'POST',
                'Script element created successfully',
                submitData
            );
            
            // Reset form and close modal
            form.resetForm();
            onClose();
            onElementCreated();
        } catch (error) {
            // Error handling is done in submitForm
        }
    };

    const canSubmit = form.formData.description.trim().length >= 3 && 
                     // Department only required for cues, not notes
                     (form.formData.elementType === 'note' || form.formData.departmentID.trim().length > 0) &&
                     form.formData.timeOffsetMs > 0 &&
                     form.fieldErrors.length === 0;

    return (
        <BaseModal
            title="Add Script Element"
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            primaryAction={{
                label: "Create Element",
                variant: "primary",
                type: "submit",
                isLoading: form.isSubmitting,
                isDisabled: !canSubmit
            }}
            secondaryAction={{
                label: "Cancel",
                variant: "outline",
                onClick: onClose
            }}
            validationErrors={form.fieldErrors}
            showValidationErrors={form.fieldErrors.length > 0}
        >
            <VStack spacing={4} align="stretch">
                {/* Element Type Selection - Cue or Note */}
                <FormControl isRequired>
                    <FormLabel>Element Type</FormLabel>
                    <RadioGroup
                        value={form.formData.elementType}
                        onChange={(value) => {
                            form.updateField('elementType', value as ElementType);
                            // Reset department field when switching to note
                            if (value === 'note') {
                                form.updateField('departmentID', '');
                            }
                            // Re-validate department field when element type changes
                            form.validateField('departmentID');
                        }}
                    >
                        <HStack spacing={6}>
                            {ELEMENT_TYPE_OPTIONS.map(option => (
                                <Radio key={option.value} value={option.value}>
                                    <Text fontWeight="medium">{option.label}</Text>
                                </Radio>
                            ))}
                        </HStack>
                    </RadioGroup>
                </FormControl>

                {/* Department */}
                <FormControl isRequired={form.formData.elementType === 'cue'}>
                    <FormLabel>Department</FormLabel>
                    <Menu>
                        <MenuButton
                            as={Button}
                            rightIcon={<ChevronDownIcon />}
                            variant="outline"
                            width="100%"
                            textAlign="left"
                            isDisabled={isLoadingDepartments}
                            bg="white"
                            _dark={{ bg: "gray.800" }}
                            height="40px"
                        >
                            <Flex align="center" gap={2}>
                                {form.formData.departmentID ? (
                                    <>
                                        <Box
                                            width="14px"
                                            height="14px"
                                            borderRadius="50%"
                                            bg={departments?.find(d => d.departmentID === form.formData.departmentID)?.departmentColor || 'gray.400'}
                                            flexShrink={0}
                                        />
                                        <Text isTruncated>
                                            {departments?.find(d => d.departmentID === form.formData.departmentID)?.departmentName || 'Select department'}
                                        </Text>
                                    </>
                                ) : (
                                    <Text color="gray.400">
                                        {isLoadingDepartments ? "Loading departments..." : "Select department"}
                                    </Text>
                                )}
                            </Flex>
                        </MenuButton>
                        <MenuList>
                            {departments?.map((department) => (
                                <MenuItem
                                    key={department.departmentID}
                                    onClick={() => {
                                        form.updateField('departmentID', department.departmentID);
                                        form.validateField('departmentID');
                                    }}
                                >
                                    <Flex align="center" gap={2}>
                                        <Box
                                            width="14px"
                                            height="14px"
                                            borderRadius="50%"
                                            bg={department.departmentColor}
                                            flexShrink={0}
                                        />
                                        <Text>{department.departmentName}</Text>
                                    </Flex>
                                </MenuItem>
                            ))}
                        </MenuList>
                    </Menu>
                </FormControl>

                {/* Cue Event (Description) */}
                <FormControl isRequired>
                    <FormLabel>Cue Event</FormLabel>
                    <Textarea
                        value={form.formData.description}
                        onChange={(e) => form.updateField('description', e.target.value)}
                        onBlur={() => form.validateField('description')}
                        placeholder="Describe what happens during this cue or note..."
                        minHeight="80px"
                        resize="vertical"
                    />
                </FormControl>

                {/* Time Offset and Priority Row */}
                <HStack spacing={4}>
                    <FormControl isRequired>
                        <FormLabel>Time Offset (MM:SS)</FormLabel>
                        <Input
                            type="text"
                            value={timeInputValue}
                            onChange={(e) => {
                                // Allow completely free typing
                                setTimeInputValue(e.target.value);
                            }}
                            onBlur={(e) => {
                                // Auto-format, update form data, and validate on blur
                                const ms = durationStringToMs(e.target.value);
                                const formatted = msToDurationString(ms);
                                setTimeInputValue(formatted);
                                form.updateField('timeOffsetMs', ms);
                                form.validateField('timeOffsetMs');
                            }}
                            placeholder="00:00"
                            maxLength={5}
                        />
                    </FormControl>

                    <FormControl>
                        <FormLabel>Priority</FormLabel>
                        <Select
                            value={form.formData.priority}
                            onChange={(e) => form.updateField('priority', e.target.value as PriorityLevel)}
                        >
                            {PRIORITY_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                    </FormControl>
                </HStack>

                {/* Cue Notes */}
                <FormControl>
                    <FormLabel>Cue Notes</FormLabel>
                    <Textarea
                        value={form.formData.cueNotes}
                        onChange={(e) => form.updateField('cueNotes', e.target.value)}
                        onBlur={() => form.validateField('cueNotes')}
                        placeholder="Additional instructions or details..."
                        minHeight="60px"
                        resize="vertical"
                    />
                </FormControl>
            </VStack>
        </BaseModal>
    );
};