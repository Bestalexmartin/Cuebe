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
  const [isPreparing, setIsPreparing] = React.useState(false);
  const [prepStatus, setPrepStatus] = React.useState<string>('');

  const handleTestSuite = async (testSuite: string) => {
    // Check and prepare pytest before running tests
    setIsPreparing(true);
    setPrepStatus('Checking pytest availability...');
    
    try {
      const prepResponse = await fetch('/api/system-tests/prepare-pytest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!prepResponse.ok) {
        throw new Error(`Preparation failed: HTTP ${prepResponse.status}`);
      }
      
      const prepData = await prepResponse.json();
      
      if (prepData.installation_required) {
        setPrepStatus('Installing pytest for API testing (this may take 30-60 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      if (!prepData.pytest_available && prepData.error) {
        throw new Error(`pytest preparation failed: ${prepData.error}`);
      }
      
      setPrepStatus('pytest ready - running tests...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Now run the actual test suite
      onRunTestSuite(testSuite);
      
    } catch (error) {
      console.error('API test preparation failed:', error);
      // Still try to run tests even if preparation failed
      onRunTestSuite(testSuite);
    } finally {
      setIsPreparing(false);
      setPrepStatus('');
    }
  };

  const isAnyRunning = isRunningTests || isPreparing;

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
              onClick={() => handleTestSuite('quick')}
              isLoading={(isRunningTests && currentTestSuite === 'quick') || isPreparing}
              loadingText={isPreparing ? "Preparing..." : "Testing..."}
              leftIcon={(isRunningTests && currentTestSuite === 'quick') || isPreparing ? <Spinner size="sm" /> : undefined}
              isDisabled={isAnyRunning}
            >
              Health Check
            </Button>
            <Button
              bg="blue.400"
              color="white"
              _hover={{ bg: 'orange.400' }}
              size="sm"
              onClick={() => handleTestSuite('auth')}
              isLoading={(isRunningTests && currentTestSuite === 'auth') || isPreparing}
              loadingText={isPreparing ? "Preparing..." : "Testing..."}
              leftIcon={(isRunningTests && currentTestSuite === 'auth') || isPreparing ? <Spinner size="sm" /> : undefined}
              isDisabled={isAnyRunning}
            >
              Auth Tests
            </Button>
            <Button
              bg="blue.400"
              color="white"
              _hover={{ bg: 'orange.400' }}
              size="sm"
              onClick={() => handleTestSuite('critical')}
              isLoading={(isRunningTests && currentTestSuite === 'critical') || isPreparing}
              loadingText={isPreparing ? "Preparing..." : "Testing..."}
              leftIcon={(isRunningTests && currentTestSuite === 'critical') || isPreparing ? <Spinner size="sm" /> : undefined}
              isDisabled={isAnyRunning}
            >
              Critical API Tests
            </Button>
            <Button
              bg="blue.400"
              color="white"
              _hover={{ bg: 'orange.400' }}
              size="sm"
              onClick={() => handleTestSuite('all')}
              isLoading={(isRunningTests && currentTestSuite === 'all') || isPreparing}
              loadingText={isPreparing ? "Preparing..." : "Testing..."}
              leftIcon={(isRunningTests && currentTestSuite === 'all') || isPreparing ? <Spinner size="sm" /> : undefined}
              isDisabled={isAnyRunning}
            >
              Run All Tests
            </Button>
          </HStack>
        </VStack>
      </Box>

      {isPreparing && (
        <Alert status="info">
          <AlertIcon />
          <AlertTitle>Preparing API Tests</AlertTitle>
          <AlertDescription>{prepStatus}</AlertDescription>
        </Alert>
      )}

      {isRunningTests && !isPreparing && (
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