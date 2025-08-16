import React from 'react';
import { Flex, VStack, Spinner, Text, Button } from '@chakra-ui/react';
import { AppIcon } from '../AppIcon';

interface LoadingSpinnerProps {
  bgColor: string;
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = React.memo(({ 
  bgColor, 
  message = "Loading shared content..." 
}) => {
  return (
    <Flex
      height="100vh"
      width="100vw"
      align="center"
      justify="center"
      bg={bgColor}
    >
      <VStack spacing={4}>
        <Spinner size="xl" color="blue.400" />
        <Text color="gray.600" _dark={{ color: 'gray.300' }}>
          {message}
        </Text>
      </VStack>
    </Flex>
  );
});

interface ErrorStateProps {
  bgColor: string;
  error: string;
}

export const ErrorState: React.FC<ErrorStateProps> = React.memo(({ bgColor, error }) => {
  return (
    <Flex
      height="100vh"
      width="100vw"
      align="center"
      justify="center"
      bg={bgColor}
      p={4}
    >
      <VStack spacing={4} textAlign="center">
        <AppIcon name="warning" boxSize="48px" color="orange.400" />
        <Text fontSize="xl" fontWeight="bold" color="red.500">
          {error || 'Content Not Available'}
        </Text>
        <Text color="gray.600" _dark={{ color: 'gray.300' }}>
          This share link may be invalid or expired.
        </Text>
      </VStack>
    </Flex>
  );
});

interface ScriptLoadingProps {
  isLoading: boolean;
  error: string | null;
  onBackToShows: () => void;
}

export const ScriptLoadingState: React.FC<ScriptLoadingProps> = React.memo(({
  isLoading,
  error,
  onBackToShows,
}) => {
  if (isLoading) {
    return (
      <Flex justify="center" align="center" height="200px">
        <VStack spacing={4}>
          <Spinner size="lg" />
          <Text>Loading script...</Text>
        </VStack>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex direction="column" align="center" justify="center" height="200px" gap="4">
        <AppIcon name="warning" boxSize="40px" color="red.400" />
        <Text color="red.500" textAlign="center">{error}</Text>
        <Button onClick={onBackToShows} variant="outline" size="sm">
          Back to Shows
        </Button>
      </Flex>
    );
  }

  return null;
});