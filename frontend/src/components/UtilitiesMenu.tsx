// frontend/src/components/UtilitiesMenu.tsx

import React from 'react';
import { Button, VStack, Text, HStack, Menu, MenuButton, MenuList, MenuItem, MenuDivider } from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppIcon } from './AppIcon';

interface UtilitiesMenuProps {
  onSaveNavigationState?: () => void;
}

export const UtilitiesMenu: React.FC<UtilitiesMenuProps> = ({ onSaveNavigationState }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigateToPage = (path: string) => {
    // Save current navigation state before navigating away
    if (onSaveNavigationState) {
      onSaveNavigationState();
    }
    navigate(path);
  };

  const isCurrentPage = (path: string) => {
    return location.pathname === path;
  };

  const getMenuItemStyle = (path: string) => {
    return isCurrentPage(path) ? {
      color: 'blue.500',
      fontWeight: 'bold',
      _hover: { borderColor: 'orange.400' }
    } : {
      fontWeight: 'normal',
      _hover: { borderColor: 'orange.400' }
    };
  };

  return (
    <Menu>
      <MenuButton
        as={Button}
        bg="blue.400"
        color="white"
        size="xs"
        _hover={{ bg: 'orange.400' }}
        _focus={{ boxShadow: 'none' }}
        _active={{ bg: 'orange.400' }}
      >
        Utilities
      </MenuButton>
      <MenuList zIndex={9999}>
        <MenuItem
          onClick={() => handleNavigateToPage('/dashboard')}
          icon={<AppIcon name="dashboard" boxSize="16px" />}
          {...getMenuItemStyle('/dashboard')}
        >
          Dashboard
        </MenuItem>
        <MenuDivider />
        <MenuItem
          onClick={() => handleNavigateToPage('/tutorial')}
          icon={<AppIcon name="compass" boxSize="16px" />}
          {...getMenuItemStyle('/tutorial')}
        >
          Tutorial
        </MenuItem>
        <MenuItem
          onClick={() => handleNavigateToPage('/test-tools')}
          icon={<AppIcon name="warning" boxSize="16px" />}
          {...getMenuItemStyle('/test-tools')}
        >
          Test Tools
        </MenuItem>
        <MenuItem
          onClick={() => handleNavigateToPage('/api-documentation')}
          icon={<AppIcon name="api-docs" boxSize="16px" />}
          {...getMenuItemStyle('/api-documentation')}
        >
          API Docs
        </MenuItem>
        <MenuItem
          onClick={() => handleNavigateToPage('/documentation')}
          icon={<AppIcon name="docs" boxSize="16px" />}
          {...getMenuItemStyle('/documentation')}
        >
          Documentation
        </MenuItem>
      </MenuList>
    </Menu>
  );
};