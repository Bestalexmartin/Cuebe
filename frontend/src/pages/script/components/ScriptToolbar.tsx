// frontend/src/pages/script/components/ScriptToolbar.tsx

import React from 'react';
import { VStack, Button } from '@chakra-ui/react';
import { AppIcon } from '../../../components/AppIcon';

interface ToolButton {
    id: string;
    icon: 'view' | 'play' | 'info' | 'script-edit' | 'share' | 'dashboard' | 'add' | 'copy' | 'group' | 'delete';
    label: string;
    description: string;
    isActive: boolean;
    isDisabled?: boolean;
}

interface ScriptToolbarProps {
    toolButtons: ToolButton[];
    onModeChange: (modeId: string) => void;
}

export const ScriptToolbar: React.FC<ScriptToolbarProps> = ({ 
    toolButtons, 
    onModeChange 
}) => {
    return (
        <VStack spacing={2}>
            {toolButtons.map((tool) => (
                <Button
                    key={tool.id}
                        width="50px"
                        height="50px"
                        minWidth="50px"
                        p={0}
                        bg={tool.isActive && !tool.isDisabled ? "blue.500" : tool.isDisabled ? { base: "gray.200", _dark: "gray.800" } : { base: "gray.100", _dark: "gray.700" }}
                        color={tool.isActive && !tool.isDisabled ? "white" : tool.isDisabled ? { base: "gray.400", _dark: "gray.600" } : { base: "gray.600", _dark: "gray.300" }}
                        border="1px solid"
                        borderColor={tool.isActive && !tool.isDisabled ? "blue.400" : "container.border"}
                        borderRadius="md"
                        _hover={tool.isDisabled ? {} : {
                            bg: tool.isActive ? "orange.400" : "orange.500",
                            color: "white",
                            borderColor: "orange.300",
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
                    >
                        <AppIcon
                            name={tool.icon}
                            boxSize="24px"
                        />
                    </Button>
            ))}
        </VStack>
    );
};