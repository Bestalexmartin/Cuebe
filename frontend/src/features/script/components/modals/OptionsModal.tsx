// frontend/src/features/script/components/modals/OptionsModal.tsx

import React, { useState, useEffect } from 'react';
import {
    VStack,
    FormControl,
    FormLabel,
    Switch,
    HStack
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
}

export const OptionsModal: React.FC<OptionsModalProps> = ({
    isOpen,
    onClose,
    initialOptions,
    onSave,
    onPreview,
    onAutoSortChange,
    onColorizeChange,
    onClockTimesChange
}) => {
    const [localPreferences, setLocalPreferences] = useState<UserPreferences>(initialOptions);

    // Update local state when modal opens - always refresh with current values
    useEffect(() => {
        if (isOpen) {
            // Force update with fresh initialOptions every time modal opens
            setLocalPreferences({...initialOptions});
        }
    }, [isOpen]); // Only depend on isOpen to force refresh every time modal opens

    const handleColorizeChange = async (checked: boolean) => {
        const newPreferences = { ...localPreferences, colorizeDepNames: checked };
        setLocalPreferences(newPreferences);
        onPreview?.(newPreferences);
        
        // Trigger immediate update if callback is provided
        if (onColorizeChange) {
            await onColorizeChange(checked);
        }
    };

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
        
        // Trigger immediate auto-sort if callback is provided
        if (onAutoSortChange) {
            await onAutoSortChange(checked);
        }
    };

    const handleClose = async () => {
        // Save preferences before closing
        await onSave(localPreferences);
        onClose();
    };

    return (
        <BaseModal
            title="Script Display Options"
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
                            id="colorize-switch"
                            isChecked={localPreferences.colorizeDepNames}
                            onChange={(e) => handleColorizeChange(e.target.checked)}
                            colorScheme="blue"
                            size="md"
                        />
                        <FormLabel
                            mb="0"
                            fontSize="md"
                            htmlFor="colorize-switch"
                        >
                            Colorize Department Names
                        </FormLabel>
                    </HStack>
                </FormControl>

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
            </VStack>
        </BaseModal>
    );
};
