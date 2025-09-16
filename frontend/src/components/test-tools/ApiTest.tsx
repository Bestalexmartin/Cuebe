// frontend/src/components/test-tools/ApiTest.tsx

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Text,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  IconButton
} from '@chakra-ui/react';
import { useAuth } from '@clerk/clerk-react';
import { AppIcon } from '../AppIcon';
import { getApiUrl } from '../../config/api';

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
  const [isTestingRateLimit, setIsTestingRateLimit] = React.useState(false);
  const [rateLimitResults, setRateLimitResults] = React.useState<string>('');
  const { getToken } = useAuth();

  const handleTestSuite = async (testSuite: string) => {
    // Clear rate limiting results when other tests run
    setRateLimitResults('');
    
    // Check and prepare pytest before running tests
    setIsPreparing(true);
    setPrepStatus('Checking pytest availability...');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }
      
      const prepResponse = await fetch(getApiUrl('/api/system-tests/prepare-pytest'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
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

  const handleRateLimitTest = async () => {
    setIsTestingRateLimit(true);
    setRateLimitResults('');

    // Clear any open test results when rate limiting test starts
    onClearTestResults();

    try {
      // Test rate limiting by making rapid requests to health endpoint
      const url = '/api/health';
      const results: string[] = [];

      results.push('🧪 Testing API Rate Limiting...');
      results.push('📊 Making rapid requests to /api/health (500/min limit):');
      results.push('');

      for (let i = 1; i <= 5; i++) {
        try {
          const startTime = Date.now();
          const response = await fetch(url);
          const endTime = Date.now();
          const responseTime = endTime - startTime;

          if (response.status === 200) {
            results.push(`✅ Request ${i}: Success (${responseTime}ms)`);
          } else if (response.status === 429) {
            const errorData = await response.json();
            results.push(`🚫 Request ${i}: Rate Limited!`);
            results.push(`   Limit: ${errorData.limit || 'Unknown'}`);
            results.push(`   Retry After: ${errorData.retry_after || 'Unknown'}s`);
            results.push('');
            break;
          } else {
            results.push(`❌ Request ${i}: HTTP ${response.status}`);
          }
        } catch (error) {
          results.push(`❌ Request ${i}: Error - ${error}`);
        }

        // Small delay between requests
        if (i < 5) await new Promise(resolve => setTimeout(resolve, 100));
      }

      results.push('');
      results.push('✅ Rate limiting test completed!');
      results.push('');
      results.push('🔧 Configured rate limits:');
      results.push('  • System Tests: 5/minute');
      results.push('  • General API: 100/minute');
      results.push('  • CRUD Operations: 60/minute');
      results.push('  • Read Operations: 200/minute');
      results.push('  • Webhooks/Health: 500/minute');

      setRateLimitResults(results.join('\n'));

    } catch (error) {
      setRateLimitResults(`❌ Rate limit test failed: ${error}`);
    } finally {
      setIsTestingRateLimit(false);
    }
  };

  const isAnyRunning = isRunningTests || isPreparing || isTestingRateLimit;

  return (
    <VStack spacing={6} align="stretch">
      <HStack spacing={2}>
        <Badge colorScheme="cyan" fontSize="sm" px={2} py={1}>API TESTING</Badge>
      </HStack>

      <Text color="cardText" mt={-2}>
        Run backend API tests directly from the UI. These test authentication, data integrity,
        and business logic to ensure your backend is working correctly.
      </Text>

      <Box mt={-2}>
        <VStack spacing={3} align="stretch">
          <HStack spacing={3} flexWrap="wrap">
            <Button
              bg="blue.400"
              color="white"
              _hover={{ bg: 'orange.400' }}
              size="sm"
              onClick={() => handleTestSuite('health')}
              isLoading={isRunningTests && currentTestSuite === 'health'}
              loadingText="Testing..."
              leftIcon={isRunningTests && currentTestSuite === 'health' ? <Spinner size="sm" /> : undefined}
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
              isLoading={isRunningTests && currentTestSuite === 'auth'}
              loadingText="Testing..."
              leftIcon={isRunningTests && currentTestSuite === 'auth' ? <Spinner size="sm" /> : undefined}
              isDisabled={isAnyRunning}
            >
              Authentication
            </Button>
            <Button
              bg="blue.400"
              color="white"
              _hover={{ bg: 'orange.400' }}
              size="sm"
              onClick={() => handleTestSuite('critical')}
              isLoading={isRunningTests && currentTestSuite === 'critical'}
              loadingText="Testing..."
              leftIcon={isRunningTests && currentTestSuite === 'critical' ? <Spinner size="sm" /> : undefined}
              isDisabled={isAnyRunning}
            >
              Critical API
            </Button>
            <Button
              bg="blue.400"
              color="white"
              _hover={{ bg: 'orange.400' }}
              size="sm"
              onClick={handleRateLimitTest}
              isLoading={isTestingRateLimit}
              loadingText="Testing..."
              leftIcon={isTestingRateLimit ? <Spinner size="sm" /> : undefined}
              isDisabled={isAnyRunning}
            >
              Rate Limiting
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

      {isTestingRateLimit && (
        <Alert status="info">
          <AlertIcon />
          <AlertTitle>Testing Rate Limiting...</AlertTitle>
          <AlertDescription>Making rapid requests to verify rate limiting configuration.</AlertDescription>
        </Alert>
      )}

      {rateLimitResults && (
        <Box
          p={4}
          border="1px solid"
          borderColor="gray.300"
          borderRadius="md"
          bg="white"
          _dark={{ borderColor: "gray.700", bg: "gray.900" }}
        >
          <HStack justify="space-between" mb={3}>
            <Badge colorScheme="purple" fontSize="sm" px={2} py={1}>
              RATE LIMIT TEST
            </Badge>
            <IconButton
              aria-label="Clear results"
              icon={<AppIcon name="delete" />}
              size="xs"
              variant="ghost"
              onClick={() => setRateLimitResults('')}
              _hover={{ bg: "red.100" }}
            />
          </HStack>
          <Box
            as="pre"
            fontSize="sm"
            fontFamily="mono"
            whiteSpace="pre-wrap"
            p={3}
            bg="gray.50"
            color="gray.800"
            _dark={{ bg: "gray.800", color: "gray.100" }}
            borderRadius="md"
          >
            {rateLimitResults}
          </Box>
        </Box>
      )}

      {testResults && <TestResultsDisplay results={testResults} onClear={onClearTestResults} />}
    </VStack>
  );
};