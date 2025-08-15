// frontend/src/components/base/BaseEditPage.tsx

import React from 'react';
import {
  Flex,
  Box,
  Heading,
  HStack,
  Button,
  Divider
} from '@chakra-ui/react';
import { AppIcon, IconName } from '../AppIcon';
import { ActionsMenu, ActionItem } from '../ActionsMenu';

export interface BaseEditPageAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  onClick?: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  type?: 'button' | 'submit';
}

interface BaseEditPageProps {
  pageTitle: string;
  pageIcon?: IconName;
  headerBadge?: React.ReactNode;  // Custom badge to show next to title
  children: React.ReactNode;

  // Form handling
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;

  // Actions
  primaryAction?: BaseEditPageAction;
  secondaryActions?: BaseEditPageAction[];
  menuActions?: ActionItem[];

  // Loading state
  isLoading?: boolean;
}

export const BaseEditPage: React.FC<BaseEditPageProps> = ({
  pageTitle,
  pageIcon = 'edit',
  headerBadge,
  children,
  onSubmit,
  primaryAction,
  secondaryActions = [],
  menuActions = [],
  isLoading = false
}) => {
  const containerProps = {
    width: "100%",
    height: "100%",
    p: "2rem",
    flexDirection: "column" as const,
    boxSizing: "border-box" as const,
  };

  return onSubmit ? (
    <Box
      as="form"
      onSubmit={onSubmit}
      {...containerProps}
      display="flex"
    >
      {/* Header Section */}
      <Flex justify="space-between" align="center" flexShrink={0}>
        <HStack spacing="2" align="center">
          <AppIcon name={pageIcon} boxSize="20px" />
          <Heading as="h2" size="md">
            {isLoading ? 'Loading...' : pageTitle}
          </Heading>
          {!isLoading && headerBadge && headerBadge}
        </HStack>
        
        <HStack spacing="2">
          {/* Actions Menu */}
          {menuActions.length > 0 && (
            <>
              <ActionsMenu actions={menuActions} />
              <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />
            </>
          )}
          
          {/* Secondary Actions */}
          {secondaryActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'outline'}
              onClick={action.onClick}
              isLoading={action.isLoading}
              isDisabled={action.isDisabled}
              type={action.type || 'button'}
              size="xs"
              _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
            >
              {action.label}
            </Button>
          ))}
          
          {/* Primary Action */}
          {primaryAction && (
            <Button
              bg="blue.400"
              color="white"
              onClick={primaryAction.onClick}
              isLoading={primaryAction.isLoading}
              isDisabled={primaryAction.isDisabled}
              type={primaryAction.type || 'button'}
              size="xs"
              _hover={{ bg: 'orange.400' }}
            >
              {primaryAction.label}
            </Button>
          )}
        </HStack>
      </Flex>

      {/* Main Content Area */}
      <Box
        mt="4"
        flexGrow={1}
        border="1px solid"
        borderColor="container.border"
        p="4"
        pb="8"
        borderRadius="md"
        overflowY="auto"
        className="hide-scrollbar edit-form-container"
        minHeight={0}
      >
        {children}
      </Box>
    </Box>
  ) : (
    <Flex
      {...containerProps}
    >
      {/* Header Section */}
      <Flex justify="space-between" align="center" flexShrink={0}>
        <HStack spacing="2" align="center">
          <AppIcon name={pageIcon} boxSize="20px" />
          <Heading as="h2" size="md">
            {isLoading ? 'Loading...' : pageTitle}
          </Heading>
        </HStack>
        
        <HStack spacing="2">
          {/* Actions Menu */}
          {menuActions.length > 0 && (
            <>
              <ActionsMenu actions={menuActions} />
              <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />
            </>
          )}
          
          {/* Secondary Actions */}
          {secondaryActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'outline'}
              onClick={action.onClick}
              isLoading={action.isLoading}
              isDisabled={action.isDisabled}
              type={action.type || 'button'}
              size="xs"
              _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
            >
              {action.label}
            </Button>
          ))}
          
          {/* Primary Action */}
          {primaryAction && (
            <Button
              bg="blue.400"
              color="white"
              onClick={primaryAction.onClick}
              isLoading={primaryAction.isLoading}
              isDisabled={primaryAction.isDisabled}
              type={primaryAction.type || 'button'}
              size="xs"
              _hover={{ bg: 'orange.400' }}
            >
              {primaryAction.label}
            </Button>
          )}
        </HStack>
      </Flex>

      {/* Main Content Area */}
      <Box
        mt="4"
        flexGrow={1}
        border="1px solid"
        borderColor="container.border"
        p="4"
        pb="8"
        borderRadius="md"
        overflowY="auto"
        className="hide-scrollbar edit-form-container"
        minHeight={0}
      >
        {children}
      </Box>
    </Flex>
  );
};