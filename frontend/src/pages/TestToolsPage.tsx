// frontend/src/TestToolsPage.tsx

import React, { useState } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
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
import { ToastTest } from '../components/ToastTest';
import { FormValidationTest } from '../components/FormValidationTest';
import { ErrorBoundaryTest } from '../components/ErrorBoundaryTest';
import { EnvironmentTest } from '../components/EnvironmentTest';
import { ApiTest } from '../components/ApiTest';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AppIcon } from '../components/AppIcon';
import { OptionsMenu } from '../components/OptionsMenu';
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

export const TestToolsPage: React.FC = () => {
  const { showSuccess, showError, showInfo } = useEnhancedToast();

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
    
    const handleResetEnvironment = async (event: Event) => {
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
        
        // Install/verify dependencies
        const response = await fetch('/api/dev/run-tests?test_suite=setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result: TestResult = await response.json();
        setEnvironmentResults(result);
        
        if (result.success) {
          showSuccess('Environment Reset Complete', 'System has been reset and is ready for testing!');
        } else {
          showError('Reset Issues Detected', { description: 'Environment reset completed with some issues. Check output below.' });
        }
        
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
    
    const handleClearTestResults = async (event: Event) => {
      setIsProcessingEnvironment(true);
      setCurrentEnvironmentOperation('clear');
      
      try {
        showInfo('Clearing Results', 'Clearing all test results and resetting test states...');
        
        // Clear all test results
        setTestResults(null);
        setEnvironmentResults(null);
        
        // Small delay for user feedback
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const clearResult: TestResult = {
          test_suite: 'clear-results',
          exit_code: 0,
          stdout: 'All test results cleared successfully\nTest tool states reset\nReady for new testing',
          stderr: '',
          success: true,
          summary: { total: 1, passed: 1, failed: 0, errors: 0 }
        };
        
        setEnvironmentResults(clearResult);
        showSuccess('Results Cleared', 'All test results have been cleared successfully!');
        
      } catch (error) {
        showError('Clear Failed', { description: `Failed to clear results: ${error}` });
        console.error('Clear results error:', error);
      } finally {
        setIsProcessingEnvironment(false);
        setCurrentEnvironmentOperation('');
      }
    };
    
    window.addEventListener('runTestSuite', handleRunTestSuite as EventListener);
    window.addEventListener('resetEnvironment', handleResetEnvironment as EventListener);
    window.addEventListener('clearTestResults', handleClearTestResults as EventListener);
    return () => {
      window.removeEventListener('runTestSuite', handleRunTestSuite as EventListener);
      window.removeEventListener('resetEnvironment', handleResetEnvironment as EventListener);
      window.removeEventListener('clearTestResults', handleClearTestResults as EventListener);
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

  const TestResultsDisplay: React.FC<{ results: TestResult }> = ({ results }) => {
    const parsedCounts = parsePytestOutput(results.stdout || '', results.stderr || '');
    const { onCopy: copyStdout, hasCopied: hasCopiedStdout } = useClipboard(results.stdout || '');
    const { onCopy: copyStderr, hasCopied: hasCopiedStderr } = useClipboard(results.stderr || '');

    return (
      <Box mt={4} p={4} border="1px solid" borderColor="gray.300" borderRadius="md">
        <HStack justify="space-between" mb={3}>
          <Heading size="sm">Test Results: {results.test_suite}</Heading>
          <Badge colorScheme={results.success ? "green" : "red"}>
            {results.success ? "PASSED" : "FAILED"}
          </Badge>
        </HStack>

        <HStack spacing={2} mb={3} flexWrap="wrap">
          <Badge colorScheme="blue">Total: {parsedCounts.total}</Badge>
          <Badge colorScheme="green">Passed: {parsedCounts.passed}</Badge>
          <Badge colorScheme="red">Failed: {parsedCounts.failed}</Badge>
          <Badge colorScheme="orange">Errors: {parsedCounts.errors}</Badge>
          {parsedCounts.skipped > 0 && (
            <Badge colorScheme="gray">Skipped: {parsedCounts.skipped}</Badge>
          )}
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

  return (
    <ErrorBoundary context="Test Tools Page">
      <Box
        width="100%"
        height="100%"
        p="2rem"
        display="flex"
        flexDirection="column"
        boxSizing="border-box"
      >
        {/* Header Section */}
        <Box flexShrink={0}>
          <HStack spacing="2" align="center">
            <AppIcon name="warning" boxSize="20px" />
            <Heading as="h2" size="md">
              Test Tools
            </Heading>
            <Box ml="auto">
              <OptionsMenu />
            </Box>
          </HStack>
        </Box>

        {/* Scrollable Content Box */}
        <Box
          mt="4"
          border="1px solid"
          borderColor="container.border"
          p="4"
          pb="8"
          borderRadius="md"
          flexGrow={1}
          overflowY="auto"
          className="hide-scrollbar edit-form-container"
        >
          <VStack spacing={8} align="stretch">

            {/* Testing Components Section - Two Column Layout */}
            <Box
              display="grid"
              gridTemplateColumns={{ base: "1fr", lg: "1fr 1fr" }}
              gap={4}
              alignItems="start"
            >
              {/* Left Column: Form Validation & Toast Testing */}
              <VStack spacing={4} align="stretch">
                {/* Form Validation */}
                <Box
                  p={4}
                  border="1px solid"
                  borderColor="gray.600"
                  borderRadius="md"
                  height="fit-content"
                >
                  <FormValidationTest />
                </Box>

                {/* Toast & Notifications */}
                <Box
                  p={4}
                  border="1px solid"
                  borderColor="gray.600"
                  borderRadius="md"
                  height="fit-content"
                >
                  <ToastTest />
                </Box>
              </VStack>

              {/* Right Column: Error Boundary, Environment & API Testing */}
              <VStack spacing={4} align="stretch">
                {/* Error Boundary */}
                <Box
                  p={4}
                  border="1px solid"
                  borderColor="gray.600"
                  borderRadius="md"
                  height="fit-content"
                >
                  <ErrorBoundaryTest />
                </Box>

                {/* Environment Tools */}
                <Box
                  p={4}
                  border="1px solid"
                  borderColor="gray.600"
                  borderRadius="md"
                  height="fit-content"
                >
                  <EnvironmentTest 
                    environmentResults={environmentResults}
                    isProcessingEnvironment={isProcessingEnvironment}
                    currentEnvironmentOperation={currentEnvironmentOperation}
                  />
                </Box>

                {/* API Test Runner */}
                <Box
                  p={4}
                  border="1px solid"
                  borderColor="gray.600"
                  borderRadius="md"
                  height="fit-content"
                >
                  <ApiTest
                    testResults={testResults}
                    isRunningTests={isRunningTests}
                    currentTestSuite={currentTestSuite}
                    onRunTestSuite={runTestSuite}
                    TestResultsDisplay={TestResultsDisplay}
                  />
                </Box>
              </VStack>
            </Box>

          </VStack>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};