// frontend/src/pages/TestToolsPage.tsx

import React, { useState } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  Code,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  IconButton,
  useClipboard
} from '@chakra-ui/react';
import { AppIcon } from '../components/AppIcon';
import { ToastTest } from '../components/test-tools/ToastTest';
import { FormValidationTest } from '../components/test-tools/FormValidationTest';
import { ErrorBoundaryTest } from '../components/test-tools/ErrorBoundaryTest';
import { ApiTest } from '../components/test-tools/ApiTest';
import { AuthenticationTest } from '../components/test-tools/AuthenticationTest';
import { PerformanceTest } from '../components/test-tools/PerformanceTest';
import { EnvironmentTest } from '../components/test-tools/EnvironmentTest';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { BaseUtilityPage } from '../components/base/BaseUtilityPage';
import { useEnhancedToast } from '../utils/toastUtils';

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

interface TestToolsPageProps {
  isMenuOpen: boolean;
  onMenuClose: () => void;
}

export const TestToolsPage: React.FC<TestToolsPageProps> = ({ isMenuOpen, onMenuClose }) => {
  const { showSuccess, showError, showInfo } = useEnhancedToast();

  // Initialize with session storage or default to 'environment'
  const [selectedTest, setSelectedTest] = useState<string>(() => {
    const saved = sessionStorage.getItem('testToolsSelectedTest');
    return saved || 'environment';
  });

  // Save selection to session storage whenever it changes
  const handleTestSelection = (testId: string) => {
    setSelectedTest(testId);
    sessionStorage.setItem('testToolsSelectedTest', testId);
  };

  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [currentTestSuite, setCurrentTestSuite] = useState<string>('');
  const [environmentResults, setEnvironmentResults] = useState<TestResult | null>(null);
  const [isProcessingEnvironment, setIsProcessingEnvironment] = useState(false);
  const [currentEnvironmentOperation, setCurrentEnvironmentOperation] = useState<string>('');

  // Listen for custom events from EnvironmentTest component
  React.useEffect(() => {
    const handleRunTestSuite = (event: Event) => {
      const customEvent = event as CustomEvent;
      runTestSuite(customEvent.detail);
    };

    const handleResetEnvironment = async (_event: Event) => {
      setIsProcessingEnvironment(true);
      setCurrentEnvironmentOperation('reset');
      setEnvironmentResults(null);

      try {
        showInfo('Resetting Environment', 'Performing comprehensive environment reset...');

        // Clear browser storage (except auth)
        const currentAuth = localStorage.getItem('authToken');
        const currentUser = localStorage.getItem('currentUser');

        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();

        // Restore auth data
        if (currentAuth) localStorage.setItem('authToken', currentAuth);
        if (currentUser) localStorage.setItem('currentUser', currentUser);

        // Reset test states
        setTestResults(null);

        // Environment reset complete - no backend dependencies needed
        const result: TestResult = {
          test_suite: 'environment-reset',
          exit_code: 0,
          stdout: 'Environment reset completed successfully.\n- Browser storage cleared (auth preserved)\n- Test states reset\n- Ready for testing',
          stderr: '',
          success: true,
          summary: { total: 1, passed: 1, failed: 0, errors: 0 }
        };
        
        setEnvironmentResults(result);
        showSuccess('Environment Reset Complete', 'System has been reset and is ready for testing!');

      } catch (error) {
        const errorResult: TestResult = {
          test_suite: 'environment-reset',
          exit_code: 1,
          stdout: '',
          stderr: `Failed to reset environment: ${error}`,
          success: false,
          summary: { total: 0, passed: 0, failed: 1, errors: 0 }
        };
        setEnvironmentResults(errorResult);
        showError('Reset Failed', { description: `Failed to reset environment: ${error}` });
        console.error('Environment reset error:', error);
      } finally {
        setIsProcessingEnvironment(false);
        setCurrentEnvironmentOperation('');
      }
    };


    window.addEventListener('runTestSuite', handleRunTestSuite as EventListener);
    window.addEventListener('resetEnvironment', handleResetEnvironment as EventListener);
    return () => {
      window.removeEventListener('runTestSuite', handleRunTestSuite as EventListener);
      window.removeEventListener('resetEnvironment', handleResetEnvironment as EventListener);
    };
  }, [showInfo, showError]);

  const runTestSuite = async (testSuite: string) => {
    setIsRunningTests(true);
    setCurrentTestSuite(testSuite);
    setTestResults(null);

    try {
      showInfo('Running Tests', `Starting ${testSuite} test suite...`);

      const response = await fetch(`/api/dev/run-tests?test_suite=${testSuite}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: You'll need to implement proper auth token retrieval here
          // For now, let's see if the endpoint works without auth for testing
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: TestResult = await response.json();
      setTestResults(result);

      if (result.success) {
        showSuccess('Tests Completed', `${testSuite} tests passed!`);
      } else {
        showError('Tests Failed', { description: `${testSuite} tests failed. Check results below.` });
      }

    } catch (error) {
      showError('Test Error', { description: `Failed to run tests: ${error}` });
      console.error('Test execution error:', error);
    } finally {
      setIsRunningTests(false);
      setCurrentTestSuite('');
    }
  };

  // Parse pytest output to extract test counts
  const parsePytestOutput = (stdout: string, stderr: string) => {
    const output = stdout + stderr;

    // Look for patterns like "4 passed", "1 failed", "2 errors"
    const passedMatch = output.match(/(\d+)\s+passed/);
    const failedMatch = output.match(/(\d+)\s+failed/);
    const errorMatch = output.match(/(\d+)\s+error/);
    const skippedMatch = output.match(/(\d+)\s+skipped/);

    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    const errors = errorMatch ? parseInt(errorMatch[1]) : 0;
    const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;
    const total = passed + failed + errors + skipped;

    return { total, passed, failed, errors, skipped };
  };

  const TestResultsDisplay: React.FC<{ results: TestResult; onClear: () => void }> = ({ results, onClear }) => {
    const parsedCounts = parsePytestOutput(results.stdout || '', results.stderr || '');
    const { onCopy: copyStdout, hasCopied: hasCopiedStdout } = useClipboard(results.stdout || '');
    const { onCopy: copyStderr, hasCopied: hasCopiedStderr } = useClipboard(results.stderr || '');

    return (
      <Box mt={4} p={4} border="1px solid" borderColor="gray.300" borderRadius="md" bg="white" _dark={{ borderColor: "gray.700", bg: "gray.900" }}>
        <HStack justify="space-between" mb={3}>
          <Badge colorScheme="cyan" fontSize="sm" px={2} py={1} textTransform="uppercase">
            {results.test_suite}
          </Badge>
          <HStack spacing={2}>
            <Badge colorScheme="blue">Total: {parsedCounts.total}</Badge>
            <Badge colorScheme="green">Passed: {parsedCounts.passed}</Badge>
            <Badge colorScheme="red">Failed: {parsedCounts.failed}</Badge>
            <Badge colorScheme="orange">Errors: {parsedCounts.errors}</Badge>
            {parsedCounts.skipped > 0 && (
              <Badge colorScheme="gray">Skipped: {parsedCounts.skipped}</Badge>
            )}
            <Badge colorScheme={results.success ? "green" : "red"}>
              {results.success ? "SUCCESS" : "FAILED"}
            </Badge>
            <IconButton
              aria-label="Clear results"
              icon={<AppIcon name="delete" />}
              size="xs"
              variant="ghost"
              onClick={onClear}
              _hover={{ bg: "red.100" }}
            />
          </HStack>
        </HStack>

        <Accordion allowToggle>
          <AccordionItem>
            <AccordionButton>
              <Box flex="1" textAlign="left">
                <Text fontWeight="semibold">Test Output</Text>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <VStack spacing={3} align="stretch">
                {results.stdout && (
                  <Box>
                    <HStack justify="space-between" align="center" mb={1}>
                      <Text fontWeight="semibold">Standard Output:</Text>
                      <IconButton
                        aria-label="Copy output"
                        icon={<AppIcon name="copy" />}
                        size="xs"
                        variant="ghost"
                        onClick={copyStdout}
                        colorScheme={hasCopiedStdout ? "green" : "gray"}
                      />
                    </HStack>
                    <Code
                      p={3}
                      fontSize="sm"
                      whiteSpace="pre-wrap"
                      display="block"
                      maxHeight="200px"
                      overflowY="auto"
                      bg="gray.50"
                      color="gray.800"
                      _dark={{ bg: "gray.900", color: "gray.100" }}
                    >
                      {results.stdout}
                    </Code>
                  </Box>
                )}
                {results.stderr && (
                  <Box>
                    <HStack justify="space-between" align="center" mb={1}>
                      <Text fontWeight="semibold">Standard Error:</Text>
                      <IconButton
                        aria-label="Copy error output"
                        icon={<AppIcon name="copy" />}
                        size="xs"
                        variant="ghost"
                        onClick={copyStderr}
                        colorScheme={hasCopiedStderr ? "green" : "gray"}
                      />
                    </HStack>
                    <Code
                      p={3}
                      fontSize="sm"
                      whiteSpace="pre-wrap"
                      display="block"
                      maxHeight="200px"
                      overflowY="auto"
                      bg="red.50"
                      color="red.800"
                      _dark={{ bg: "red.900", color: "red.100" }}
                    >
                      {results.stderr}
                    </Code>
                  </Box>
                )}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </Box>
    );
  };

  // No default content needed since we always have a test selected

  // Render individual test component with card wrapper
  const renderTestComponent = () => {

    const cardWrapper = (component: React.ReactNode) => (
      <Box
        maxWidth="620px"
        mx="auto"
        mt={0}
      >
        <Box
          p={4}
          borderWidth="2px"
          borderColor="gray.600"
          borderRadius="md"
          height="fit-content"
        >
          {component}
        </Box>
      </Box>
    );

    switch (selectedTest) {
      case 'performance':
        return cardWrapper(<PerformanceTest />);
      case 'environment':
        return cardWrapper(
          <EnvironmentTest
            environmentResults={environmentResults}
            isProcessingEnvironment={isProcessingEnvironment}
            currentEnvironmentOperation={currentEnvironmentOperation}
            onClearEnvironmentResults={() => setEnvironmentResults(null)}
          />
        );
      case 'api':
        return cardWrapper(
          <ApiTest
            testResults={testResults}
            isRunningTests={isRunningTests}
            currentTestSuite={currentTestSuite}
            onRunTestSuite={runTestSuite}
            TestResultsDisplay={TestResultsDisplay}
            onClearTestResults={() => setTestResults(null)}
          />
        );
      case 'authentication':
        return cardWrapper(<AuthenticationTest />);
      case 'error-boundary':
        return cardWrapper(<ErrorBoundaryTest />);
      case 'toast':
        return cardWrapper(<ToastTest />);
      case 'form-validation':
        return cardWrapper(<FormValidationTest />);
      default:
        return cardWrapper(<EnvironmentTest
          environmentResults={environmentResults}
          isProcessingEnvironment={isProcessingEnvironment}
          currentEnvironmentOperation={currentEnvironmentOperation}
          onClearEnvironmentResults={() => setEnvironmentResults(null)}
        />); // Fallback to environment
    }
  };

  // QuickAccess items ordered as requested: Environment first as starting point, then by priority
  // Using badge titles and colors from the actual test components
  const quickAccessItems = [
    {
      id: 'environment',
      title: 'Environment',
      description: 'Test filesystem and environment setup',
      badgeTitle: 'ENVIRONMENT',
      badgeColorScheme: 'purple',
      onClick: () => handleTestSelection('environment')
    },
    {
      id: 'performance',
      title: 'Performance',
      description: 'Test database, network, and system performance',
      badgeTitle: 'PERFORMANCE',
      badgeColorScheme: 'blue',
      onClick: () => handleTestSelection('performance')
    },
    {
      id: 'api',
      title: 'API Testing',
      description: 'Test API endpoints and connectivity',
      badgeTitle: 'API TESTING',
      badgeColorScheme: 'cyan',
      onClick: () => handleTestSelection('api')
    },
    {
      id: 'authentication',
      title: 'Authentication',
      description: 'Test login and session management',
      badgeTitle: 'AUTHENTICATION',
      badgeColorScheme: 'purple',
      onClick: () => handleTestSelection('authentication')
    },
    {
      id: 'error-boundary',
      title: 'Error Boundary',
      description: 'Test error handling and recovery',
      badgeTitle: 'ERROR BOUNDARY',
      badgeColorScheme: 'red',
      onClick: () => handleTestSelection('error-boundary')
    },
    {
      id: 'toast',
      title: 'Notifications',
      description: 'Test toast notifications and alerts',
      badgeTitle: 'NOTIFICATIONS',
      badgeColorScheme: 'orange',
      onClick: () => handleTestSelection('toast')
    },
    {
      id: 'form-validation',
      title: 'Form Validation',
      description: 'Test form validation and input handling',
      badgeTitle: 'FORM VALIDATION',
      badgeColorScheme: 'blue',
      onClick: () => handleTestSelection('form-validation')
    }
  ];

  return (
    <ErrorBoundary context="Test Tools Page">
      <BaseUtilityPage
        pageTitle="Test Tools"
        pageIcon="warning"
        defaultContent={null}
        selectedContent={renderTestComponent()}
        quickAccessItems={quickAccessItems}
        activeItemId={selectedTest}
        isMenuOpen={isMenuOpen}
        onMenuClose={onMenuClose}
      />
    </ErrorBoundary>
  );
};