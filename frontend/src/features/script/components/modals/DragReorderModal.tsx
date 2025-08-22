// frontend/src/features/script/components/modals/DragReorderModal.tsx

import React, { useState, useEffect } from 'react';
import {
    VStack,
    Text,
    Button,
    Box,
    Input,
    HStack
} from '@chakra-ui/react';
import { BaseModal } from '../../../../components/base/BaseModal';
import { formatTimeOffset } from '../../../../utils/timeUtils';
import { useUserPreferences } from '../../../../hooks/useUserPreferences';

interface DraggedElement {
    element_id: string;
    element_name: string;
    offset_ms: number;
}

interface DragReorderModalProps {
    isOpen: boolean;
    onClose: () => void;
    draggedElement: DraggedElement | null;
    elementAbove: DraggedElement | null;
    elementBelow: DraggedElement | null;
    onDisableAutoSort: () => void;
    onMatchBefore: () => void;
    onMatchAfter: () => void;
    onCustomTime: (timeMs: number) => void;
    onCancel: () => void;
}


export const DragReorderModal: React.FC<DragReorderModalProps> = ({
    isOpen,
    onClose: _,
    draggedElement,
    elementAbove,
    elementBelow,
    onDisableAutoSort,
    onMatchBefore,
    onMatchAfter,
    onCustomTime,
    onCancel
}) => {
    const { preferences } = useUserPreferences();
    
    // Calculate midpoint time for smart default
    const calculateMidpoint = () => {
        if (elementAbove && elementBelow) {
            const midpointMs = Math.round((elementAbove.offset_ms + elementBelow.offset_ms) / 2);
            return formatTimeOffset(midpointMs, preferences.useMilitaryTime);
        }
        return '';
    };
    
    const [customTime, setCustomTime] = useState<string>('');
    
    // Recalculate midpoint whenever surrounding elements change
    useEffect(() => {
        setCustomTime(calculateMidpoint());
    }, [elementAbove?.offset_ms, elementBelow?.offset_ms, preferences.useMilitaryTime]);
    
    if (!draggedElement) return null;

    const handleCustomTimeSubmit = () => {
        if (!customTime.trim()) return;
        
        // Parse time input (supports formats like "1:30", "90", "1:30:45")
        const timeMs = parseTimeToMs(customTime);
        if (timeMs !== null) {
            onCustomTime(timeMs);
        }
    };

    const parseTimeToMs = (timeStr: string): number | null => {
        const trimmed = timeStr.trim();
        
        // Handle pure numbers (seconds)
        if (/^\d+$/.test(trimmed)) {
            return parseInt(trimmed) * 1000;
        }
        
        // Handle MM:SS or HH:MM:SS formats
        const parts = trimmed.split(':').map(p => parseInt(p));
        if (parts.length === 2 && parts.every(p => !isNaN(p))) {
            // MM:SS format
            const [minutes, seconds] = parts;
            return (minutes * 60 + seconds) * 1000;
        } else if (parts.length === 3 && parts.every(p => !isNaN(p))) {
            // HH:MM:SS format
            const [hours, minutes, seconds] = parts;
            return (hours * 3600 + minutes * 60 + seconds) * 1000;
        }
        
        return null;
    };

    const getButtonStyle = () => {
        return {
            borderWidth: "2px",
            borderColor: "gray.600",
            bg: "card.background",
            color: "page.text",
            _hover: {
                borderColor: "orange.400"
            },
            _active: {
                borderColor: "blue.400"
            }
        };
    };

    return (
        <BaseModal
            title="Cue Moved - Update Time Offset?"
            isOpen={isOpen}
            onClose={onCancel}
            customActions={[
                {
                    label: 'Cancel',
                    onClick: onCancel,
                    variant: 'outline'
                }
            ]}
            errorBoundaryContext="DragReorderModal"
        >
            <VStack spacing={6} align="stretch">
                <Box>
                    <Text fontSize="md">
                        <Text as="span" fontWeight="bold">Moved Cue:</Text> "{draggedElement.element_name}" at {formatTimeOffset(draggedElement.offset_ms, preferences.useMilitaryTime)}
                    </Text>
                </Box>


                <VStack spacing={3} align="stretch">
                    <Button
                        onClick={onDisableAutoSort}
                        textAlign="center"
                        py={4}
                        px={6}
                        height="auto"
                        {...getButtonStyle()}
                    >
                        <VStack spacing={1}>
                            <Text fontWeight="semibold">Disable Auto-Sort</Text>
                            <Text fontSize="xs" color="gray.500">
                                Keep current time offset, allow manual cue ordering
                            </Text>
                        </VStack>
                    </Button>

                    {elementAbove && (
                        <Button
                            onClick={onMatchBefore}
                            textAlign="center"
                            py={4}
                            px={6}
                            height="auto"
                            {...getButtonStyle()}
                        >
                            <VStack spacing={1}>
                                <Text fontWeight="semibold">Match Time of Cue Before</Text>
                                <Text fontSize="xs" color="gray.500">
                                    Change offset to {formatTimeOffset(elementAbove.offset_ms, preferences.useMilitaryTime)} ("{elementAbove.element_name}")
                                </Text>
                            </VStack>
                        </Button>
                    )}

                    {elementBelow && (
                        <Button
                            onClick={onMatchAfter}
                            textAlign="center"
                            py={4}
                            px={6}
                            height="auto"
                            {...getButtonStyle()}
                        >
                            <VStack spacing={1}>
                                <Text fontWeight="semibold">Match Time of Cue After</Text>
                                <Text fontSize="xs" color="gray.500">
                                    Change offset to {formatTimeOffset(elementBelow.offset_ms, preferences.useMilitaryTime)} ("{elementBelow.element_name}")
                                </Text>
                            </VStack>
                        </Button>
                    )}

                    <Button
                        onClick={handleCustomTimeSubmit}
                        textAlign="center"
                        py={4}
                        px={6}
                        height="auto"
                        isDisabled={!customTime.trim()}
                        {...getButtonStyle()}
                    >
                        <VStack spacing={2} align="stretch" width="100%">
                            <Text fontWeight="semibold">
                                Enter New Cue {preferences.useMilitaryTime ? 'Time' : 'Offset'}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                                Set to a specific {preferences.useMilitaryTime ? 'time' : 'offset'} (e.g., "2:00", "90", "1:30:45")
                            </Text>
                            <Input
                                placeholder={preferences.useMilitaryTime ? "0:00" : "0:00"}
                                value={customTime}
                                onChange={(e) => setCustomTime(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Enter') {
                                        handleCustomTimeSubmit();
                                    }
                                }}
                                size="sm"
                                width="120px"
                                textAlign="center"
                                bg="page.background"
                                _dark={{ bg: "page.background" }}
                                _groupHover={{
                                    bg: "orange.50",
                                    _dark: { bg: "orange.900" }
                                }}
                                _groupActive={{
                                    bg: "blue.50",
                                    _dark: { bg: "blue.900" }
                                }}
                                alignSelf="center"
                            />
                        </VStack>
                    </Button>
                </VStack>
            </VStack>
        </BaseModal>
    );
};
