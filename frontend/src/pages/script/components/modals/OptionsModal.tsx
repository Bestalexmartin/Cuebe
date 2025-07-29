// frontend/src/pages/script/components/modals/OptionsModal.tsx

import React from 'react';
import {
    VStack,
    FormControl,
    FormLabel,
    Checkbox,
    HStack
} from '@chakra-ui/react';
import { BaseModal } from '../../../../components/base/BaseModal';

interface OptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    colorizeDepNames: boolean;
    onColorizeDepNamesChange: (value: boolean) => void;
    showClockTimes: boolean;
    onShowClockTimesChange: (value: boolean) => void;
}

export const OptionsModal: React.FC<OptionsModalProps> = ({
    isOpen,
    onClose,
    colorizeDepNames,
    onColorizeDepNamesChange,
    showClockTimes,
    onShowClockTimesChange
}) => {
    const handleColorizeChange = (checked: boolean) => {
        onColorizeDepNamesChange(checked);
    };

    const handleClockTimesChange = (checked: boolean) => {
        onShowClockTimesChange(checked);
    };

    return (
        <BaseModal
            title="Script Display Options"
            isOpen={isOpen}
            onClose={onClose}
            secondaryAction={{
                label: "Close",
                variant: "secondary",
                onClick: onClose
            }}
            errorBoundaryContext="OptionsModal"
        >
            <VStack spacing={6} align="stretch">
                <FormControl>
                    <HStack align="center">
                        <Checkbox
                            isChecked={colorizeDepNames}
                            onChange={(e) => handleColorizeChange(e.target.checked)}
                        />
                        <FormLabel
                            mb="0"
                            fontSize="md"
                            fontWeight="semibold"
                            onClick={() => handleColorizeChange(!colorizeDepNames)}
                            cursor="pointer"
                        >
                            Colorize Department Names
                        </FormLabel>
                    </HStack>
                </FormControl>

                <FormControl>
                    <HStack align="center">
                        <Checkbox
                            isChecked={showClockTimes}
                            onChange={(e) => handleClockTimesChange(e.target.checked)}
                        />
                        <FormLabel
                            mb="0"
                            fontSize="md"
                            fontWeight="semibold"
                            onClick={() => handleClockTimesChange(!showClockTimes)}
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