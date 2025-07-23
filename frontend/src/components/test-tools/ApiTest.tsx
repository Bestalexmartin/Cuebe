// frontend/src/components/ApiTest.tsx

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Heading,
  Text,
  Divider,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner
} from '@chakra-ui/react';

interface TestResult {
  test_suite: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  success: boolean;
  summary: {
    total: number | string;
    passed: number | string;
    failed: number | string;
    errors: number | string;
  };
}

interface ApiTestProps {
  testResults: TestResult | null;
  isRunningTests: boolean;
  currentTestSuite: string;
  onRunTestSuite: (testSuite: string) => void;
  TestResultsDisplay: React.FC<{ results: TestResult; onClear: () => void }>;
  onClearTestResults: () => void;
}

export const ApiTest: React.FC<ApiTestProps> = ({
  testResults,
  isRunningTests,
  currentTestSuite,
  onRunTestSuite,
  TestResultsDisplay,
  onClearTestResults
}) => {
  return (
    <VStack spacing={6} align="stretch">
      <HStack spacing={2}>
        <Badge colorScheme="cyan" fontSize="sm" px={2} py={1}>API TESTING</Badge>
      </HStack>

      <Text color="gray.600">
        Run backend API tests directly from the UI. These test authentication, data integrity,
        and business logic to ensure your backend is working correctly.
      </Text>

      <Box>
        <VStack spacing={3} align="stretch">
          <HStack spacing={3} flexWrap="wrap">
            <Button
              bg="blue.400"
              color="white"
              _hover={{ bg: 'orange.400' }}
              size="sm"
              onClick={() => onRunTestSuite('quick')}
              isLoading={isRunningTests && currentTestSuite === 'quick'}
              loadingText="Testing..."
              leftIcon={isRunningTests && currentTestSuite === 'quick' ? <Spinner size="sm" /> : undefined}
            >
              Health Check
            </Button>
            <Button
              bg="blue.400"
              color="white"
              _hover={{ bg: 'orange.400' }}
              size="sm"
              onClick={() => onRunTestSuite('auth')}
              isLoading={isRunningTests && currentTestSuite === 'auth'}
              loadingText="Testing..."
              leftIcon={isRunningTests && currentTestSuite === 'auth' ? <Spinner size="sm" /> : undefined}
            >
              Auth Tests
            </Button>
            <Button
              bg="blue.400"
              color="white"
              _hover={{ bg: 'orange.400' }}
              size="sm"
              onClick={() => onRunTestSuite('critical')}
              isLoading={isRunningTests && currentTestSuite === 'critical'}
              loadingText="Testing..."
              leftIcon={isRunningTests && currentTestSuite === 'critical' ? <Spinner size="sm" /> : undefined}
            >
              Critical API Tests
            </Button>
            <Button
              bg="blue.400"
              color="white"
              _hover={{ bg: 'orange.400' }}
              size="sm"
              onClick={() => onRunTestSuite('all')}
              isLoading={isRunningTests && currentTestSuite === 'all'}
              loadingText="Testing..."
              leftIcon={isRunningTests && currentTestSuite === 'all' ? <Spinner size="sm" /> : undefined}
            >
              Run All Tests
            </Button>
          </HStack>
        </VStack>
      </Box>

      {isRunningTests && (
        <Alert status="info">
          <AlertIcon />
          <AlertTitle>Running {currentTestSuite} tests...</AlertTitle>
          <AlertDescription>This may take up to 2 minutes.</AlertDescription>
        </Alert>
      )}

      {testResults && <TestResultsDisplay results={testResults} onClear={onClearTestResults} />}
    </VStack>
  );
};