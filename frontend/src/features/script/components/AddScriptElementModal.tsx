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
    Flex
} from '@chakra-ui/react';
import { AppIcon } from '../../../components/AppIcon';
import { BaseModal } from '../../../components/base/BaseModal';
import { useResource } from '../../../hooks/useResource';
import { getApiUrl } from '../../../config/api';
import { useValidatedFormSchema } from '../../../components/forms/ValidatedForm';
import { ScriptElementCreate, ElementType, PriorityLevel } from '../types/scriptElements';
import { formatTimeOffset, parseTimeToMs } from '../../../utils/timeUtils';
import { ColorSelector, PRESET_COLORS } from './ColorSelector';
import { useUserPreferences } from '../../../hooks/useUserPreferences';

// TypeScript interfaces
interface Department {
    department_id: string;
    department_name: string;
    department_color: string;
}

interface AddScriptElementModalProps {
    isOpen: boolean;
    onClose: () => void;
    scriptId: string;
    onElementCreated: (elementData: any) => void;
    autoSortCues: boolean;
}

const INITIAL_FORM_STATE: ScriptElementCreate = {
    element_type: 'CUE',
    element_name: '',
    offset_ms: 0,
    cue_notes: '',
    department_id: '',
    priority: 'NORMAL',
    custom_color: '', // For note background color
    location_details: '' // Stage location
};


const ELEMENT_TYPE_OPTIONS: { value: ElementType; label: string; description: string }[] = [
    { value: 'CUE', label: 'Cue', description: 'Technical cue (lighting, sound, etc.)' },
    { value: 'NOTE', label: 'Note', description: 'Informational note or reminder' }
];


const PRIORITY_OPTIONS: { value: PriorityLevel; label: string }[] = [
    { value: 'SAFETY', label: 'Safety' },
    { value: 'CRITICAL', label: 'Critical' },
    { value: 'HIGH', label: 'High' },
    { value: 'NORMAL', label: 'Normal' },
    { value: 'LOW', label: 'Low' },
    { value: 'OPTIONAL', label: 'Optional' }
];



// Helper functions moved to shared utils

