// frontend/src/components/shared/EntityViewContainer.tsx

import React from 'react';
import { Box, VStack, Flex, Spinner, Text } from '@chakra-ui/react';

interface EntityViewContainerProps {
  isLoading: boolean;
  error?: string | null;
  hasItems: boolean;
  children: React.ReactNode;
  emptyStateComponent: React.ReactNode;
}

export const EntityViewContainer: React.FC<EntityViewContainerProps> = ({
  isLoading,
  error,
  hasItems,
  children,
  emptyStateComponent
}) => {
  return (
    <Box
      mt="4"
      border="1px solid"
      borderColor="container.border"
      p="4"
      borderRadius="md"
      flexGrow={1}
      overflowY="auto"
      className="hide-scrollbar"
    >
      {isLoading && (
        <Flex justify="center" align="center" height="200px">
          <Spinner />
        </Flex>
      )}
      {error && (
        <Text color="red.500" textAlign="center" p="4">
          {error}
        </Text>
      )}
      {!isLoading && !error && (
        hasItems ? (
          <VStack spacing={4} align="stretch">
            {children}
          </VStack>
        ) : (
          emptyStateComponent
        )
      )}
    </Box>
  );
};