// frontend/src/components/OptionsMenu.tsx

import React from 'react';
import { Button, VStack, Text, HStack, Menu, MenuButton, MenuList, MenuItem, MenuDivider } from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppIcon } from './AppIcon';

interface OptionsMenuProps {
  onSaveNavigationState?: () => void;
}

export const OptionsMenu: React.FC<OptionsMenuProps> = ({ onSaveNavigationState }) => {
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
      fontWeight: 'bold'
    } : {};
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
        Options
      </MenuButton>
      <MenuList>
        <MenuItem
          onClick={() => handleNavigateToPage('/dashboard')}
          icon={<AppIcon name="show" boxSize="14px" />}
          {...getMenuItemStyle('/dashboard')}
        >
          <VStack align="start" spacing={0}>
            <Text fontSize="sm" fontWeight={isCurrentPage('/dashboard') ? 'bold' : 'semibold'}>Dashboard</Text>
          </VStack>
        </MenuItem>
        <MenuDivider />
        <MenuItem
          onClick={() => handleNavigateToPage('/tutorial')}
          icon={<AppIcon name="tutorial" boxSize="14px" />}
          {...getMenuItemStyle('/tutorial')}
        >
          <VStack align="start" spacing={0}>
            <Text fontSize="sm" fontWeight={isCurrentPage('/tutorial') ? 'bold' : 'semibold'}>Tutorial</Text>
          </VStack>
        </MenuItem>
        <MenuItem
          onClick={() => handleNavigateToPage('/test-tools')}
          icon={<AppIcon name="warning" boxSize="14px" />}
          {...getMenuItemStyle('/test-tools')}
        >
          <VStack align="start" spacing={0}>
            <Text fontSize="sm" fontWeight={isCurrentPage('/test-tools') ? 'bold' : 'semibold'}>Test Tools</Text>
          </VStack>
        </MenuItem>
        <MenuItem
          onClick={() => handleNavigateToPage('/api-documentation')}
          icon={<AppIcon name="api-docs" boxSize="14px" />}
          {...getMenuItemStyle('/api-documentation')}
        >
          <VStack align="start" spacing={0}>
            <Text fontSize="sm" fontWeight={isCurrentPage('/api-documentation') ? 'bold' : 'semibold'}>API Documentation</Text>
          </VStack>
        </MenuItem>
        <MenuDivider />
        <MenuItem isDisabled>
          <HStack spacing={2}>
            <Text fontSize="sm" color="gray.400">More options coming soon...</Text>
          </HStack>
        </MenuItem>
      </MenuList>
    </Menu>
  );
};