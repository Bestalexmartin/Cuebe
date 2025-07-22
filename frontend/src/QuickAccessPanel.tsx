// frontend/src/QuickAccessPanel.tsx

import React from "react";
import { Flex, Box, VStack, Heading, Button, Text, HStack, Menu, MenuButton, MenuList, MenuItem, MenuDivider } from "@chakra-ui/react";
import { useNavigate } from 'react-router-dom';
import { AppIcon } from './components/AppIcon';

// TypeScript interfaces
type IconName = 'openmenu' | 'hamburger' | 'edit' | 'delete' | 'warning' | 'pinned' | 'show' | 'venue' | 'department' | 'crew' | 'asc' | 'desc';

interface NavigationItemProps {
  icon: IconName;
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}

interface NavigationItem {
  id: string;
  icon: IconName;
  title: string;
  description: string;
}

interface QuickAccessPanelProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onSaveNavigationState?: () => void;
}

const NavigationItem: React.FC<NavigationItemProps> = ({ icon, title, description, isActive, onClick }) => {
  const handleClick = (): void => {
    onClick();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Box
      borderWidth="2px"
      borderRadius="md"
      p="4"
      shadow="sm"
      cursor="pointer"
      borderColor={isActive ? 'blue.400' : 'gray.600'}
      _hover={{ borderColor: 'orange.400' }}
      _focus={{ boxShadow: 'outline', borderColor: 'blue.400' }}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      onKeyDown={handleKeyDown}
    >
      <HStack spacing="1" align="center">
        <AppIcon name={icon} />
        <Heading size="xs" textTransform="uppercase">{title}</Heading>
      </HStack>
      <Text pt="2" fontSize="sm">{description}</Text>
    </Box>
  );
};

export const QuickAccessPanel: React.FC<QuickAccessPanelProps> = ({ activeView, setActiveView, onSaveNavigationState }) => {
  const navigate = useNavigate();
  const navigationItems: NavigationItem[] = [
    {
      id: 'shows',
      icon: 'show',
      title: 'Shows',
      description: 'Manage your list of shows.'
    },
    {
      id: 'venues',
      icon: 'venue',
      title: 'Venues',
      description: 'Manage your list of venues.'
    },
    {
      id: 'departments',
      icon: 'department',
      title: 'Departments',
      description: 'Manage your list of departments.'
    },
    {
      id: 'crew',
      icon: 'crew',
      title: 'Crew',
      description: 'Manage your crew members.'
    }
  ];

  const handleSetActiveView = (viewId: string): void => {
    setActiveView(viewId);
  };

  const handleNavigateToTutorial = () => {
    // Save current navigation state before navigating away
    if (onSaveNavigationState) {
      onSaveNavigationState();
    }
    navigate('/tutorial');
  };

  const handleNavigateToTestTools = () => {
    // Save current navigation state before navigating away
    if (onSaveNavigationState) {
      onSaveNavigationState();
    }
    navigate('/test-tools');
  };

  return (
    <>
      <Flex justify="flex-end" align="center">
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
              onClick={handleNavigateToTutorial}
              icon={<AppIcon name="tutorial" boxSize="14px" />}
            >
              <VStack align="start" spacing={0}>
                <Text fontSize="sm" fontWeight="semibold">Tutorial</Text>
              </VStack>
            </MenuItem>
            <MenuItem
              onClick={handleNavigateToTestTools}
              icon={<AppIcon name="warning" boxSize="14px" />}
            >
              <VStack align="start" spacing={0}>
                <Text fontSize="sm" fontWeight="semibold">Test Tools</Text>
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
      </Flex>

      <Box
        mt="4"
        border="1px solid"
        borderColor="container.border"
        p="4"
        borderRadius="md"
      >
        <VStack spacing={4} align="stretch">
          {navigationItems.map((item: NavigationItem) => (
            <NavigationItem
              key={item.id}
              icon={item.icon}
              title={item.title}
              description={item.description}
              isActive={activeView === item.id}
              onClick={() => handleSetActiveView(item.id)}
            />
          ))}
        </VStack>
      </Box>
    </>
  );
};