export const AddScriptElementModal: React.FC<AddScriptElementModalProps> = ({
    isOpen,
    onClose,
    scriptId,
    onElementCreated,
    autoSortCues
}) => {
    const { preferences } = useUserPreferences();
    
    // Separate state for time input to allow free typing
    const [timeInputValue, setTimeInputValue] = useState('00:00');
    
    const form = useValidatedFormSchema<ScriptElementCreate>(
        INITIAL_FORM_STATE,
        'scriptElement',
        'element',
        undefined,
        {
            validateOnBlur: true,
            showFieldErrorsInToast: false
        }
    );

    // Department data management
    const {
        data: departments,
        isLoading: isLoadingDepartments,
        refetch: refetchDepartments,
    } = useResource<Department>(getApiUrl('/api/me/departments'), {
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
        const selectedDepartment = form.formData.department_id && form.formData.department_id.trim() 
            ? departments?.find(d => d.department_id === form.formData.department_id)
            : null;
        
        // Create element data locally instead of submitting to API
        const elementData = {
            ...form.formData,
            element_id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Temporary ID
            element_type: form.formData.element_type,
            priority: form.formData.priority || 'NORMAL',
            // Convert empty departmentID to null for notes
            department_id: form.formData.department_id && form.formData.department_id.trim() ? form.formData.department_id : null,
            // Include department information
            department_name: selectedDepartment?.department_name || null,
            department_color: selectedDepartment?.department_color || null,
            departmentPrefix: selectedDepartment?.department_name || null,
            script_id: scriptId,
            // sequence will be calculated by useElementActions based on insertion position
            is_active: true,
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

    const canSubmit = form.formData.element_name.trim().length >= 3 && 
                     // Department only required for cues, not notes
                     (form.formData.element_type === 'NOTE' || (form.formData.department_id && form.formData.department_id.trim().length > 0)) &&
                     Number.isFinite(form.formData.offset_ms) &&
                     form.fieldErrors.length === 0;

    return (
        <BaseModal
            title="Add Script Element"
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            primaryAction={{
                label: "Create Element",
                onClick: () => handleSubmit({} as React.FormEvent),
                variant: "primary",
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
        >
            <VStack spacing={4} align="stretch">
                {/* Element Type Selection - Cue or Note */}
                <FormControl isRequired>
                    <FormLabel>Element Type</FormLabel>
                    <RadioGroup
                        value={form.formData.element_type}
                        onChange={(value) => {
                            form.updateField('element_type', value as ElementType);
                            // Reset department field when switching to note
                            if (value === 'NOTE') {
                                form.updateField('department_id', '');
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

                {/* Row 2: Time Offset and Duration */}
                <HStack spacing={4}>
                    <FormControl isRequired>
                        <FormLabel>Time Offset</FormLabel>
                        <Input
                            type="text"
                            value={timeInputValue}
                            onChange={(e) => {
                                // Allow completely free typing
                                setTimeInputValue(e.target.value);
                            }}
                            onBlur={(e) => {
                                // Auto-format, update form data, and validate on blur
                                const ms = parseTimeToMs(e.target.value);
                                const formatted = formatTimeOffset(ms, preferences.useMilitaryTime);
                                setTimeInputValue(formatted || "0:00");
                                form.updateField('offset_ms', ms);
                                form.validateField('offset_ms');
                            }}
                            placeholder="0:00 or 0:00:00"
                        />
                    </FormControl>

                    <FormControl>
                        <FormLabel>Duration</FormLabel>
                        <Input
                            placeholder="0:00 or 0:00:00"
                        />
                    </FormControl>
                </HStack>

                {/* Row 3: Department for Cues, Color Picker for Notes */}
                {form.formData.element_type === 'CUE' ? (
                    <FormControl isRequired>
                        <FormLabel>Department</FormLabel>
                        <Menu>
                        <MenuButton
                            as={Button}
                            rightIcon={<AppIcon name='openmenu' />}
                            variant="outline"
                            width="100%"
                            textAlign="left"
                            isDisabled={isLoadingDepartments}
                            height="40px"
                        >
                            <Flex align="center" gap={2}>
                                {form.formData.department_id ? (
                                    <>
                                        <Box
                                            width="14px"
                                            height="14px"
                                            borderRadius="50%"
                                            bg={departments?.find(d => d.department_id === form.formData.department_id)?.department_color || 'gray.400'}
                                            flexShrink={0}
                                        />
                                        <Text isTruncated>
                                            {departments?.find(d => d.department_id === form.formData.department_id)?.department_name || 'Select department'}
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
                                    key={department.department_id}
                                    onClick={() => {
                                        form.updateField('department_id', department.department_id);
                                    }}
                                >
                                    <Flex align="center" gap={2}>
                                        <Box
                                            width="14px"
                                            height="14px"
                                            borderRadius="50%"
                                            bg={department.department_color}
                                            flexShrink={0}
                                        />
                                        <Text>{department.department_name}</Text>
                                    </Flex>
                                </MenuItem>
                            ))}
                        </MenuList>
                    </Menu>
                </FormControl>
                ) : (
                    <FormControl>
                        <FormLabel>Background Color</FormLabel>
                        <ColorSelector
                            selectedColor={form.formData.custom_color || PRESET_COLORS[0].value}
                            onColorChange={(color) => form.updateField('custom_color', color)}
                        />
                    </FormControl>
                )}

                {/* Row 4: Cue (Description) */}
                <FormControl isRequired>
                    <FormLabel>{form.formData.element_type === 'NOTE' ? 'Note' : 'Cue'}</FormLabel>
                    <Input
                        value={form.formData.element_name}
                        onChange={(e) => form.updateField('element_name', e.target.value)}
                        onBlur={() => form.validateField('element_name')}
                        placeholder="Describe what happens during this cue or note..."
                    />
                </FormControl>

                {/* Row 5: Notes */}
                <FormControl>
                    <FormLabel>Notes</FormLabel>
                    <Textarea
                        value={form.formData.cue_notes}
                        onChange={(e) => form.updateField('cue_notes', e.target.value)}
                        onBlur={() => form.validateField('cue_notes')}
                        placeholder="Additional instructions or details..."
                        minHeight="60px"
                        resize="vertical"
                    />
                </FormControl>

                {/* Row 6: Location */}
                <FormControl>
                    <FormLabel>Location</FormLabel>
                    <Input
                        value={form.formData.location_details}
                        onChange={(e) => form.updateField('location_details', e.target.value)}
                        placeholder="e.g., Stage left, Booth, etc."
                    />
                </FormControl>

                {/* Row 7: Priority */}
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
            </VStack>
        </BaseModal>
    );
};
