import React, { useState, useEffect } from 'react';
import {
    VStack,
    FormControl,
    FormLabel,
    Switch,
    HStack,
    Text,
    Input,
    Box,
    Divider
} from '@chakra-ui/react';
import { useEnhancedToast } from '../../../utils/toastUtils';
import { BaseModal } from '../../../components/base/BaseModal';

interface GuestOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialLookaheadSeconds: number;
    initialUseMilitaryTime: boolean;
    onSave: (lookaheadSeconds: number, useMilitaryTime: boolean) => Promise<void>;
}

export const GuestOptionsModal: React.FC<GuestOptionsModalProps> = ({
    isOpen,
    onClose,
    initialLookaheadSeconds,
    initialUseMilitaryTime,
    onSave
}) => {
    const [lookaheadSeconds, setLookaheadSeconds] = useState(initialLookaheadSeconds);
    const [useMilitaryTime, setUseMilitaryTime] = useState(initialUseMilitaryTime);
    const [lookaheadInputValue, setLookaheadInputValue] = useState<string>('');
    const { showError, showSuccess } = useEnhancedToast();

    useEffect(() => {
        if (isOpen) {
            setLookaheadSeconds(initialLookaheadSeconds);
            setUseMilitaryTime(initialUseMilitaryTime);
            setLookaheadInputValue(initialLookaheadSeconds.toString());
        }
    }, [isOpen, initialLookaheadSeconds, initialUseMilitaryTime]);

    const handleMilitaryTimeChange = async (checked: boolean) => {
        setUseMilitaryTime(checked);
    };

    const handleClose = async () => {
        try {
            await onSave(lookaheadSeconds, useMilitaryTime);
            showSuccess('Preferences Updated', 'Your preferences have been saved successfully.');
            onClose();
        } catch (error) {
            showError('Failed to save preferences');
        }
    };

    return (
        <BaseModal
            title="Preferences"
            headerIcon="options"
            headerIconColor="page.text"
            isOpen={isOpen}
            onClose={handleClose}
            primaryAction={{
                label: "Update Preferences",
                variant: "primary",
                onClick: handleClose
            }}
            secondaryAction={{
                label: "Close",
                variant: "secondary",
                onClick: handleClose
            }}
            errorBoundaryContext="GuestOptionsModal"
        >
            <VStack spacing={3} align="stretch" px="40px">
                <FormControl>
                    <HStack align="center" spacing={5}>
                        <Switch
                            id="militarytime-switch"
                            isChecked={useMilitaryTime}
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
                                            const value = e.target.value;
                                            setLookaheadInputValue(value);
                                            const numValue = parseInt(value);
                                            if (!isNaN(numValue)) {
                                                setLookaheadSeconds(numValue);
                                            }
                                        }}
                                        onBlur={async (e) => {
                                            const value = e.target.value;
                                            const numValue = parseInt(value);
                                            
                                            if (isNaN(numValue) || numValue < 5 || numValue > 60) {
                                                showError('Playback Lookahead must be between 5 and 60 seconds');
                                                setLookaheadInputValue('30');
                                                setLookaheadSeconds(30);
                                            } else {
                                                setLookaheadSeconds(numValue);
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
            </VStack>
        </BaseModal>
    );
};
