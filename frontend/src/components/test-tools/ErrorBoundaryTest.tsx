// frontend/src/components/ErrorBoundaryTest.tsx

import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Alert,
  AlertIcon,
  AlertDescription
} from '@chakra-ui/react';
import { ErrorBoundary } from '../ErrorBoundary';

export const ErrorBoundaryTest: React.FC = () => {
  const [testScenario, setTestScenario] = useState<string | null>(null);
  const [boundaryKey, setBoundaryKey] = useState(0);

  // Reset the error boundary by changing its key (forces remount)
  const resetErrorBoundary = useCallback(() => {
    setTestScenario(null);
    setBoundaryKey(prev => prev + 1);
  }, []);

  // Different crash scenarios to test
  const crashScenarios = {
    render: () => {
      throw new Error('Render Error: Component failed during rendering');
    },
    null: () => {
      // Try to access property of null
      const obj: any = null;
      return <Text>{obj.someProperty}</Text>;
    },
    undefined: () => {
      // Try to call undefined as function
      const undefinedFunc: any = undefined;
      return <Text>{undefinedFunc()}</Text>;
    },
    array: () => {
      // Array index error
      const arr: any[] = [];
      return <Text>{arr[0].name}</Text>;
    }
  };

  // Component that will crash based on scenario
  const CrashingComponent: React.FC = () => {
    if (!testScenario) {
      return (
        <Alert status="success" borderRadius="md">
          <AlertIcon />
          <AlertDescription>Component ready for testing</AlertDescription>
        </Alert>
      );
    }

    const crashFunction = crashScenarios[testScenario as keyof typeof crashScenarios];
    return crashFunction();
  };

  return (
    <VStack spacing={6} align="stretch">
      <HStack spacing={2}>
        <Badge colorScheme="red" fontSize="sm" px={2} py={1}>ERROR BOUNDARY</Badge>
      </HStack>

      <Text color="gray.600" fontSize="md">
        Test different component crash scenarios to verify your Error Boundary catches them properly.
      </Text>

      <VStack spacing={4} align="stretch">

        {/* Test Buttons */}
        <HStack spacing={2} flexWrap="wrap">
          <Button
            size="sm"
            bg="blue.400"
            color="white"
            _hover={{ bg: 'orange.400' }}
            onClick={() => setTestScenario('render')}
            isDisabled={!!testScenario}
          >
            Render Error
          </Button>
          <Button
            size="sm"
            bg="blue.400"
            color="white"
            _hover={{ bg: 'orange.400' }}
            onClick={() => setTestScenario('null')}
            isDisabled={!!testScenario}
          >
            Null Reference
          </Button>
          <Button
            size="sm"
            bg="blue.400"
            color="white"
            _hover={{ bg: 'orange.400' }}
            onClick={() => setTestScenario('undefined')}
            isDisabled={!!testScenario}
          >
            Call Undefined
          </Button>
          <Button
            size="sm"
            bg="blue.400"
            color="white"
            _hover={{ bg: 'orange.400' }}
            onClick={() => setTestScenario('array')}
            isDisabled={!!testScenario}
          >
            Array Error
          </Button>
          <Button
            size="sm"
            bg="green.400"
            color="white"
            _hover={{ bg: 'green.500' }}
            onClick={resetErrorBoundary}
            isDisabled={!testScenario}
            px={6}
          >
            Reset
          </Button>
        </HStack>

        {/* Error Boundary Container */}
        <Box
          p={4}
          border="2px dashed"
          borderColor="gray.300"
          borderRadius="md"
          bg="gray.50"
          _dark={{ bg: "gray.800", borderColor: "gray.600" }}
        >
          <Text fontSize="sm" fontWeight="bold" mb={2} color="gray.600">
            Error Boundary Test Area:
          </Text>

          <ErrorBoundary
            key={boundaryKey}
            context="Error Boundary Test Component"
            fallback={
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertDescription fontWeight="bold">
                    ✅ Error Boundary Working!
                  </AlertDescription>
                  <Text fontSize="sm" mt={2}>
                    The component crashed but was caught by the Error Boundary.
                  </Text>
                  <Text fontSize="xs" mt={1} color="gray.600">
                    Click "Reset" to test again.
                  </Text>
                </Box>
              </Alert>
            }
          >
            <CrashingComponent />
          </ErrorBoundary>
        </Box>

      </VStack>
    </VStack>
  );
};