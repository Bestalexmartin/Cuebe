// frontend/src/features/script/components/modals/GroupElementsModal.tsx

import React, { useState } from 'react';
import {
    VStack,
    HStack,
    Input,
    FormControl,
    FormLabel,
    FormErrorMessage,
    Button
} from '@chakra-ui/react';
import { BaseModal } from '../../../../components/base/BaseModal';

// Preset colors for group backgrounds - consistent with note colors
const GROUP_PRESET_COLORS = [
    { name: 'Default', value: '#E2E8F0' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Grey', value: '#808080' },
    { name: 'Black', value: '#10151C' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Yellow', value: '#EAB308' },
];

interface GroupElementsModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedElementIds: string[];
    onConfirm: (groupName: string, backgroundColor: string) => void;
}

export const GroupElementsModal: React.FC<GroupElementsModalProps> = ({
    isOpen,
    onClose,
    selectedElementIds: _,
    onConfirm
}) => {
    const [groupName, setGroupName] = useState('');
    const [selectedColor, setSelectedColor] = useState(GROUP_PRESET_COLORS[0].value);
    const [errors, setErrors] = useState<{ groupName?: string }>({});

    const handleClose = () => {
        setGroupName('');
        setSelectedColor(GROUP_PRESET_COLORS[0].value);
        setErrors({});
        onClose();
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        
        const newErrors: { groupName?: string } = {};

        if (!groupName.trim()) {
            newErrors.groupName = 'Group name is required';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onConfirm(groupName.trim(), selectedColor);
        handleClose();
    };

    const canSubmit = groupName.trim().length > 0;

    return (
        <BaseModal
            title="Create Element Group"
            isOpen={isOpen}
            onClose={handleClose}
            onSubmit={handleSubmit}
            primaryAction={{
                label: "Create Group",
                onClick: () => handleSubmit({} as React.FormEvent),
                variant: "primary",
                isLoading: false,
                isDisabled: !canSubmit
            }}
            secondaryAction={{
                label: "Cancel",
                variant: "outline",
                onClick: handleClose
            }}
            validationErrors={Object.keys(errors).length > 0 ? [{ field: 'groupName', message: errors.groupName || '', code: 'REQUIRED' }] : []}
            showValidationErrors={Object.keys(errors).length > 0}
        >
            <VStack spacing={4} align="stretch">
                <FormControl isRequired isInvalid={!!errors.groupName}>
                    <FormLabel>Group Name</FormLabel>
                    <Input
                        value={groupName}
                        onChange={(e) => {
                            setGroupName(e.target.value);
                            if (errors.groupName) {
                                setErrors(prev => ({ ...prev, groupName: undefined }));
                            }
                        }}
                        placeholder="Enter a name for this group..."
                    />
                    <FormErrorMessage>
                        {errors.groupName}
                    </FormErrorMessage>
                </FormControl>

                <FormControl>
                    <FormLabel>Background Color</FormLabel>
                    <HStack spacing={3} align="center">
                        <Input
                            type="color"
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            width="60px"
                            height="40px"
                            padding="1"
                            cursor="pointer"
                        />
                        <Input
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            placeholder="#E2E8F0"
                            width="120px"
                            fontFamily="mono"
                        />
                        <HStack spacing={1} ml={2}>
                            {/* Preset color buttons */}
                            {GROUP_PRESET_COLORS.map((color) => (
                                <Button
                                    key={color.value}
                                    size="sm"
                                    height="30px"
                                    width="30px"
                                    minWidth="30px"
                                    backgroundColor={color.value}
                                    border={selectedColor === color.value ? '3px solid' : '1px solid'}
                                    borderColor={selectedColor === color.value ? 'white' : 'gray.300'}
                                    onClick={() => setSelectedColor(color.value)}
                                    _hover={{ transform: 'scale(1.1)' }}
                                    title={color.name}
                                    tabIndex={-1}
                                />
                            ))}
                        </HStack>
                    </HStack>
                </FormControl>
            </VStack>
        </BaseModal>
    );
};