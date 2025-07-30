// frontend/src/pages/script/components/ScriptToolbar.tsx

import React from 'react';
import { VStack, Button, Divider, Text } from '@chakra-ui/react';
import { AppIcon } from '../../../components/AppIcon';

interface ToolButton {
    id: string;
    icon: 'view' | 'play' | 'info' | 'script-edit' | 'share' | 'dashboard' | 'add' | 'copy' | 'group' | 'delete' | 'element-edit' | 'jump-top' | 'jump-bottom' | 'history' | 'exit';
    label: string;
    description: string;
    isActive: boolean;
    isDisabled?: boolean;
}

interface ScriptToolbarProps {
    toolButtons: ToolButton[];
    onModeChange: (modeId: string) => void;
    activeMode: string;
}

export const ScriptToolbar: React.FC<ScriptToolbarProps> = ({ 
    toolButtons, 
    onModeChange,
    activeMode
}) => {
    // Split buttons into navigation and other categories
    const navigationButtons = toolButtons.filter(tool => 
        tool.id === 'jump-top' || tool.id === 'jump-bottom'
    );
    const viewStateButtons = toolButtons.filter(tool => 
        ['view', 'edit', 'info', 'history', 'exit'].includes(tool.id)
    );
    const toolButtons_filtered = toolButtons.filter(tool => 
        !['jump-top', 'jump-bottom', 'view', 'edit', 'info', 'history', 'exit'].includes(tool.id)
    );

    const renderButton = (tool: ToolButton) => (
        <Button
            key={tool.id}
            width="50px"
            height="50px"
            minWidth="50px"
            p={1}
            bg={tool.isActive && !tool.isDisabled ? "blue.400" : tool.isDisabled ? "button.disabled.bg" : "card.background"}
            color={tool.isActive && !tool.isDisabled ? "white" : tool.isDisabled ? "button.disabled.text" : "button.text"}
            border="1px solid"
            borderColor={tool.isActive && !tool.isDisabled ? "blue.400" : "container.border"}
            borderRadius="md"
            _hover={tool.isDisabled ? {} : {
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
        >
            <AppIcon
                name={tool.icon}
                boxSize="16px"
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

    return (
        <VStack spacing={2}>
            {/* Navigation buttons */}
            {navigationButtons.map(renderButton)}
            
            {/* Separator after navigation */}
            {navigationButtons.length > 0 && (
                <Divider 
                    orientation="horizontal"
                    borderColor="container.border"
                    width="40px"
                    my={2}
                />
            )}
            
            {/* View state buttons */}
            {viewStateButtons.map(renderButton)}
            
            {/* Separator before tools (only if tools exist) */}
            {toolButtons_filtered.length > 0 && activeMode !== 'info' && (
                <Divider 
                    orientation="horizontal"
                    borderColor="container.border"
                    width="40px"
                    my={2}
                />
            )}
            
            {/* Tool buttons */}
            {toolButtons_filtered.map(renderButton)}
        </VStack>
    );
};