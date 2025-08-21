// frontend/src/features/script/components/modals/DragReorderModal.tsx

import React from 'react';
import {
    VStack,
    Text,
    Button,
    Box
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
    onCancel
}) => {
    const { preferences } = useUserPreferences();
    
    if (!draggedElement) return null;

    const getButtonStyle = (actionType: string) => {
        // Special styling for Disable Auto-Sort button
        if (actionType === 'disable') {
            return {
                borderColor: "gray.400",
                bg: "gray.200",
                _dark: {
                    borderColor: "gray.500",
                    bg: "gray.800"
                },
                _hover: {
                    borderColor: "orange.400",
                    bg: "orange.50",
                    _dark: {
                        borderColor: "orange.400",
                        bg: "orange.900"
                    }
                },
                _active: {
                    borderColor: "blue.400",
                    bg: "blue.50",
                    _dark: {
                        borderColor: "blue.400",
                        bg: "blue.900"
                    }
                }
            };
        }


        return {
            borderColor: "gray.300",
            _hover: {
                borderColor: "orange.400",
                bg: "orange.50"
            },
            _active: {
                borderColor: "blue.400",
                bg: "blue.50"
            },
            _dark: {
                borderColor: "gray.600",
                _hover: {
                    borderColor: "orange.400",
                    bg: "orange.900"
                },
                _active: {
                    borderColor: "blue.400",
                    bg: "blue.900"
                }
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
                        variant="outline"
                        onClick={onDisableAutoSort}
                        textAlign="center"
                        border="1px solid"
                        py={4}
                        px={6}
                        height="auto"
                        {...getButtonStyle('disable')}
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
                            variant="outline"
                            onClick={onMatchBefore}
                            textAlign="center"
                            border="1px solid"
                            py={4}
                            px={6}
                            height="auto"
                            {...getButtonStyle('normal')}
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
                            variant="outline"
                            onClick={onMatchAfter}
                            textAlign="center"
                            border="1px solid"
                            py={4}
                            px={6}
                            height="auto"
                            {...getButtonStyle('normal')}
                        >
                            <VStack spacing={1}>
                                <Text fontWeight="semibold">Match Time of Cue After</Text>
                                <Text fontSize="xs" color="gray.500">
                                    Change offset to {formatTimeOffset(elementBelow.offset_ms, preferences.useMilitaryTime)} ("{elementBelow.element_name}")
                                </Text>
                            </VStack>
                        </Button>
                    )}
                </VStack>
            </VStack>
        </BaseModal>
    );
};
