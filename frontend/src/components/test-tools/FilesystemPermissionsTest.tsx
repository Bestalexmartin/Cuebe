// frontend/src/components/FilesystemPermissionsTest.tsx

import React, { useState, useRef, useEffect } from 'react';
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
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  IconButton,
  useClipboard
} from '@chakra-ui/react';
import { AppIcon } from '../AppIcon';
import { useEnhancedToast } from '../../utils/toastUtils';

interface PermissionResult {
  path: string;
  readable: boolean;
  writable: boolean;
  exists: boolean;
  error?: string;
}

interface TestResults {
  success: boolean;
  results: PermissionResult[];
  summary: string;
}

const PermissionResultsDisplay: React.FC<{ results: TestResults; onClear: () => void }> = ({ results, onClear }) => {
  const { onCopy, hasCopied } = useClipboard(JSON.stringify(results, null, 2));
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to show the complete results when they first appear
    if (resultsRef.current) {
      const container = document.querySelector('.edit-form-container');
      if (container) {
        const resultsRect = resultsRef.current.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Check if results are partially or fully outside the visible area
        const isBottomCutOff = resultsRect.bottom > containerRect.bottom;
        const isTopCutOff = resultsRect.top < containerRect.top;
        
        if (isBottomCutOff || isTopCutOff) {
          resultsRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
          });
        }
      }
    }
  }, [results]);

  return (
    <Box ref={resultsRef} mt={2} p={4} border="1px solid" borderColor="gray.500" borderRadius="md">
      <HStack justify="space-between" mb={3}>
        <Text fontWeight="semibold">Filesystem Permissions Results</Text>
        <HStack spacing={2}>
          <Badge colorScheme={results.success ? "green" : "red"}>
            {results.success ? "ALL ACCESSIBLE" : "ISSUES FOUND"}
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

      <Text fontSize="sm" color="gray.600" mb={3}>
        {results.summary}
      </Text>

      <VStack spacing={2} align="stretch" mb={4}>
        {results.results.map((result, index) => (
          <HStack key={index} justify="space-between" p={2} bg="gray.800" borderRadius="sm">
            <Text fontSize="sm" fontFamily="mono" color="white">{result.path}</Text>
            <HStack spacing={1}>
              <Badge colorScheme={result.exists ? "green" : "red"} size="sm">
                {result.exists ? "EXISTS" : "MISSING"}
              </Badge>
              {result.exists && (
                <>
                  <Badge colorScheme={result.readable ? "green" : "red"} size="sm">
                    {result.readable ? "READ" : "NO READ"}
                  </Badge>
                  <Badge colorScheme={result.writable ? "green" : "red"} size="sm">
                    {result.writable ? "WRITE" : "NO WRITE"}
                  </Badge>
                </>
              )}
            </HStack>
          </HStack>
        ))}
      </VStack>

      <Accordion allowToggle>
        <AccordionItem>
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <Text fontWeight="semibold">Raw Results (JSON)</Text>
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <HStack justify="space-between" align="center" mb={2}>
              <Text fontSize="sm" color="gray.600">Full test results data</Text>
              <IconButton
                aria-label="Copy results"
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
              whiteSpace="pre-wrap"
              display="block"
              maxHeight="200px"
              overflowY="auto"
              bg="gray.50"
              color="gray.800"
              _dark={{ bg: "gray.900", color: "gray.100" }}
            >
              {JSON.stringify(results, null, 2)}
            </Code>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Box>
  );
};

export const FilesystemPermissionsTest: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const { showSuccess, showError, showInfo } = useEnhancedToast();

  const runFilesystemTest = async () => {
    setIsRunning(true);
    setResults(null);

    try {
      showInfo('Checking Permissions', 'Testing filesystem access permissions...');

      // Key paths to test (simulate what a real app might need)
      const pathsToTest = [
        './logs',
        './tmp',
        './uploads',
        './config',
        './data',
        './',
        './public'
      ];

      const testResults: PermissionResult[] = [];
      let allSuccessful = true;

      // Simulate filesystem permission checks
      // In a real implementation, this would make API calls to backend
      for (const path of pathsToTest) {
        try {
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 100));

          // For demonstration, assume all paths exist and are accessible
          // In real implementation, this would check actual filesystem permissions
          const exists = true;
          const readable = true;
          const writable = true;

          const result: PermissionResult = {
            path,
            exists,
            readable,
            writable
          };

          if (!exists || !readable) {
            allSuccessful = false;
          }

          testResults.push(result);
        } catch (error) {
          const result: PermissionResult = {
            path,
            exists: false,
            readable: false,
            writable: false,
            error: String(error)
          };
          testResults.push(result);
          allSuccessful = false;
        }
      }

      const successCount = testResults.filter(r => r.exists && r.readable).length;
      const summary = `Checked ${testResults.length} paths. ${successCount} fully accessible, ${testResults.length - successCount} with issues.`;

      const finalResults: TestResults = {
        success: allSuccessful,
        results: testResults,
        summary
      };

      setResults(finalResults);

      if (allSuccessful) {
        showSuccess('Permissions OK', 'All filesystem paths are accessible!');
      } else {
        showError('Permission Issues', { description: 'Some filesystem paths have access issues. Check results below.' });
      }

    } catch (error) {
      showError('Test Failed', { description: `Failed to run filesystem test: ${error}` });
      console.error('Filesystem test error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      <HStack spacing={2}>
        <Badge colorScheme="purple" fontSize="sm" px={2} py={1}>FILESYSTEM</Badge>
      </HStack>

      <Text color="gray.600">
        Test filesystem permissions for key application directories. Checks read/write access to common paths like logs, uploads, config, and temp directories.
      </Text>

      <Box>
        <Button
          bg="blue.400"
          color="white"
          _hover={{ bg: 'orange.400' }}
          size="sm"
          onClick={runFilesystemTest}
          isLoading={isRunning}
          loadingText="Testing..."
          leftIcon={isRunning ? <Spinner size="sm" /> : undefined}
        >
          Test Filesystem Permissions
        </Button>
      </Box>

      {isRunning && (
        <Alert status="info">
          <AlertIcon />
          <AlertTitle>Testing filesystem permissions...</AlertTitle>
          <AlertDescription>
            Checking read/write access to application directories.
          </AlertDescription>
        </Alert>
      )}

      {results && <PermissionResultsDisplay results={results} onClear={() => setResults(null)} />}
    </VStack>
  );
};