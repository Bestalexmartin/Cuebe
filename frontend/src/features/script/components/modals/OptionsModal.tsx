// frontend/src/features/script/components/modals/OptionsModal.tsx

import React, { useState, useEffect } from 'react';
import {
    VStack,
    FormControl,
    FormLabel,
    Checkbox,
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
}

export const OptionsModal: React.FC<OptionsModalProps> = ({
    isOpen,
    onClose,
    initialOptions,
    onSave,
    onPreview,
    onAutoSortChange
}) => {
    const [localPreferences, setLocalPreferences] = useState<UserPreferences>(initialOptions);

    // Update local state only when modal first opens
    useEffect(() => {
        if (isOpen) {
            setLocalPreferences(initialOptions);
        }
    }, [isOpen]);

    const handleColorizeChange = (checked: boolean) => {
        const newPreferences = { ...localPreferences, colorizeDepNames: checked };
        setLocalPreferences(newPreferences);
        onPreview?.(newPreferences);
    };

    const handleClockTimesChange = (checked: boolean) => {
        const newPreferences = { ...localPreferences, showClockTimes: checked };
        setLocalPreferences(newPreferences);
        onPreview?.(newPreferences);
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
                    <HStack align="center">
                        <Checkbox
                            isChecked={localPreferences.colorizeDepNames}
                            onChange={(e) => handleColorizeChange(e.target.checked)}
                        />
                        <FormLabel
                            mb="0"
                            fontSize="md"
                            fontWeight="semibold"
                            onClick={() => handleColorizeChange(!localPreferences.colorizeDepNames)}
                            cursor="pointer"
                        >
                            Colorize Department Names
                        </FormLabel>
                    </HStack>
                </FormControl>

                <FormControl>
                    <HStack align="center">
                        <Checkbox
                            isChecked={localPreferences.autoSortCues}
                            onChange={(e) => handleAutoSortChange(e.target.checked)}
                        />
                        <FormLabel
                            mb="0"
                            fontSize="md"
                            fontWeight="semibold"
                            onClick={() => handleAutoSortChange(!localPreferences.autoSortCues)}
                            cursor="pointer"
                        >
                            Auto-Sort Cues
                        </FormLabel>
                    </HStack>
                </FormControl>

                <FormControl>
                    <HStack align="center">
                        <Checkbox
                            isChecked={localPreferences.showClockTimes}
                            onChange={(e) => handleClockTimesChange(e.target.checked)}
                        />
                        <FormLabel
                            mb="0"
                            fontSize="md"
                            fontWeight="semibold"
                            onClick={() => handleClockTimesChange(!localPreferences.showClockTimes)}
                            cursor="pointer"
                        >
                            Show Clock Times
                        </FormLabel>
                    </HStack>
                </FormControl>
            </VStack>
        </BaseModal>
    );
};
