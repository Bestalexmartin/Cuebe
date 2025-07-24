// frontend/src/components/ToastTest.tsx

import React from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Heading,
  Text,
  Divider,
  Badge
} from '@chakra-ui/react';
import { useEnhancedToast } from '../../utils/toastUtils';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { createApiError } from '../../types/errorTypes';

export const ToastTest: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useEnhancedToast();
  const { executeWithRetry } = useErrorHandler();

  // Test different toast types
  const testToastTypes = () => {
    showSuccess('Success Toast', 'This is what a success message looks like!');

    const timeouts = [
      setTimeout(() => {
        showError('Error Toast', { description: 'This is what an error message looks like!' });
      }, 1000),

      setTimeout(() => {
        showWarning('Warning Toast', 'This is what a warning message looks like!');
      }, 2000),

      setTimeout(() => {
        showInfo('Info Toast', 'This is what an info message looks like!');
      }, 3000)
    ];

    // Return cleanup function
    return () => {
      timeouts.forEach(clearTimeout);
    };
  };

  // Test API error with retry
  const testApiErrorWithRetry = async () => {
    const retryableError = createApiError(
      'Failed to connect to server. Please try again.',
      0, // Network error
      'Connection timeout after 5 seconds'
    );

    showError(retryableError);

    // Show follow-up info about retry capability
    const timeout = setTimeout(() => {
      showInfo('Retry Capability', 'In a real scenario, this error would have automatic retry logic!');
    }, 2000);

    // Return cleanup function
    return () => {
      clearTimeout(timeout);
    };
  };

  // Test different error types
  const testErrorTypes = () => {
    const timeouts = [
      // Network error
      setTimeout(() => {
        const networkError = createApiError('Unable to connect to server', 0);
        showError(networkError);
      }, 0),

      // Validation error
      setTimeout(() => {
        const validationError = createApiError('Please check your input', 400);
        showError(validationError);
      }, 1500),

      // Auth error
      setTimeout(() => {
        const authError = createApiError('Please sign in to continue', 401);
        showError(authError);
      }, 3000),

      // Server error
      setTimeout(() => {
        const serverError = createApiError('Internal server error occurred', 500);
        showError(serverError);
      }, 4500)
    ];

    // Return cleanup function
    return () => {
      timeouts.forEach(clearTimeout);
    };
  };

  // Test network operation with retry
  const testNetworkRetry = async () => {
    try {
      await executeWithRetry(
        async () => {
          // Simulate network failure
          throw new Error('Network timeout');
        },
        'test-network-operation',
        {
          context: 'Testing network retry mechanism',
          retryConfig: { maxRetries: 2, baseDelay: 1000 }
        }
      );
    } catch (error) {
      // Error will be automatically handled and displayed
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      <HStack spacing={2}>
        <Badge colorScheme="orange" fontSize="sm" px={2} py={1}>NOTIFICATIONS</Badge>
      </HStack>

      <Text color="gray.600" fontSize="md">
        Test toast notifications and error handling with different types and categories.
      </Text>

      {/* Toast Type Tests */}
      <Box>
        <Box>
          <HStack spacing={2} flexWrap="wrap">
            <Button
              size="sm"
              bg="blue.400"
              color="white"
              _hover={{ bg: 'orange.400' }}
              onClick={() => showSuccess('Quick Success', 'Operation completed!')}
            >
              Success
            </Button>
            <Button
              size="sm"
              bg="blue.400"
              color="white"
              _hover={{ bg: 'orange.400' }}
              onClick={() => showError('Quick Error', { description: 'Something went wrong!' })}
            >
              Error
            </Button>
            <Button
              size="sm"
              bg="blue.400"
              color="white"
              _hover={{ bg: 'orange.400' }}
              onClick={() => showWarning('Quick Warning', 'Please check this!')}
            >
              Warning
            </Button>
            <Button
              size="sm"
              bg="blue.400"
              color="white"
              _hover={{ bg: 'orange.400' }}
              onClick={() => showInfo('Quick Info', 'Just so you know...')}
            >
              Info
            </Button>
            <Button
              size="sm"
              bg="blue.400"
              color="white"
              _hover={{ bg: 'orange.400' }}
              onClick={testToastTypes}
            >
              Show All Types
            </Button>
          </HStack>
        </Box>
      </Box>

      {/* Error Category Tests */}
      <Box>
        <Text mb={6} fontSize="md" color="gray.600">
          Test different error types with appropriate color-coded styling
        </Text>
        <HStack spacing={3} flexWrap="wrap">
          <Button
            size="sm"
            bg="blue.400"
            color="white"
            _hover={{ bg: 'orange.400' }}
            onClick={testErrorTypes}
          >
            Show Error Types
          </Button>
          <Button
            size="sm"
            bg="blue.400"
            color="white"
            _hover={{ bg: 'orange.400' }}
            onClick={testApiErrorWithRetry}
          >
            Network Error Demo
          </Button>
          <Button
            size="sm"
            bg="blue.400"
            color="white"
            _hover={{ bg: 'orange.400' }}
            onClick={testNetworkRetry}
          >
            Retry Logic Test
          </Button>
        </HStack>
      </Box>
    </VStack>
  );
};