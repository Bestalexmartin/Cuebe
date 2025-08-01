// frontend/src/components/base/BaseUtilityPage.tsx

import React from 'react';
import {
  Flex,
  Box,
  VStack,
  Heading,
  Text,
  HStack,
  Badge,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton
} from '@chakra-ui/react';
import { AppIcon, IconName } from '../AppIcon';
import { UtilitiesMenu } from '../UtilitiesMenu';

interface QuickAccessItemProps {
  title: string;
  description: string;
  isActive?: boolean;
  onClick?: () => void;
  isDisabled?: boolean;
  badgeTitle?: string;
  badgeColorScheme?: string;
  icon?: IconName;
}

export interface QuickAccessItem {
  id: string;
  title: string;
  description: string;
  onClick?: () => void;
  isDisabled?: boolean;
  badgeTitle?: string;
  badgeColorScheme?: string;
  icon?: IconName;
}

interface BaseUtilityPageProps {
  pageTitle: string;
  pageIcon: IconName;
  defaultContent: React.ReactNode;
  selectedContent?: React.ReactNode;
  quickAccessItems: QuickAccessItem[];
  activeItemId?: string;
  isMenuOpen: boolean;
  onMenuClose: () => void;
}

const QuickAccessItemComponent: React.FC<QuickAccessItemProps> = ({
  title,
  description,
  isActive = false,
  onClick,
  isDisabled = false,
  badgeTitle,
  badgeColorScheme,
  icon
}) => {
  const handleClick = (): void => {
    if (!isDisabled && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      if (onClick) onClick();
    }
  };

  return (
    <Box
      borderWidth="2px"
      borderRadius="md"
      p="4"
      shadow="sm"
      bg="card.background"
      cursor={isDisabled ? "not-allowed" : "pointer"}
      borderColor={isActive ? 'blue.400' : 'gray.600'}
      _hover={!isDisabled ? { borderColor: 'orange.400' } : {}}
      _focus={!isDisabled ? { boxShadow: 'outline', borderColor: 'blue.400' } : {}}
      onClick={handleClick}
      tabIndex={isDisabled ? -1 : 0}
      role="button"
      onKeyDown={handleKeyDown}
      opacity={isDisabled ? 0.6 : 1}
    >
      {badgeTitle && badgeColorScheme ? (
        <Badge colorScheme={badgeColorScheme} fontSize="sm" px={2} py={1} mb="2">
          {badgeTitle}
        </Badge>
      ) : (
        <HStack spacing="2" align="center" mb="2">
          {icon && <AppIcon 
            name={icon} 
            boxSize={
              icon === 'api-docs' ? "16px" : 
              "14px"
            } 
          />}
          <Heading size="xs" textTransform="uppercase">
            {title}
          </Heading>
        </HStack>
      )}
      <Text fontSize="sm" color="cardText" mb="-1">
        {description}
      </Text>
    </Box>
  );
};

export const BaseUtilityPage: React.FC<BaseUtilityPageProps> = ({
  pageTitle,
  pageIcon,
  defaultContent,
  selectedContent,
  quickAccessItems,
  activeItemId,
  isMenuOpen,
  onMenuClose
}) => {
  return (
    <Box
      width="100%"
      height="100%"
      p="2rem"
      display="flex"
      flexDirection="column"
      boxSizing="border-box"
    >
      {/* Header Section */}
      <Box flexShrink={0}>
        <HStack spacing="2" align="center">
          <AppIcon 
            name={pageIcon} 
            boxSize={
              pageIcon === 'api-docs' ? "27px" : 
              pageIcon === 'compass' ? "23px" : 
              "25px"
            } 
          />
          <Heading as="h2" size="md">
            {pageTitle}
          </Heading>
          <Box ml="auto" display={{ base: 'none', lg: 'block' }}>
            <UtilitiesMenu />
          </Box>
        </HStack>
      </Box>

      {/* Main Content Area */}
      <Flex
        mt="4"
        gap="8"
        flexGrow={1}
        flexDirection={{ base: 'column', lg: 'row' }}
        height="calc(100vh - 120px)" // Account for header and padding
        minHeight={0} // Important for flex items to shrink
      >
        {/* Left Main Content */}
        <Box
          flex="1"
          display="flex"
          flexDirection="column"
          minHeight={0} // Important for flex items to shrink
        >
          <Box
            border="1px solid"
            borderColor="container.border"
            p="4"
            borderRadius="md"
            flexGrow={1}
            overflowY="auto"
            className="hide-scrollbar edit-form-container"
            minHeight={0} // Important for flex items to shrink
          >
            {selectedContent || defaultContent}
          </Box>
        </Box>

        {/* Right QuickAccess Panel - Desktop Only */}
        <Box
          width={{ base: '0', lg: '330px' }}
          minWidth={{ base: '0', lg: '330px' }}
          display={{ base: 'none', lg: 'flex' }}
          flexDirection="column"
          flexShrink={0}
          minHeight={0} // Important for flex items to shrink
        >
          <Box
            border="1px solid"
            borderColor="container.border"
            p="4"
            borderRadius="md"
            height="fit-content" // Shrink to fit content
            maxHeight="100%" // Don't exceed available height
            overflowY="auto" // Allow scrolling when content exceeds max height
            className="hide-scrollbar"
          >
            <VStack spacing={4} align="stretch">
              {quickAccessItems.map((item) => (
                <QuickAccessItemComponent
                  key={item.id}
                  title={item.title}
                  description={item.description}
                  isActive={activeItemId === item.id}
                  onClick={item.onClick}
                  isDisabled={item.isDisabled}
                  badgeTitle={item.badgeTitle}
                  badgeColorScheme={item.badgeColorScheme}
                  icon={item.icon}
                />
              ))}
            </VStack>
          </Box>
        </Box>
      </Flex>

      {/* Mobile Drawer for QuickAccess */}
      <Drawer isOpen={isMenuOpen} placement="right" onClose={onMenuClose}>
        <DrawerOverlay />
        <DrawerContent bg="page.background">
          <DrawerCloseButton
            borderRadius="full"
            border="3px solid"
            borderColor="blue.400"
            bg="inherit"
            _hover={{ borderColor: 'orange.400' }}
          />
          <DrawerHeader>Quick•Access</DrawerHeader>
          <DrawerBody>
            <VStack spacing={4} align="stretch">
              {/* Utilities Menu in mobile drawer */}
              <Box display="flex" justifyContent="flex-end">
                <UtilitiesMenu />
              </Box>
              {quickAccessItems.map((item) => (
                <QuickAccessItemComponent
                  key={item.id}
                  title={item.title}
                  description={item.description}
                  isActive={activeItemId === item.id}
                  onClick={() => {
                    if (item.onClick) {
                      item.onClick();
                    }
                    onMenuClose(); // Close the mobile menu after selection
                  }}
                  isDisabled={item.isDisabled}
                  badgeTitle={item.badgeTitle}
                  badgeColorScheme={item.badgeColorScheme}
                  icon={item.icon}
                />
              ))}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};