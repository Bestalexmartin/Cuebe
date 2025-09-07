import React, { useEffect, useState } from 'react';
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

interface SharedPreferencesPageProps {
    useMilitaryTime: boolean;
    lookaheadSeconds: number;
    onMilitaryTimeChange: (checked: boolean) => void;
    onLookaheadSecondsChange: (seconds: number) => void;
}

export const SharedPreferencesPage: React.FC<SharedPreferencesPageProps> = ({
    useMilitaryTime,
    lookaheadSeconds,
    onMilitaryTimeChange,
    onLookaheadSecondsChange
}) => {
    const [lookaheadInputValue, setLookaheadInputValue] = useState<string>(String(lookaheadSeconds));

    // Keep local input in sync when parent prop changes
    useEffect(() => {
        setLookaheadInputValue(String(lookaheadSeconds));
    }, [lookaheadSeconds]);

    return (
        <>
            <VStack spacing={3} align="stretch">
                <Text fontSize="md" fontWeight="bold" color="blue.500" mt={1}>
                    View Options
                </Text>

                <FormControl ml="20px">
                    <HStack align="center" spacing={5}>
                        <Switch
                            id="militarytime-switch"
                            isChecked={useMilitaryTime}
                            onChange={(e) => onMilitaryTimeChange(e.target.checked)}
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

                <Box mt={3}>
                    <Divider />
                </Box>

                <Text fontSize="md" fontWeight="bold" color="blue.500" mt={1}>
                    Playback Options
                </Text>

                <FormControl ml="20px">
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
                                            const raw = e.target.value;
                                            const parsed = parseInt(raw, 10);
                                            let finalValue: number;
                                            if (isNaN(parsed)) {
                                                // Fallback to previous valid prop value
                                                finalValue = lookaheadSeconds || 30;
                                            } else {
                                                // Clamp to allowed range
                                                finalValue = Math.max(5, Math.min(60, parsed));
                                            }
                                            setLookaheadInputValue(String(finalValue));
                                            if (finalValue !== lookaheadSeconds) {
                                                onLookaheadSecondsChange(finalValue);
                                            }
                                        }}
                                        min={5}
                                        max={60}
                                        size="sm"
                                        width="60px"
                                        textAlign="center"
                                        fontSize="16pt"
                                    />
                                    <Text fontSize="md">seconds</Text>
                                </HStack>
                            </HStack>
                            <Text fontSize="xs" color="gray.500" lineHeight="1.3" mt={2}>
                                How many seconds ahead to highlight upcoming cues during playback
                            </Text>
                        </VStack>
                    </HStack>
                </FormControl>
            </VStack>
        </>
    );
};
