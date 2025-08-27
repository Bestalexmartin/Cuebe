// frontend/src/features/script/components/modals/OptionsModal.tsx

import React, { useState, useEffect } from 'react';
import {
    VStack,
    FormControl,
    FormLabel,
    Switch,
    HStack,
    Text,
    Divider,
    Input
} from '@chakra-ui/react';
import { BaseModal } from '../../../../components/base/BaseModal';
import { UserPreferences } from '../../../../hooks/useUserPreferences';

interface OptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialOptions: UserPreferences;
    onSave: (preferences: UserPreferences) => Promise<void>;
    onPreview?: (preferences: UserPreferences) => void;
    onAutoSortChange?: (value: boolean) => Promise<void>;
    onColorizeChange?: (value: boolean) => Promise<void>;
    onClockTimesChange?: (value: boolean) => Promise<void>;
    onMilitaryTimeChange?: (value: boolean) => Promise<void>;
    onDangerModeChange?: (value: boolean) => Promise<void>;
    onAutoSaveIntervalChange?: (value: number) => Promise<void>;
}

export const OptionsModal: React.FC<OptionsModalProps> = ({
    isOpen,
    onClose,
    initialOptions,
    onSave,
    onPreview,
    onAutoSortChange,
    onClockTimesChange,
    onMilitaryTimeChange,
    onDangerModeChange,
    onAutoSaveIntervalChange
}) => {
    const [localPreferences, setLocalPreferences] = useState<UserPreferences>(initialOptions);

    // Update local state when modal opens - always refresh with current values
    useEffect(() => {
        if (isOpen) {
            // Force update with fresh initialOptions every time modal opens
            setLocalPreferences({...initialOptions});
        }
    }, [isOpen]); // Only depend on isOpen to force refresh every time modal opens


    const handleClockTimesChange = async (checked: boolean) => {
        const newPreferences = { ...localPreferences, showClockTimes: checked };
        setLocalPreferences(newPreferences);
        onPreview?.(newPreferences);
        
        // Trigger immediate update if callback is provided
        if (onClockTimesChange) {
            await onClockTimesChange(checked);
        }
    };

    const handleAutoSortChange = async (checked: boolean) => {
        const newPreferences = { ...localPreferences, autoSortCues: checked };
        setLocalPreferences(newPreferences);
        onPreview?.(newPreferences);
        
        // Trigger immediate update if callback is provided
        if (onAutoSortChange) {
            await onAutoSortChange(checked);
        }
    };

    const handleMilitaryTimeChange = async (checked: boolean) => {
        const newPreferences = { ...localPreferences, useMilitaryTime: checked };
        setLocalPreferences(newPreferences);
        onPreview?.(newPreferences);
        
        // Trigger immediate update if callback is provided
        if (onMilitaryTimeChange) {
            await onMilitaryTimeChange(checked);
        }
    };

    const handleDangerModeChange = async (checked: boolean) => {
        const newPreferences = { ...localPreferences, dangerMode: checked };
        setLocalPreferences(newPreferences);
        onPreview?.(newPreferences);
        
        // Trigger immediate update if callback is provided
        if (onDangerModeChange) {
            await onDangerModeChange(checked);
        }
    };

    const handleAutoSaveIntervalChange = async (value: string) => {
        const interval = parseInt(value);
        const newPreferences = { ...localPreferences, autoSaveInterval: interval };
        setLocalPreferences(newPreferences);
        onPreview?.(newPreferences);
        
        // Trigger immediate update if callback is provided
        if (onAutoSaveIntervalChange) {
            await onAutoSaveIntervalChange(interval);
        }
    };

    const handleClose = async () => {
        // Save preferences before closing
        await onSave(localPreferences);
        onClose();
    };

    return (
        <BaseModal
            title="Script Edit Options"
            headerIcon="options"
            headerIconColor="page.text"
            isOpen={isOpen}
            onClose={handleClose}
            secondaryAction={{
                label: "Close",
                variant: "secondary",
                onClick: handleClose
            }}
            errorBoundaryContext="OptionsModal"
        >
            <VStack spacing={3} align="stretch">
                <FormControl>
                    <HStack align="center" spacing={5}>
                        <Switch
                            id="autosort-switch"
                            isChecked={localPreferences.autoSortCues}
                            onChange={(e) => handleAutoSortChange(e.target.checked)}
                            colorScheme="blue"
                            size="md"
                        />
                        <FormLabel
                            mb="0"
                            fontSize="md"
                            htmlFor="autosort-switch"
                        >
                            Auto-Sort Cues
                        </FormLabel>
                    </HStack>
                </FormControl>

                <FormControl>
                    <HStack align="center" spacing={5}>
                        <Switch
                            id="clocktimes-switch"
                            isChecked={localPreferences.showClockTimes}
                            onChange={(e) => handleClockTimesChange(e.target.checked)}
                            colorScheme="blue"
                            size="md"
                        />
                        <FormLabel
                            mb="0"
                            fontSize="md"
                            htmlFor="clocktimes-switch"
                        >
                            Show Clock Times
                        </FormLabel>
                    </HStack>
                </FormControl>

                <FormControl>
                    <HStack align="center" spacing={5}>
                        <Switch
                            id="militarytime-switch"
                            isChecked={localPreferences.useMilitaryTime}
                            onChange={(e) => handleMilitaryTimeChange(e.target.checked)}
                            colorScheme="blue"
                            size="md"
                        />
                        <FormLabel
                            mb="0"
                            fontSize="md"
                            htmlFor="militarytime-switch"
                        >
                            Use Military Time
                        </FormLabel>
                    </HStack>
                </FormControl>

                <Divider mt={3} />
                
                <Text fontSize="md" fontWeight="bold" color="red.500" mt={1}>
                    Advanced Options
                </Text>

                <FormControl>
                    <HStack align="center" spacing={5}>
                        <Switch
                            id="dangermode-switch"
                            isChecked={localPreferences.dangerMode}
                            onChange={(e) => handleDangerModeChange(e.target.checked)}
                            colorScheme="red"
                            size="md"
                        />
                        <FormLabel
                            mb="0"
                            fontSize="md"
                            htmlFor="dangermode-switch"
                        >
                            Danger Mode
                        </FormLabel>
                    </HStack>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                        Skip confirmation dialogs for delete and other destructive actions
                    </Text>
                </FormControl>

                <FormControl>
                    <HStack align="center" spacing={5} mb={1}>
                        <Switch
                            id="autosave-switch"
                            isChecked={localPreferences.autoSaveInterval > 0}
                            onChange={(e) => {
                                // If turning on and interval is 0, default to 60 seconds
                                const newInterval = e.target.checked 
                                    ? (localPreferences.autoSaveInterval || 60)
                                    : 0;
                                handleAutoSaveIntervalChange(newInterval.toString());
                            }}
                            colorScheme="blue"
                            size="md"
                        />
                        <FormLabel mb={0} fontSize="md" htmlFor="autosave-switch">
                            Auto-Save
                        </FormLabel>
{localPreferences.autoSaveInterval > 0 && (
                            <HStack spacing={2} ml={-2}>
                                <Input
                                    type="number"
                                    value={localPreferences.autoSaveInterval}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (!isNaN(value) && value >= 10 && value <= 300) {
                                            handleAutoSaveIntervalChange(value.toString());
                                        }
                                    }}
                                    min={10}
                                    max={300}
                                    size="xs"
                                    width="60px"
                                    textAlign="center"
                                />
                                <Text fontSize="xs" color="gray.600">seconds</Text>
                            </HStack>
                        )}
                    </HStack>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                        Automatically save changes without preserving edit history
                    </Text>
                </FormControl>
            </VStack>
        </BaseModal>
    );
};
