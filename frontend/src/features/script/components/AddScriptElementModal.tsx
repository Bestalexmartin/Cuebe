// frontend/src/features/script/components/AddScriptElementModal.tsx

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
import { getTextColorForBackground } from '../../../utils/colorUtils';
import { msToDurationString, durationStringToMs } from '../../../utils/timeUtils';

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
    onElementCreated: (elementData: any) => void;
    autoSortCues: boolean;
}

const INITIAL_FORM_STATE: ScriptElementCreate = {
    elementType: 'CUE',
    description: '',
    timeOffsetMs: 0,
    triggerType: 'MANUAL', // Will be set automatically
    cueID: '', // Will be auto-generated
    cueNotes: '',
    departmentID: '',
    location: undefined, // Not needed in form
    priority: 'NORMAL',
    isSafetyCritical: false,
    customColor: '' // For note background color
};

const VALIDATION_CONFIG: FormValidationConfig = {
    description: {
        required: true,
        rules: [
            ValidationRules.minLength(3, 'Cue Event must be at least 3 characters'),
            ValidationRules.maxLength(200, 'Cue Event must be no more than 200 characters')
        ]
    },
    // departmentID validation is handled manually in canSubmit logic
    timeOffsetMs: {
        required: true,
        rules: [
            {
                validator: (value: number) => value >= 0,
                message: 'Time offset must be 00:00 or greater',
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
    { value: 'CUE', label: 'Cue', description: 'Technical cue (lighting, sound, etc.)' },
    { value: 'NOTE', label: 'Note', description: 'Informational note or reminder' }
];

const TRIGGER_TYPE_OPTIONS: { value: TriggerType; label: string }[] = [
    { value: 'MANUAL', label: 'Manual' },
    { value: 'TIME', label: 'Time-based' },
    { value: 'AUTO', label: 'Auto-follow' },
    { value: 'FOLLOW', label: 'Follow Cue' },
    { value: 'GO', label: 'GO Command' },
    { value: 'STANDBY', label: 'Standby' }
];

const PRIORITY_OPTIONS: { value: PriorityLevel; label: string }[] = [
    { value: 'CRITICAL', label: 'Critical' },
    { value: 'HIGH', label: 'High' },
    { value: 'NORMAL', label: 'Normal' },
    { value: 'LOW', label: 'Low' },
    { value: 'OPTIONAL', label: 'Optional' }
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

// Preset colors for note backgrounds
const NOTE_PRESET_COLORS = [
    { name: 'Default', value: '#E2E8F0' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Grey', value: '#808080' },
    { name: 'Black', value: '#10151C' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Yellow', value: '#EAB308' },
];

// Helper functions moved to shared utils

export const AddScriptElementModal: React.FC<AddScriptElementModalProps> = ({
    isOpen,
    onClose,
    scriptId,
    onElementCreated,
    autoSortCues
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
        
        // Find selected department to include department info
        const selectedDepartment = form.formData.departmentID && form.formData.departmentID.trim() 
            ? departments?.find(d => d.departmentID === form.formData.departmentID)
            : null;
        
        // Create element data locally instead of submitting to API
        const elementData = {
            ...form.formData,
            elementID: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Temporary ID
            elementType: form.formData.elementType,
            triggerType: form.formData.triggerType || 'MANUAL',
            priority: form.formData.priority || 'NORMAL',
            // Convert empty departmentID to null for notes
            departmentID: form.formData.departmentID && form.formData.departmentID.trim() ? form.formData.departmentID : null,
            // Include department information
            departmentName: selectedDepartment?.departmentName || null,
            departmentColor: selectedDepartment?.departmentColor || null,
            departmentPrefix: selectedDepartment?.departmentPrefix || null,
            scriptID: scriptId,
            sequence: 1, // Will be handled by edit queue / auto-sort
            isActive: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_deleted: false,
            // Pass auto-sort flag to parent
            _autoSort: autoSortCues
        };
        
        // Reset form and close modal
        form.resetForm();
        onClose();
        onElementCreated(elementData);
    };

    const canSubmit = form.formData.description.trim().length >= 3 && 
                     // Department only required for cues, not notes
                     (form.formData.elementType === 'NOTE' || form.formData.departmentID.trim().length > 0) &&
                     form.formData.timeOffsetMs >= 0 &&
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
                isLoading: false,
                isDisabled: !canSubmit
            }}
            secondaryAction={{
                label: "Cancel",
                variant: "outline",
                onClick: onClose
            }}
            validationErrors={form.fieldErrors}
            showValidationErrors={form.fieldErrors.length > 0}
            showCloseButton={false}
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
                            if (value === 'NOTE') {
                                form.updateField('departmentID', '');
                            }
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

                {/* Department for Cues, Color Picker for Notes */}
                {form.formData.elementType === 'CUE' ? (
                    <FormControl isRequired>
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
                ) : (
                    <FormControl>
                        <FormLabel>Background Color</FormLabel>
                        <HStack spacing={3} align="center">
                            <Input
                                type="color"
                                value={form.formData.customColor || '#E2E8F0'}
                                onChange={(e) => form.updateField('customColor', e.target.value)}
                                width="60px"
                                height="40px"
                                padding="1"
                                cursor="pointer"
                            />
                            <Input
                                value={form.formData.customColor || '#E2E8F0'}
                                onChange={(e) => form.updateField('customColor', e.target.value)}
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
                                        border={form.formData.customColor === color.value ? '3px solid' : '1px solid'}
                                        borderColor={form.formData.customColor === color.value ? 'white' : 'gray.300'}
                                        onClick={() => form.updateField('customColor', color.value)}
                                        _hover={{ transform: 'scale(1.1)' }}
                                        title={color.name}
                                        tabIndex={-1}
                                    />
                                ))}
                            </HStack>
                        </HStack>
                    </FormControl>
                )}

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
