// frontend/src/pages/script/components/modals/OptionsModal.tsx

import React, { useState, useEffect } from 'react';
import {
    VStack,
    FormControl,
    FormLabel,
    Checkbox,
    HStack
} from '@chakra-ui/react';
import { BaseModal } from '../../../../components/base/BaseModal';
import { UserOptions } from '../../../../hooks/useUserOptions';

interface OptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialOptions: UserOptions;
    onSave: (options: UserOptions) => Promise<void>;
    onPreview?: (options: UserOptions) => void;
}

export const OptionsModal: React.FC<OptionsModalProps> = ({
    isOpen,
    onClose,
    initialOptions,
    onSave,
    onPreview
}) => {
    const [localOptions, setLocalOptions] = useState<UserOptions>(initialOptions);

    // Update local state only when modal first opens
    useEffect(() => {
        if (isOpen) {
            setLocalOptions(initialOptions);
        }
    }, [isOpen]); // Remove initialOptions dependency!

    const handleColorizeChange = (checked: boolean) => {
        const newOptions = { ...localOptions, colorizeDepNames: checked };
        setLocalOptions(newOptions);
        onPreview?.(newOptions);
    };

    const handleClockTimesChange = (checked: boolean) => {
        const newOptions = { ...localOptions, showClockTimes: checked };
        setLocalOptions(newOptions);
        onPreview?.(newOptions);
    };

    const handleAutoSortChange = (checked: boolean) => {
        const newOptions = { ...localOptions, autoSortCues: checked };
        setLocalOptions(newOptions);
        onPreview?.(newOptions);
    };

    const handleClose = async () => {
        // Save options before closing
        await onSave(localOptions);
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
                            isChecked={localOptions.colorizeDepNames}
                            onChange={(e) => handleColorizeChange(e.target.checked)}
                        />
                        <FormLabel
                            mb="0"
                            fontSize="md"
                            fontWeight="semibold"
                            onClick={() => handleColorizeChange(!localOptions.colorizeDepNames)}
                            cursor="pointer"
                        >
                            Colorize Department Names
                        </FormLabel>
                    </HStack>
                </FormControl>

                <FormControl>
                    <HStack align="center">
                        <Checkbox
                            isChecked={localOptions.autoSortCues}
                            onChange={(e) => handleAutoSortChange(e.target.checked)}
                        />
                        <FormLabel
                            mb="0"
                            fontSize="md"
                            fontWeight="semibold"
                            onClick={() => handleAutoSortChange(!localOptions.autoSortCues)}
                            cursor="pointer"
                        >
                            Auto-Sort Cues
                        </FormLabel>
                    </HStack>
                </FormControl>

                <FormControl>
                    <HStack align="center">
                        <Checkbox
                            isChecked={localOptions.showClockTimes}
                            onChange={(e) => handleClockTimesChange(e.target.checked)}
                        />
                        <FormLabel
                            mb="0"
                            fontSize="md"
                            fontWeight="semibold"
                            onClick={() => handleClockTimesChange(!localOptions.showClockTimes)}
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