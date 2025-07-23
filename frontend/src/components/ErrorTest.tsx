// frontend/src/components/ErrorTestComponent.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Heading,
  Text,
  Divider,
  Code,
  Badge
} from '@chakra-ui/react';
import { useEnhancedToast } from '../utils/toastUtils';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useValidatedForm } from '../hooks/useValidatedForm';
import { ValidationRules } from '../types/validation';
import { FormInput, FormNumberInput } from './form/FormField';
import { createApiError } from '../types/errorTypes';

export const ErrorTest: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useEnhancedToast();
  const { executeWithRetry, handleError } = useErrorHandler();
  const [crashComponent, setCrashComponent] = useState(false);

  // Test form with validation
  const form = useValidatedForm(
    { email: '', name: '', age: undefined as number | undefined },
    {
      validationConfig: {
        email: {
          required: true,
          rules: [ValidationRules.email('Please enter a valid email address')]
        },
        name: {
          required: true,
          rules: [ValidationRules.minLength(2, 'Name must be at least 2 characters')]
        },
        age: {
          required: false,
          rules: [
            ValidationRules.min(18, 'Must be at least 18 years old'),
            ValidationRules.max(120, 'Age seems unrealistic')
          ]
        }
      },
      validateOnBlur: true
    }
  );

  // Test different toast types
  const testToastTypes = () => {
    showSuccess('Success Toast', 'This is what a success message looks like!');

    setTimeout(() => {
      showError('Error Toast', { description: 'This is what an error message looks like!' });
    }, 1000);

    setTimeout(() => {
      showWarning('Warning Toast', 'This is what a warning message looks like!');
    }, 2000);

    setTimeout(() => {
      showInfo('Info Toast', 'This is what an info message looks like!');
    }, 3000);
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
    setTimeout(() => {
      showInfo('Retry Capability', 'In a real scenario, this error would have automatic retry logic!');
    }, 2000);
  };

  // Test different error types
  const testErrorTypes = () => {
    // Network error
    setTimeout(() => {
      const networkError = createApiError('Unable to connect to server', 0);
      showError(networkError);
    }, 0);

    // Validation error
    setTimeout(() => {
      const validationError = createApiError('Please check your input', 400);
      showError(validationError);
    }, 1500);

    // Auth error
    setTimeout(() => {
      const authError = createApiError('Please sign in to continue', 401);
      showError(authError);
    }, 3000);

    // Server error
    setTimeout(() => {
      const serverError = createApiError('Internal server error occurred', 500);
      showError(serverError);
    }, 4500);
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
      console.log('Network retry test completed');
    }
  };

  // Test form validation
  const testFormValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // This will trigger validation and show field errors
      await form.submitForm('/api/fake-endpoint', 'POST', 'Form submitted successfully!');
    } catch (error) {
      console.log('Form validation test completed');
    }
  };

  // Component that will crash to test Error Boundary
  const CrashingComponent: React.FC = () => {
    if (crashComponent) {
      throw new Error('This is a test component crash for Error Boundary demonstration');
    }
    return <Text>Component is working</Text>;
  };

  return (
    <VStack spacing={6} align="stretch">

      <HStack spacing={2}>
        <Badge colorScheme="green" fontSize="sm" px={2} py={1}>ERROR HANDLING</Badge>
      </HStack>

      <Text color="gray.600">
        Use the buttons below to test different types of errors and see how the application
        handles them. This includes network errors, validation errors, server errors, and component crashes.
      </Text>

      <Divider />

      {/* Toast Type Tests */}
      <Box>
        <Heading size="md" mb={3}>Toast Notification Types</Heading>
        <Text mb={3} fontSize="sm" color="gray.600">
          Test all toast notification styles (success, error, warning, info)
        </Text>
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
              Show All Toast Types
            </Button>
          </HStack>
        </Box>
      </Box>

      <Divider />

      {/* Error Category Tests */}
      <Box>
        <Heading size="md" mb={3}>Error Categories</Heading>
        <Text mb={3} fontSize="sm" color="gray.600">
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

      <Divider />

      {/* Form Validation Test */}
      <Box>
        <Heading size="md" mb={3}>Form Validation</Heading>
        <Text mb={3} fontSize="sm" color="gray.600">
          Test field-level validation errors. Try submitting with invalid data.
        </Text>

        <Box p={4} bg="gray.50" _dark={{ bg: "gray.700" }} borderRadius="md">
          <form onSubmit={testFormValidation}>
            <VStack spacing={4} align="stretch">
              <FormInput
                form={form}
                name="name"
                label="Name"
                placeholder="Enter your name"
                isRequired
              />

              <FormInput
                form={form}
                name="email"
                label="Email"
                type="email"
                placeholder="Enter your email"
                isRequired
              />

              <FormNumberInput
                form={form}
                name="age"
                label="Age"
                min={0}
                max={150}
              />

              <HStack justify="flex-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => form.resetForm()}
                  _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  bg="blue.400"
                  color="white"
                  _hover={{ bg: 'orange.400' }}
                  isLoading={form.isSubmitting}
                >
                  Submit Form
                </Button>
              </HStack>

              {form.fieldErrors.length > 0 && (
                <Box p={3} bg="red.500" color="white" borderRadius="md">
                  <Text fontWeight="semibold">Validation Errors:</Text>
                  {form.fieldErrors.map((error, i) => (
                    <Text key={i} fontSize="sm">
                      • {error.field}: {error.message}
                    </Text>
                  ))}
                </Box>
              )}
            </VStack>
          </form>
        </Box>
      </Box>

      <Divider />

      {/* Error Boundary Test */}
      <Box>
        <Heading size="md" mb={3}>Error Boundary Test</Heading>
        <Text mb={3} fontSize="sm" color="gray.600">
          Test React Error Boundary by causing a component crash
        </Text>

        <VStack spacing={3} align="start">
          <HStack spacing={3} flexWrap="wrap">
            <Button
              size="sm"
              bg="blue.400"
              color="white"
              _hover={{ bg: 'orange.400' }}
              onClick={() => setCrashComponent(true)}
              isDisabled={crashComponent}
            >
              Crash Component
            </Button>
            <Button
              size="sm"
              bg="blue.400"
              color="white"
              _hover={{ bg: 'orange.400' }}
              onClick={() => setCrashComponent(false)}
              isDisabled={!crashComponent}
            >
              Reset Component
            </Button>
            <Box
              as="div"
              display="flex"
              alignItems="center"
              justifyContent="center"
              px={4}
              py={0}
              bg="gray.100"
              _dark={{ bg: "gray.600" }}
              borderRadius="md"
              minH="32px"
              minW="120px"
              fontSize="sm"
            >
              <CrashingComponent />
            </Box>
          </HStack>
        </VStack>
      </Box>

    </VStack>
  );
};