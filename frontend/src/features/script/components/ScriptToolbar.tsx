// frontend/src/features/script/components/ScriptToolbar.tsx

import React from 'react';
import { HStack, VStack, Button, Text, Box } from '@chakra-ui/react';
import { AppIcon } from '../../../components/AppIcon';
import { ToolButton } from '../types/toolButton';

interface ScriptToolbarProps {
    toolButtons: ToolButton[];
    onModeChange: (modeId: string) => void;
    activeMode: string;
    playbackState?: string;
}

export const ScriptToolbar: React.FC<ScriptToolbarProps> = ({ 
    toolButtons, 
    onModeChange,
    activeMode,
    playbackState
}) => {
    // Define left column buttons based on mode
    const getLeftColumnButtons = () => {
        const navigationButtons = toolButtons.filter(tool => 
            tool.id === 'jump-top' || tool.id === 'jump-bottom'
        );

        if (activeMode === 'view') {
            // View mode: Head, Tail, Open/Close, Share/Hide, Play/Pause
            const toggleButton = toolButtons.filter(tool => tool.id === 'toggle-all-groups');
            const shareHideButton = toolButtons.filter(tool => ['share', 'hide'].includes(tool.id));
            const playButton = toolButtons.filter(tool => tool.id === 'play');
            return [...navigationButtons, ...toggleButton, ...shareHideButton, ...playButton];
        } else if (activeMode === 'edit') {
            // Edit mode: Head, Tail, Add, Modify, Copy, Stack/Unstack, Trash
            const modeButtons = toolButtons.filter(tool => 
                ['add-element', 'edit-element', 'duplicate-element', 'group-elements', 'ungroup-elements', 'delete-element'].includes(tool.id)
            );
            return [...navigationButtons, ...modeButtons];
        } else if (activeMode === 'info') {
            // Info mode: Head, Tail
            return navigationButtons;
        } else if (activeMode === 'history') {
            // History mode: Head, Tail, Clear
            const clearButton = toolButtons.filter(tool => tool.id === 'clear-history');
            return [...navigationButtons, ...clearButton];
        }
        
        return navigationButtons;
    };

    // Right column always contains: View, Edit, Info, History, Exit
    const rightColumnButtons = toolButtons.filter(tool => 
        ['view', 'edit', 'info', 'history', 'exit'].includes(tool.id)
    );

    const leftColumnButtons = getLeftColumnButtons();

    const renderButton = (tool: ToolButton) => {
        const isPlayButton = tool.id === 'play';
        const isPauseFlashing = isPlayButton && playbackState === 'PAUSED';
        const isSafetyFlashing = isPlayButton && playbackState === 'SAFETY';
        
        return (
            <Button
                key={tool.id}
                width="50px"
                height="50px"
                minWidth="50px"
                p={1}
                bg={tool.isActive && !tool.isDisabled && !isPlayButton ? "blue.400" : tool.isDisabled ? "button.disabled.bg" : "card.background"}
                color={tool.isActive && !tool.isDisabled ? (isPlayButton ? "red.500" : "white") : (isSafetyFlashing ? "red.500" : (tool.isDisabled ? "button.disabled.text" : "button.text"))}
                border="1px solid"
                borderColor={tool.isActive && !tool.isDisabled ? (isPlayButton ? "red.500" : "blue.400") : (isSafetyFlashing ? "red.500" : "container.border")}
                borderRadius="md"
            _hover={tool.isDisabled ? {} : isPlayButton ? {
                bg: "red.700",
                color: "white",
                borderColor: "red.500",
                transform: "scale(1.05)"
            } : {
                bg: "orange.400",
                color: "white",
                borderColor: "orange.400",
                transform: "scale(1.05)"
            }}
            _active={tool.isDisabled ? {} : {
                transform: "scale(0.95)"
            }}
            transition="all 0.2s"
            onClick={() => !tool.isDisabled && onModeChange(tool.id)}
            isDisabled={tool.isDisabled}
            cursor={tool.isDisabled ? "not-allowed" : "pointer"}
            opacity={tool.isDisabled ? 0.4 : 1}
            flexDirection="column"
            gap={1}
            animation={(isPauseFlashing || isSafetyFlashing) ? "flash 1s infinite" : undefined}
            sx={(isPauseFlashing || isSafetyFlashing) ? {
                "@keyframes flash": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.3 }
                }
            } : {}}
        >
            <AppIcon
                name={tool.icon}
                boxSize="16px"
                transform={tool.id === 'hide' ? 'scaleX(-1)' : undefined}
                color={(tool.isActive && !tool.isDisabled && isPlayButton) || isSafetyFlashing ? "red.500" : undefined}
                sx={isPlayButton && !tool.isDisabled ? {
                    "button:hover &": {
                        color: tool.isActive ? "button.text !important" : "white !important"
                    }
                } : {}}
            />
            <Text 
                fontSize="8px" 
                fontWeight="bold"
                lineHeight="1"
                textAlign="center"
                mt={1}
            >
                {tool.label}
            </Text>
        </Button>
        );
    };

    return (
        <HStack spacing={0} align="flex-start" width="100%">
            {/* Left Column */}
            <VStack spacing={1} flex={1}>
                {leftColumnButtons.map(renderButton)}
            </VStack>
            
            {/* Center spacing */}
            <Box width="16px" />
            
            {/* Vertical Separator */}
            <Box 
                width="1px" 
                alignSelf="stretch"
                bg="container.border"
            />
            
            {/* Center spacing */}
            <Box width="16px" />
            
            {/* Right Column */}
            <VStack spacing={1} flex={1}>
                {rightColumnButtons.map(renderButton)}
            </VStack>
        </HStack>
    );
};
