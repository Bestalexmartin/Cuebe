// frontend/src/components/test-tools/PytestTest.tsx

import React, { useState } from 'react';
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
  Code,
  Spinner,
  IconButton,
  useClipboard,
  Progress,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Collapse,
  useDisclosure
} from '@chakra-ui/react';
import { useAuth } from '@clerk/clerk-react';
import { AppIcon } from '../AppIcon';
import { useEnhancedToast } from '../../utils/toastUtils';

interface PytestTestResult {
  test_file: string;
  test_class?: string;
  test_function: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration: number;
  error_message?: string;
}

interface PytestSuiteResult {
  suite_name: string;
  success: boolean;
  total_tests: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  duration: number;
  tests: PytestTestResult[];
  output: string;
  error?: string;
}

interface FixtureStatus {
  fixtures_available: boolean;
  database_setup: boolean;
  mock_data_working: boolean;
  fixtures: Record<string, {
    available: boolean;
    status: string;
    error?: string;
  }>;
  errors: string[];
  recommendations: string[];
}

interface TestData {
  data_type: string;
  success: boolean;
  data?: any;
  error?: string;
}

export const PytestTest: React.FC = () => {
  const [testResults, setTestResults] = useState<PytestSuiteResult | null>(null);
  const [fixtureStatus, setFixtureStatus] = useState<FixtureStatus | null>(null);
  const [testData, setTestData] = useState<TestData | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [isCheckingFixtures, setIsCheckingFixtures] = useState(false);
  const [isCreatingTestData, setIsCreatingTestData] = useState(false);
  const [currentTestSuite, setCurrentTestSuite] = useState<string>('');
  const { getToken } = useAuth();
  const { showSuccess, showError, showWarning } = useEnhancedToast();
  const { hasCopied, onCopy } = useClipboard(testResults?.output || '');
  const { isOpen: isOutputOpen, onToggle: onToggleOutput } = useDisclosure();

  const testSuites = [
    { id: 'all', name: 'All Tests', description: 'Run complete test suite' },
    { id: 'test_api.py', name: 'API Tests', description: 'Basic API functionality tests' },
    { id: 'test_auth.py', name: 'Auth Tests', description: 'Authentication and authorization tests' },
    { id: 'test_api_critical.py', name: 'Critical Tests', description: 'Business logic and critical path tests' },
    { id: 'conftest.py', name: 'Fixtures', description: 'Test fixture validation' }
  ];

  const runTestSuite = async (suiteId: string) => {
    setIsRunningTest(true);
    setCurrentTestSuite(suiteId);
    setTestResults(null);
    // Auto-close test data section when running tests (but leave fixture status open)
    setTestData(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch('/api/system-tests/run-pytest-suite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ test_suite: suiteId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to run test suite');
      }

      const results: PytestSuiteResult = await response.json();
      setTestResults(results);

      if (results.success) {
        showSuccess(
          'Test Suite Complete',
          `${results.passed}/${results.total_tests} tests passed in ${(results.duration / 1000).toFixed(2)}s`
        );
      } else {
        showError(`Test Suite Failed: ${results.failed} tests failed, ${results.passed} passed`);
      }

    } catch (error) {
      console.error('Test execution failed:', error);
      showError(`Test Execution Failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsRunningTest(false);
      setCurrentTestSuite('');
    }
  };

  const checkFixtureStatus = async () => {
    setIsCheckingFixtures(true);
    setFixtureStatus(null);
    // Auto-close test data and results when checking fixtures
    setTestData(null);
    setTestResults(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch('/api/system-tests/test-fixtures-status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to check fixture status');
      }

      const status: FixtureStatus = await response.json();
      setFixtureStatus(status);

      if (status.errors.length === 0) {
        showSuccess('Fixtures Valid', 'All test fixtures are properly configured');
      } else {
        showWarning('Fixture Issues Found', `${status.errors.length} issues detected`);
      }

    } catch (error) {
      console.error('Fixture check failed:', error);
      showError(`Fixture Check Failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsCheckingFixtures(false);
    }
  };

  const createTestData = async (dataType: string) => {
    setIsCreatingTestData(true);
    setTestData(null);
    // Auto-close test results when creating test data (but leave fixture status open)
    setTestResults(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch('/api/system-tests/create-test-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data_type: dataType })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create test data');
      }

      const data: TestData = await response.json();
      setTestData(data);

      if (data.success) {
        showSuccess('Test Data Created', `Generated ${dataType} test data successfully`);
      } else {
        showError(`Test Data Creation Failed: ${data.error || 'Unknown error occurred'}`);
      }

    } catch (error) {
      console.error('Test data creation failed:', error);
      showError(`Test Data Creation Failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsCreatingTestData(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'green';
      case 'failed': return 'red';
      case 'skipped': return 'yellow';
      case 'error': return 'orange';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return 'check';
      case 'failed': return 'close';
      case 'skipped': return 'minus';
      case 'error': return 'warning';
      default: return 'question';
    }
  };

  const clearResults = () => {
    setTestResults(null);
    setTestData(null);
    // Note: We don't clear fixtureStatus here - it stays persistent
  };

  return (
    <VStack spacing={6} align="stretch">
      <HStack spacing={2}>
        <Badge colorScheme="green" fontSize="sm" px={2} py={1}>PYTEST TESTS</Badge>
      </HStack>

      <Text color="cardText" fontSize="md" mt={-2}>
        Run pytest test suites, validate fixtures, and manage test data for comprehensive backend testing.
      </Text>

      {/* Test Suite Runner */}
      <Box mt={-2}>
        <Text fontWeight="semibold" mb={3}>Test Suite Runner</Text>
        <VStack spacing={3} align="stretch">
          <HStack spacing={3} flexWrap="wrap">
            {testSuites.map((suite) => (
              <Button
                key={suite.id}
                bg="blue.400"
                color="white"
                _hover={{ bg: 'orange.400' }}
                size="sm"
                onClick={() => runTestSuite(suite.id)}
                isLoading={isRunningTest && currentTestSuite === suite.id}
                loadingText="Running..."
                leftIcon={isRunningTest && currentTestSuite === suite.id ? <Spinner size="sm" /> : undefined}
                isDisabled={isRunningTest}
              >
                {suite.name}
              </Button>
            ))}
          </HStack>
        </VStack>
      </Box>

      {/* Test Fixture Management */}
      <Box 
        p={4} 
        border="2px dashed" 
        borderColor="gray.300" 
        borderRadius="md" 
        bg="gray.50" 
        _dark={{ bg: "gray.800", borderColor: "gray.600" }}
      >
        <HStack justify="space-between" mb={3}>
          <Text fontWeight="semibold">Test Fixture Status</Text>
          <Button
            bg="blue.400"
            color="white"
            _hover={{ bg: 'orange.400' }}
            size="sm"
            onClick={checkFixtureStatus}
            isLoading={isCheckingFixtures}
            loadingText="Checking..."
            leftIcon={isCheckingFixtures ? <Spinner size="sm" /> : <AppIcon name="refresh" />}
          >
            Check Fixtures
          </Button>
        </HStack>

        {fixtureStatus && (
          <VStack align="stretch" spacing={3}>
            <SimpleGrid columns={3} spacing={4}>
              <Stat size="sm">
                <StatLabel>Fixtures Available</StatLabel>
                <StatNumber fontSize="lg">
                  <Badge colorScheme={fixtureStatus.fixtures_available ? 'green' : 'red'}>
                    {fixtureStatus.fixtures_available ? 'Yes' : 'No'}
                  </Badge>
                </StatNumber>
              </Stat>
              <Stat size="sm">
                <StatLabel>Database Setup</StatLabel>
                <StatNumber fontSize="lg">
                  <Badge colorScheme={fixtureStatus.database_setup ? 'green' : 'red'}>
                    {fixtureStatus.database_setup ? 'Working' : 'Failed'}
                  </Badge>
                </StatNumber>
              </Stat>
              <Stat size="sm">
                <StatLabel>Mock Data</StatLabel>
                <StatNumber fontSize="lg">
                  <Badge colorScheme={fixtureStatus.mock_data_working ? 'green' : 'red'}>
                    {fixtureStatus.mock_data_working ? 'Working' : 'Failed'}
                  </Badge>
                </StatNumber>
              </Stat>
            </SimpleGrid>

            {fixtureStatus.errors.length > 0 && (
              <Alert status="warning" size="sm">
                <AlertIcon />
                <Box>
                  <AlertTitle>Issues Found:</AlertTitle>
                  <AlertDescription>
                    {fixtureStatus.errors.slice(0, 2).join(', ')}
                    {fixtureStatus.errors.length > 2 && ` and ${fixtureStatus.errors.length - 2} more...`}
                  </AlertDescription>
                </Box>
              </Alert>
            )}

            {fixtureStatus.recommendations.length > 0 && (
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={1}>Recommendations:</Text>
                {fixtureStatus.recommendations.map((rec, index) => (
                  <Text key={index} fontSize="xs" color="gray.600" _dark={{ color: "gray.400" }}>
                    • {rec}
                  </Text>
                ))}
              </Box>
            )}
          </VStack>
        )}
      </Box>

      {/* Test Data Creation */}
      <Box p={4} borderWidth={1} borderRadius="md" bg="card.background" border="1px solid" borderColor="gray.300" _dark={{ borderColor: "gray.700" }}>
        <Text fontWeight="semibold" mb={3}>Test Data Creation</Text>
        <HStack spacing={2} mb={3}>
          {['mock_user', 'mock_venue', 'clerk_user'].map((dataType) => (
            <Button
              key={dataType}
              bg="blue.400"
              color="white"
              _hover={{ bg: 'orange.400' }}
              size="sm"
              onClick={() => createTestData(dataType)}
              isLoading={isCreatingTestData}
              loadingText="Creating..."
              leftIcon={isCreatingTestData ? <Spinner size="sm" /> : undefined}
              isDisabled={isCreatingTestData}
            >
              {dataType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Button>
          ))}
        </HStack>

        {testData && (
          <Box>
            {testData.success ? (
              <Box>
                <Alert status="success" size="sm" mb={2}>
                  <AlertIcon />
                  <AlertTitle>Test data created successfully!</AlertTitle>
                </Alert>
                <Code 
                  p={3} 
                  fontSize="sm" 
                  display="block" 
                  whiteSpace="pre-wrap"
                  bg="gray.50"
                  color="gray.800"
                  _dark={{ bg: "gray.900", color: "gray.100" }}
                >
                  {JSON.stringify(testData.data, null, 2)}
                </Code>
              </Box>
            ) : (
              <Alert status="error" size="sm">
                <AlertIcon />
                <AlertTitle>Failed to create test data:</AlertTitle>
                <AlertDescription>{testData.error}</AlertDescription>
              </Alert>
            )}
          </Box>
        )}
      </Box>

      {/* Test Results */}
      {testResults && (
        <Box p={4} border="1px solid" borderColor="gray.300" borderRadius="md" bg="white" _dark={{ borderColor: "gray.700", bg: "gray.900" }}>
          <HStack justify="space-between" mb={4}>
            <Badge colorScheme="green" fontSize="sm" px={2} py={1} textTransform="uppercase">
              {testResults.suite_name}
            </Badge>
            <HStack spacing={2}>
              <Badge colorScheme={testResults.success ? "green" : "red"}>
                {testResults.success ? "SUCCESS" : "FAILED"}
              </Badge>
              <Button size="sm" onClick={onToggleOutput} variant="ghost">
                {isOutputOpen ? 'Hide' : 'Show'} Output
              </Button>
              <IconButton
                aria-label="Clear results"
                icon={<AppIcon name="delete" />}
                size="xs"
                variant="ghost"
                onClick={clearResults}
                _hover={{ bg: "red.100" }}
              />
            </HStack>
          </HStack>

          {/* Test Statistics */}
          <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4} mb={4}>
            <Stat size="sm">
              <StatLabel>Total</StatLabel>
              <StatNumber>{testResults.total_tests}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel>Passed</StatLabel>
              <StatNumber color="green.500">{testResults.passed}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel>Failed</StatLabel>
              <StatNumber color="red.500">{testResults.failed}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel>Skipped</StatLabel>
              <StatNumber color="yellow.500">{testResults.skipped}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel>Duration</StatLabel>
              <StatNumber fontSize="md">{(testResults.duration / 1000).toFixed(2)}s</StatNumber>
            </Stat>
          </SimpleGrid>

          {/* Progress Bar */}
          {testResults.total_tests > 0 && (
            <Box mb={4}>
              <Progress
                value={(testResults.passed / testResults.total_tests) * 100}
                colorScheme={testResults.success ? 'green' : 'red'}
                size="sm"
                borderRadius="md"
              />
              <Text fontSize="xs" color="gray.600" mt={1}>
                {testResults.passed}/{testResults.total_tests} tests passed
              </Text>
            </Box>
          )}

          {/* Test Results Grouped by Class */}
          {testResults.tests.length > 0 && (() => {
            // Group tests by class
            const testsByClass = testResults.tests.reduce((acc, test) => {
              const className = test.test_class || 'Other Tests';
              if (!acc[className]) {
                acc[className] = [];
              }
              acc[className].push(test);
              return acc;
            }, {} as Record<string, PytestTestResult[]>);

            return (
              <Box mb={4}>
                {Object.entries(testsByClass).map(([className, tests]) => (
                  <Box key={className} mb={4}>
                    <Text fontWeight="semibold" mb={2}>{className}:</Text>
                    <VStack align="stretch" spacing={2}>
                      {tests.map((test, index) => (
                        <Box
                          key={index}
                          p={3}
                          bg="card.background"
                          borderRadius="md"
                          border="1px solid"
                          borderColor="gray.300"
                          _dark={{ borderColor: "gray.700" }}
                        >
                          <HStack justify="space-between">
                            <HStack>
                              <AppIcon name={getStatusIcon(test.status)} />
                              <VStack align="start" spacing={0}>
                                <Text fontSize="sm" fontWeight="semibold">
                                  {test.test_function}
                                </Text>
                                <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.400" }}>
                                  {test.test_file}
                                </Text>
                              </VStack>
                            </HStack>
                            <VStack align="end" spacing={0}>
                              <Badge colorScheme={getStatusColor(test.status)} size="sm">
                                {test.status.toUpperCase()}
                              </Badge>
                              <Text fontSize="xs" color="gray.500">
                                {test.duration}ms
                              </Text>
                            </VStack>
                          </HStack>
                          {test.error_message && (
                            <Box mt={2}>
                              <Code 
                                fontSize="xs" 
                                p={2} 
                                display="block" 
                                whiteSpace="pre-wrap"
                                bg="red.50"
                                color="red.800"
                                _dark={{ bg: "red.900", color: "red.100" }}
                              >
                                {test.error_message}
                              </Code>
                            </Box>
                          )}
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                ))}
              </Box>
            );
          })()}

          {/* Test Output */}
          <Collapse in={isOutputOpen}>
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="semibold">Test Output:</Text>
                <IconButton
                  aria-label="Copy output"
                  icon={<AppIcon name="copy" />}
                  size="xs"
                  variant="ghost"
                  onClick={onCopy}
                  colorScheme={hasCopied ? "green" : "gray"}
                />
              </HStack>
              <Code
                p={3}
                fontSize="sm"
                display="block"
                whiteSpace="pre-wrap"
                maxHeight="200px"
                overflowY="auto"
                bg="gray.50"
                color="gray.800"
                _dark={{ bg: "gray.900", color: "gray.100" }}
              >
                {testResults.output || 'No output available'}
              </Code>
            </Box>
          </Collapse>

          {/* Error Display */}
          {testResults.error && (
            <Alert status="error" mt={4}>
              <AlertIcon />
              <Box>
                <AlertTitle>Test Execution Error:</AlertTitle>
                <AlertDescription>{testResults.error}</AlertDescription>
              </Box>
            </Alert>
          )}
        </Box>
      )}
    </VStack>
  );
};