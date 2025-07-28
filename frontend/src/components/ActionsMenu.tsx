// frontend/src/components/ActionsMenu.tsx

import React from 'react';
import {
    Button,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    MenuDivider
} from "@chakra-ui/react";
import { AppIcon } from './AppIcon';

// TypeScript interfaces
export interface ActionItem {
    id: string;
    label: string;
    onClick: () => void;
    isDestructive?: boolean;
    isDisabled?: boolean;
}

interface ActionsMenuProps {
    actions: ActionItem[];
    isDisabled?: boolean;
}

export const ActionsMenu: React.FC<ActionsMenuProps> = ({
    actions,
    isDisabled = false
}) => {
    if (actions.length === 0) return null;

    // Separate destructive actions (like delete) to show at bottom
    const normalActions = actions.filter(action => !action.isDestructive);
    const destructiveActions = actions.filter(action => action.isDestructive);

    return (
        <Menu>
            <MenuButton
                as={Button}
                size="xs"
                rightIcon={<AppIcon name="openmenu" />}
                isDisabled={isDisabled}
                _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
            >
                Actions
            </MenuButton>
            <MenuList zIndex={9999}>
                {/* Normal actions */}
                {normalActions.map((action) => (
                    <MenuItem
                        key={action.id}
                        onClick={action.onClick}
                        isDisabled={action.isDisabled}
                    >
                        {action.label}
                    </MenuItem>
                ))}

                {/* Divider between normal and destructive actions */}
                {normalActions.length > 0 && destructiveActions.length > 0 && (
                    <MenuDivider />
                )}

                {/* Destructive actions (like delete) */}
                {destructiveActions.map((action) => (
                    <MenuItem
                        key={action.id}
                        onClick={action.onClick}
                        isDisabled={action.isDisabled}
                        color="red.500"
                        _dark={{ color: 'red.400' }}
                        _hover={{ bg: 'red.500', color: 'white', _dark: { bg: 'red.600', color: 'white' } }}
                    >
                        {action.label}
                    </MenuItem>
                ))}
            </MenuList>
        </Menu>
    );
};