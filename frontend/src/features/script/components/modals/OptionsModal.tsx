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
    Input,
    Box
} from '@chakra-ui/react';
import { useEnhancedToast } from '../../../../utils/toastUtils';
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
    onLookaheadSecondsChange?: (value: number) => Promise<void>;
    activeMode?: string; // Current script mode
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
    onAutoSaveIntervalChange,
    onLookaheadSecondsChange,
    activeMode
}) => {
    const [localPreferences, setLocalPreferences] = useState<UserPreferences>(initialOptions);
    const [lookaheadInputValue, setLookaheadInputValue] = useState<string>('');
    const [autoSaveInputValue, setAutoSaveInputValue] = useState<string>('');
    const { showError } = useEnhancedToast();

    // Update local state when modal opens or when initialOptions change
    useEffect(() => {
        if (isOpen) {
            // Force update with fresh initialOptions every time modal opens or options change
            // Ensure lookaheadSeconds has a default value if missing
            const preferencesWithDefaults = {
                ...initialOptions,
                lookaheadSeconds: initialOptions.lookaheadSeconds ?? 30
            };
            setLocalPreferences(preferencesWithDefaults);
            setLookaheadInputValue(String(preferencesWithDefaults.lookaheadSeconds));
            setAutoSaveInputValue(String(preferencesWithDefaults.autoSaveInterval));
        }
    }, [isOpen]); // Only depend on isOpen to avoid resetting local state during user input


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

    const handleLookaheadSecondsChange = async (value: string) => {
        console.log('🔥 handleLookaheadSecondsChange called with:', value);
        const seconds = parseInt(value);
        const newPreferences = { ...localPreferences, lookaheadSeconds: seconds };
        setLocalPreferences(newPreferences);
        onPreview?.(newPreferences);
        
        // Trigger immediate update if callback is provided
        if (onLookaheadSecondsChange) {
            console.log('🔥 About to call onLookaheadSecondsChange with:', seconds);
            await onLookaheadSecondsChange(seconds);
            console.log('🔥 onLookaheadSecondsChange completed');
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
            primaryAction={{
                label: "Update Options",
                variant: "primary",
                onClick: handleClose
            }}
            secondaryAction={{
                label: "Close",
                variant: "secondary",
                onClick: handleClose
            }}
            errorBoundaryContext="OptionsModal"
        >
            <VStack spacing={3} align="stretch" px="40px">
                <FormControl>
                    <HStack align="center" spacing={5}>
                        <Switch
                            id="autosort-switch"
                            isChecked={localPreferences.autoSortCues}
                            onChange={(e) => handleAutoSortChange(e.target.checked)}
                            colorScheme="blue"
                            size="md"
                            isDisabled={activeMode === 'view'}
                        />
                        <FormLabel
                            mb="0"
                            fontSize="md"
                            htmlFor="autosort-switch"
                        >
                            Auto-Sort Cues{activeMode === 'view' ? ' (locked)' : ''}
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
                            isDisabled={activeMode === 'view'}
                        />
                        <FormLabel
                            mb="0"
                            fontSize="md"
                            htmlFor="clocktimes-switch"
                        >
                            Show Clock Times{activeMode === 'view' ? ' (locked)' : ''}
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

                <Box mx="-40px" mt={3}>
                    <Divider />
                </Box>
                
                <Text fontSize="md" fontWeight="bold" color="blue.500" mt={1} ml="-40px">
                    Playback Options
                </Text>

                <FormControl>
                    <HStack align="start" spacing={5} mb={1}>
                        <VStack align="start" spacing={0} flex={1}>
                            <HStack spacing={2} align="center" width="100%">
                                <FormLabel mb={0} fontSize="md">
                                    Playback Lookahead
                                </FormLabel>
                                <HStack spacing={2}>
                                    <Input
                                        type="number"
                                        value={lookaheadInputValue}
                                        onChange={(e) => {
                                            setLookaheadInputValue(e.target.value);
                                        }}
                                        onBlur={(e) => {
                                            const value = e.target.value;
                                            const numValue = parseInt(value);
                                            
                                            // Validate on blur and reset if invalid
                                            if (isNaN(numValue) || numValue < 5 || numValue > 60) {
                                                showError('Playback Lookahead must be between 5 and 60 seconds');
                                                setLookaheadInputValue('30');
                                                const newPreferences = { ...localPreferences, lookaheadSeconds: 30 };
                                                setLocalPreferences(newPreferences);
                                                onPreview?.(newPreferences);
                                            } else {
                                                const newPreferences = { ...localPreferences, lookaheadSeconds: numValue };
                                                setLocalPreferences(newPreferences);
                                                onPreview?.(newPreferences);
                                            }
                                        }}
                                        min={5}
                                        max={60}
                                        size="xs"
                                        width="60px"
                                        textAlign="center"
                                    />
                                    <Text fontSize="xs" color="gray.600">seconds</Text>
                                </HStack>
                            </HStack>
                            <Text fontSize="xs" color="gray.500" lineHeight="1.3" whiteSpace="normal" maxWidth="300px">
                                How many seconds ahead to highlight upcoming cues during playback
                            </Text>
                        </VStack>
                    </HStack>
                </FormControl>

                <Box mx="-40px" mt={3}>
                    <Divider />
                </Box>
                
                <Text fontSize="md" fontWeight="bold" color="red.500" mt={1} ml="-40px">
                    Advanced Options
                </Text>

                <FormControl>
                    <HStack align="start" spacing={5}>
                        <Switch
                            id="dangermode-switch"
                            isChecked={localPreferences.dangerMode}
                            onChange={(e) => handleDangerModeChange(e.target.checked)}
                            colorScheme="red"
                            size="md"
                            mt="3px"
                        />
                        <VStack align="start" spacing={0}>
                            <FormLabel
                                mb="0"
                                fontSize="md"
                                htmlFor="dangermode-switch"
                            >
                                Danger Mode
                            </FormLabel>
                            <Text fontSize="xs" color="gray.500" lineHeight="1.3" whiteSpace="normal" maxWidth="300px">
                                Skip confirmation dialogs for delete and other destructive actions
                            </Text>
                        </VStack>
                    </HStack>
                </FormControl>

                <FormControl>
                    <HStack align="start" spacing={5} mb={1}>
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
                            colorScheme="red"
                            size="md"
                            mt="3px"
                        />
                        <VStack align="start" spacing={0} flex={1}>
                            <HStack spacing={2} align="center" width="100%">
                                <FormLabel mb={0} fontSize="md" htmlFor="autosave-switch">
                                    Auto-Save
                                </FormLabel>
                                {localPreferences.autoSaveInterval > 0 && (
                                    <HStack spacing={2}>
                                        <Input
                                            type="number"
                                            value={autoSaveInputValue}
                                            onChange={(e) => {
                                                setAutoSaveInputValue(e.target.value);
                                            }}
                                            onBlur={(e) => {
                                                const value = e.target.value;
                                                const numValue = parseInt(value);
                                                
                                                // Validate on blur and reset if invalid
                                                if (value === '' || value === '0') {
                                                    setAutoSaveInputValue('0');
                                                    const newPreferences = { ...localPreferences, autoSaveInterval: 0 };
                                                    setLocalPreferences(newPreferences);
                                                    onPreview?.(newPreferences);
                                                } else if (isNaN(numValue) || numValue < 30 || numValue > 90) {
                                                    showError('Auto-Save interval must be between 30 and 90 seconds');
                                                    setAutoSaveInputValue('60');
                                                    const newPreferences = { ...localPreferences, autoSaveInterval: 60 };
                                                    setLocalPreferences(newPreferences);
                                                    onPreview?.(newPreferences);
                                                } else {
                                                    const newPreferences = { ...localPreferences, autoSaveInterval: numValue };
                                                    setLocalPreferences(newPreferences);
                                                    onPreview?.(newPreferences);
                                                }
                                            }}
                                            min={30}
                                            max={90}
                                            size="xs"
                                            width="60px"
                                            textAlign="center"
                                        />
                                        <Text fontSize="xs" color="gray.600">seconds</Text>
                                    </HStack>
                                )}
                            </HStack>
                            <Text fontSize="xs" color="gray.500" lineHeight="1.3" whiteSpace="normal" maxWidth="300px">
                                Automatically save changes without preserving edit history
                            </Text>
                        </VStack>
                    </HStack>
                </FormControl>
            </VStack>
        </BaseModal>
    );
};
