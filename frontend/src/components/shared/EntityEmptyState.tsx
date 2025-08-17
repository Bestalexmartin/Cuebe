// frontend/src/components/shared/EntityEmptyState.tsx

import React from 'react';
import { Flex, Text, Button } from '@chakra-ui/react';
import { AppIcon, IconName } from '../AppIcon';

interface EntityEmptyStateProps {
  entityIcon: IconName;
  message: string;
  actionButtonText: string;
  onActionClick: () => void;
}

export const EntityEmptyState: React.FC<EntityEmptyStateProps> = ({
  entityIcon,
  message,
  actionButtonText,
  onActionClick
}) => {
  return (
    <Flex direction="column" align="center" justify="center" height="200px" gap="4">
      <AppIcon name={entityIcon} boxSize="40px" color="gray.400" />
      <Text color="gray.500" textAlign="center">
        {message}
      </Text>
      <Button
        bg="blue.400"
        color="white"
        size="sm"
        onClick={onActionClick}
        _hover={{ bg: 'orange.400' }}
      >
        {actionButtonText}
      </Button>
    </Flex>
  );
};