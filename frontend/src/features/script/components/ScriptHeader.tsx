import React from 'react';
import { Flex, HStack, Heading, Badge, Box, Button, Divider } from '@chakra-ui/react';
import { AppIcon } from '../../../components/AppIcon';
import { ActionsMenu } from '../../../components/ActionsMenu';

interface ScriptHeaderProps {
    // Script data
    currentScript: any;
    show: any;
    isScriptShared: boolean;
    
    // Mode and state
    activeMode: string;
    hasChanges: boolean;
    hasUnsavedChanges: boolean;
    isFormValid: boolean;
    
    // Playback state
    isPlaybackPlaying: boolean;
    isPlaybackPaused: boolean;
    isPlaybackSafety: boolean;
    
    // Auto-save state
    activePreferences: any;
    showSaveSuccess: boolean;
    isAutoSaving: boolean;
    isPaused: boolean;
    secondsUntilNextSave: number;
    
    // Highlighting state
    isHighlightingEnabled: boolean;
    
    // Layout
    isMobile: boolean;
    
    // Actions
    actions: any[];
    navigation: any;
    modalState: any;
    modalNames: any;
    modalHandlers: any;
    captureInfoChanges: () => void;
    handleHighlightingToggle: () => void;
    togglePause: () => void;
}

export const ScriptHeader: React.FC<ScriptHeaderProps> = ({
    currentScript,
    show,
    isScriptShared,
    activeMode,
    hasChanges,
    hasUnsavedChanges,
    isFormValid,
    isPlaybackPlaying,
    isPlaybackPaused,
    isPlaybackSafety,
    activePreferences,
    showSaveSuccess,
    isAutoSaving,
    isPaused,
    secondsUntilNextSave,
    isHighlightingEnabled,
    isMobile,
    actions,
    navigation,
    modalState,
    modalNames,
    modalHandlers,
    captureInfoChanges,
    handleHighlightingToggle,
    togglePause
}) => {
    return (
        <Flex
            width="100%"
            justify="space-between"
            align="center"
            flexShrink={0}
            mb="4"
            height="24px"
        >
            {/* Left: Script Title */}
            <HStack spacing={2} align="center">
                <AppIcon name="script" boxSize="20px" color="white" />
                <HStack spacing={3} align="center">
                    {show?.show_name && (
                        <>
                            <Heading as="h2" size="md">{show.show_name}</Heading>
                            <AppIcon name="arrow-right" boxSize="16px" color="white" />
                        </>
                    )}
                    <Heading as="h2" size="md">{currentScript?.script_name || 'Script'}</Heading>
                    {(currentScript?.is_shared || isScriptShared) && (
                        <Badge variant="solid" colorScheme="green" fontSize="sm" ml={1} px={2}>
                            SHARED
                        </Badge>
                    )}
                    {activeMode === 'view' && (isPlaybackPlaying || isPlaybackPaused || isPlaybackSafety) ? (
                        <Badge
                            variant="solid"
                            colorScheme={isHighlightingEnabled ? "blue" : "gray"}
                            fontSize="sm"
                            ml={1}
                            px={2}
                            cursor="pointer"
                            onClick={handleHighlightingToggle}
                            _hover={{
                                bg: isHighlightingEnabled ? "blue.600" : "gray.600"
                            }}
                            transition="background-color 0.2s"
                            userSelect="none"
                        >
                            LOOKAHEAD • {isHighlightingEnabled ? activePreferences.lookaheadSeconds : 'OFF'}
                        </Badge>
                    ) : activeMode !== 'view' && activePreferences.autoSaveInterval > 0 && (
                        <Badge
                            variant="solid"
                            colorScheme={showSaveSuccess ? "blue" : (isAutoSaving ? "blue" : isPaused ? "gray" : "red")}
                            bg={showSaveSuccess ? "blue.500" : undefined}
                            fontSize="sm"
                            ml={1}
                            px={2}
                            cursor="pointer"
                            onClick={togglePause}
                            _hover={{
                                bg: isPaused ? "gray.600" : "red.600"
                            }}
                            transition="background-color 0.2s"
                            userSelect="none"
                        >
                            {isAutoSaving
                                ? "SAVING..."
                                : isPaused 
                                    ? "AUTO SAVE • PAUSED"
                                    : `AUTO SAVE • ${hasUnsavedChanges && secondsUntilNextSave > 0 ? secondsUntilNextSave : activePreferences.autoSaveInterval}`
                            }
                        </Badge>
                    )}
                </HStack>
            </HStack>

            {/* Right: Action Buttons positioned to align with scroll area */}
            <Box flex={1} position="relative">
                <Box
                    position="absolute"
                    right={isMobile ? "16px" : "197px"}
                    top="50%"
                    transform="translateY(-50%)"
                    zIndex={100}
                >
                    <HStack spacing={2}>
                        {/* Actions Menu */}
                        <ActionsMenu
                            actions={actions}
                            isDisabled={false}
                        />

                        {/* Divider */}
                        <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />

                        {/* Action Buttons */}
                        <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                                if (isPlaybackPlaying || isPlaybackPaused || isPlaybackSafety) {
                                    modalState.openModal(modalNames.EMERGENCY_EXIT);
                                } else {
                                    navigation.handleCancel();
                                }
                            }}
                            _hover={{ bg: 'gray.100' }}
                            _dark={{ _hover: { bg: 'gray.700' } }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="xs"
                            bg="blue.400"
                            color="white"
                            onClick={() => {
                                // Capture info changes first if in info mode
                                if (activeMode === 'info' && hasChanges) {
                                    captureInfoChanges();
                                }
                                modalHandlers.handleShowSaveConfirmation();
                            }}
                            isDisabled={(!hasChanges && !hasUnsavedChanges) || !isFormValid}
                            _hover={{ bg: 'orange.400' }}
                        >
                            Save Changes
                        </Button>
                    </HStack>
                </Box>
            </Box>
        </Flex>
    );
};
