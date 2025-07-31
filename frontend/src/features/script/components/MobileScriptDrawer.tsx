// frontend/src/features/script/components/MobileScriptDrawer.tsx

import React from 'react';
import {
    Drawer,
    DrawerBody,
    DrawerHeader,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton,
    VStack,
    Button,
    Divider
} from '@chakra-ui/react';
import { AppIcon } from '../../../components/AppIcon';
import { ToolButton } from '../types/tool-button';

interface MobileScriptDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    activeMode: string;
    toolButtons: ToolButton[];
    onModeChange: (toolId: string) => void;
}

/**
 * MobileScriptDrawer Component
 * 
 * Provides mobile-friendly drawer interface for script tools and navigation.
 * Organizes buttons into logical groups with separators.
 */
export const MobileScriptDrawer: React.FC<MobileScriptDrawerProps> = ({
    isOpen,
    onClose,
    activeMode,
    toolButtons,
    onModeChange
}) => {
    const handleToolClick = (toolId: string, isDisabled: boolean) => {
        if (!isDisabled) {
            onModeChange(toolId);
            onClose();
        }
    };

    // Filter buttons into logical groups
    const navigationButtons = toolButtons.filter(tool => 
        tool.id === 'jump-top' || tool.id === 'jump-bottom'
    );
    
    const viewStateButtons = toolButtons.filter(tool => 
        ['view', 'edit', 'info', 'history', 'exit'].includes(tool.id)
    );
    
    const toolsButtons = toolButtons.filter(tool => 
        !['jump-top', 'jump-bottom', 'view', 'edit', 'info', 'history', 'exit'].includes(tool.id)
    );

    const renderButton = (tool: ToolButton) => (
        <Button
            key={tool.id}
            leftIcon={
                <AppIcon
                    name={tool.icon}
                    boxSize="20px"
                />
            }
            bg={tool.isActive && !tool.isDisabled ? "blue.400" : tool.isDisabled ? "button.disabled.bg" : "card.background"}
            color={tool.isActive && !tool.isDisabled ? "white" : tool.isDisabled ? "button.disabled.text" : "button.text"}
            border="1px solid"
            borderColor={tool.isActive && !tool.isDisabled ? "blue.400" : "container.border"}
            isDisabled={tool.isDisabled}
            onClick={() => handleToolClick(tool.id, tool.isDisabled)}
            justifyContent="flex-start"
            width="100%"
            _hover={tool.isDisabled ? {} : {
                bg: "orange.400",
                color: "white",
                borderColor: "orange.400"
            }}
            _active={tool.isDisabled ? {} : {
                transform: "scale(0.98)"
            }}
            transition="all 0.2s"
            cursor={tool.isDisabled ? "not-allowed" : "pointer"}
            opacity={tool.isDisabled ? 0.4 : 1}
        >
            {tool.label}
        </Button>
    );

    return (
        <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
            <DrawerOverlay />
            <DrawerContent key={activeMode} bg="page.background">
                <DrawerCloseButton
                    borderRadius="full"
                    border="3px solid"
                    borderColor="blue.400"
                    bg="inherit"
                    _hover={{ borderColor: 'orange.400' }}
                />
                <DrawerHeader>Script Tools</DrawerHeader>
                <DrawerBody>
                    <VStack spacing={4} align="stretch">
                        {/* Navigation buttons */}
                        {navigationButtons.map(renderButton)}
                        
                        {/* Separator after navigation */}
                        {navigationButtons.length > 0 && (
                            <Divider borderColor="container.border" />
                        )}
                        
                        {/* View state buttons */}
                        {viewStateButtons.map(renderButton)}
                        
                        {/* Separator before tools */}
                        {toolsButtons.length > 0 && activeMode !== 'info' && (
                            <Divider borderColor="container.border" />
                        )}
                        
                        {/* Tool buttons */}
                        {toolsButtons.map(renderButton)}
                    </VStack>
                </DrawerBody>
            </DrawerContent>
        </Drawer>
    );
};
