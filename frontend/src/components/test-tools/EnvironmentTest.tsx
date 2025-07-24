// frontend/src/components/test-tools/EnvironmentTest.tsx

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

// Combined interfaces for both test types
interface FilesystemPermissionResult {
  path: string;
  readable: boolean;
  writable: boolean;
  exists: boolean;
  error?: string;
  description?: string;
  status?: string;
  permissions?: string;
  isDirectory?: boolean;
  isFile?: boolean;
  sizeBytes?: number;
  created?: boolean;
  requiredPermissions?: string[];
}

interface EnvironmentCommandResult {
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

interface ExternalServiceResult {
  service: string;
  status: 'connected' | 'failed' | 'timeout' | 'misconfigured';
  responseTime?: number;
  error?: string;
  details: {
    endpoint?: string;
    configurationStatus?: string;
    lastChecked?: string;
  };
}

interface CombinedSystemResults {
  testType: 'filesystem' | 'environment' | 'external-services';
  success: boolean;
  summary: string;
  totalTime?: number;
  
  // Filesystem-specific results
  filesystemResults?: FilesystemPermissionResult[];
  
  // Environment-specific results
  environmentResult?: EnvironmentCommandResult;
  
  // External services results
  externalServicesResults?: ExternalServiceResult[];
}

const CombinedSystemResultsDisplay: React.FC<{ results: CombinedSystemResults; onClear: () => void }> = ({ results, onClear }) => {
  const { onCopy, hasCopied } = useClipboard(JSON.stringify(results, null, 2));
  const { onCopy: copyStdout, hasCopied: hasCopiedStdout } = useClipboard(results.environmentResult?.stdout || '');
  const { onCopy: copyStderr, hasCopied: hasCopiedStderr } = useClipboard(results.environmentResult?.stderr || '');
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to show the complete results when they first appear
    if (resultsRef.current) {
      const container = document.querySelector('.edit-form-container');
      if (container) {
        const resultsRect = resultsRef.current.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
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

  const getBadgeColor = () => {
    switch (results.testType) {
      case 'filesystem': return 'orange';
      case 'environment': return 'teal';
      case 'external-services': return 'green';
      default: return 'gray';
    }
  };

  const getTestTypeName = () => {
    switch (results.testType) {
      case 'filesystem': return 'Filesystem Permissions';
      case 'environment': return 'Environment Reset';
      case 'external-services': return 'External Services';
      default: return 'System';
    }
  };

  return (
    <Box ref={resultsRef} mt={4} p={4} border="1px solid" borderColor="gray.300" borderRadius="md" bg="white" _dark={{ borderColor: "gray.700", bg: "gray.900" }}>
      <HStack justify="space-between" mb={3}>
        <HStack spacing={2}>
          <Badge colorScheme={getBadgeColor()} fontSize="sm" px={2} py={1}>
            {results.testType.toUpperCase()}
          </Badge>
          <Text fontWeight="semibold">{getTestTypeName()} Results</Text>
        </HStack>
        <HStack spacing={2}>
          <Badge colorScheme={results.success ? "green" : "red"}>
            {results.success ? (results.testType === 'filesystem' ? "ALL ACCESSIBLE" : "SUCCESS") : (results.testType === 'filesystem' ? "ISSUES FOUND" : "FAILED")}
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
        {results.summary}{results.totalTime ? ` | Total test time: ${results.totalTime}ms` : ''}
      </Text>

      {/* Filesystem Permission Results */}
      {results.filesystemResults && (
        <VStack spacing={3} align="stretch" mb={4}>
          {results.filesystemResults.map((result, index) => (
            <Box key={index} p={3} bg="white" borderRadius="md" border="1px solid" borderColor="gray.200" _dark={{ bg: "gray.900", borderColor: "gray.700" }}>
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between" align="start">
                  <VStack align="start" spacing={1} flex={1}>
                    <Text fontSize="sm" fontFamily="mono" fontWeight="semibold">{result.path}</Text>
                    {result.description && (
                      <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.400" }}>{result.description}</Text>
                    )}
                    {result.error && (
                      <Text fontSize="xs" color="red.600" _dark={{ color: "red.400" }}>{result.error}</Text>
                    )}
                  </VStack>
                  <HStack spacing={1} flexWrap="wrap">
                    <Badge colorScheme={result.exists ? "green" : "red"} size="sm">
                      {result.exists ? (result.created ? "CREATED" : "EXISTS") : "MISSING"}
                    </Badge>
                    {result.exists && (
                      <>
                        {result.isDirectory && (
                          <Badge colorScheme="blue" size="sm">DIR</Badge>
                        )}
                        {result.isFile && (
                          <Badge colorScheme="purple" size="sm">FILE</Badge>
                        )}
                        <Badge colorScheme={result.readable ? "green" : "red"} size="sm">
                          {result.readable ? "READ" : "NO READ"}
                        </Badge>
                        <Badge colorScheme={result.writable ? "green" : "red"} size="sm">
                          {result.writable ? "WRITE" : "NO WRITE"}
                        </Badge>
                        {result.permissions && (
                          <Badge colorScheme="gray" size="sm">{result.permissions}</Badge>
                        )}
                      </>
                    )}
                  </HStack>
                </HStack>
                {result.requiredPermissions && (
                  <HStack spacing={1}>
                    <Text fontSize="xs" color="gray.500">Required:</Text>
                    {result.requiredPermissions.map((perm, i) => (
                      <Badge key={i} colorScheme="cyan" size="xs">{perm.toUpperCase()}</Badge>
                    ))}
                    {result.sizeBytes !== undefined && result.sizeBytes > 0 && (
                      <Badge colorScheme="yellow" size="xs">{(result.sizeBytes / 1024).toFixed(1)} KB</Badge>
                    )}
                  </HStack>
                )}
              </VStack>
            </Box>
          ))}
        </VStack>
      )}

      {/* External services results */}
      {results.externalServicesResults && (
        <VStack spacing={3} align="stretch" mb={4}>
          {results.externalServicesResults.map((result, index) => (
            <Box key={index} p={3} bg="white" borderRadius="md" border="1px solid" borderColor="gray.200" _dark={{ bg: "gray.900", borderColor: "gray.700" }}>
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between" align="start">
                  <VStack align="start" spacing={1} flex={1}>
                    <Text fontSize="sm" fontWeight="semibold">{result.service}</Text>
                    {result.details.endpoint && (
                      <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.400" }} fontFamily="mono">{result.details.endpoint}</Text>
                    )}
                    {result.error && (
                      <Text fontSize="xs" color="red.600" _dark={{ color: "red.400" }}>{result.error}</Text>
                    )}
                  </VStack>
                  <HStack spacing={1} flexWrap="wrap">
                    <Badge colorScheme={
                      result.status === 'connected' ? 'green' : 
                      result.status === 'misconfigured' ? 'yellow' : 
                      'red'
                    } size="sm">
                      {result.status.toUpperCase()}
                    </Badge>
                    {result.responseTime && (
                      <Badge colorScheme="blue" size="sm">{result.responseTime}ms</Badge>
                    )}
                  </HStack>
                </HStack>
                {result.details.configurationStatus && (
                  <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.400" }}>
                    Config: {result.details.configurationStatus}
                  </Text>
                )}
              </VStack>
            </Box>
          ))}
        </VStack>
      )}

      {/* Environment Command Results */}
      {results.environmentResult && (
        <Accordion allowToggle>
          <AccordionItem>
            <AccordionButton>
              <Box flex="1" textAlign="left">
                <Text fontWeight="semibold">Command Output</Text>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <VStack spacing={3} align="stretch">
                {results.environmentResult.stdout && (
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
                      {results.environmentResult.stdout}
                    </Code>
                  </Box>
                )}
                {results.environmentResult.stderr && (
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
                      {results.environmentResult.stderr}
                    </Code>
                  </Box>
                )}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}

      {/* JSON Results Accordion */}
      <Accordion allowToggle mt={4}>
        <AccordionItem>
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <Text fontWeight="semibold">Detailed Results (JSON)</Text>
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <HStack justify="space-between" align="center" mb={2}>
              <Text fontSize="sm" color="gray.600">Complete system test data</Text>
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

interface EnvironmentTestProps {
  environmentResults: EnvironmentCommandResult | null;
  isProcessingEnvironment: boolean;
  currentEnvironmentOperation: string;
  onClearEnvironmentResults: () => void;
}

export const EnvironmentTest: React.FC<EnvironmentTestProps> = ({
  environmentResults,
  isProcessingEnvironment,
  currentEnvironmentOperation,
  onClearEnvironmentResults
}) => {
  const [results, setResults] = useState<CombinedSystemResults | null>(null);
  const [isRunningFilesystem, setIsRunningFilesystem] = useState(false);
  const [isRunningExternalServices, setIsRunningExternalServices] = useState(false);
  const { showSuccess, showError, showInfo } = useEnhancedToast();

  // Convert environment results to combined format when they change
  useEffect(() => {
    if (environmentResults) {
      const combinedResults: CombinedSystemResults = {
        testType: 'environment',
        success: environmentResults.success,
        summary: `Command: ${environmentResults.test_suite} | Exit code: ${environmentResults.exit_code}`,
        environmentResult: environmentResults
      };
      setResults(combinedResults);
    }
  }, [environmentResults]);

  const runFilesystemTest = async () => {
    setIsRunningFilesystem(true);
    setResults(null);
    
    try {
      showInfo('Testing Filesystem', 'Checking file and directory permissions...');
      
      const response = await fetch('/api/system-tests/filesystem-permissions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Convert backend results to frontend format
      const testResults: FilesystemPermissionResult[] = data.results.map((result: any) => ({
        path: result.path,
        exists: result.exists,
        readable: result.readable,
        writable: result.writable,
        error: result.error || undefined,
        description: result.description,
        status: result.status,
        permissions: result.permissions,
        isDirectory: result.is_directory,
        isFile: result.is_file,
        sizeBytes: result.size_bytes,
        created: result.created,
        requiredPermissions: result.required_permissions
      }));
      
      const finalResults: CombinedSystemResults = {
        testType: 'filesystem',
        success: data.success,
        summary: data.summary,
        filesystemResults: testResults
      };
      
      setResults(finalResults);
      
      if (data.success) {
        showSuccess('Filesystem Tests Passed', 'All required filesystem permissions are accessible!');
      } else {
        showError('Filesystem Issues Detected', { description: 'Some filesystem permissions are restricted. Check results below.' });
      }
      
    } catch (error) {
      showError('Filesystem Test Failed', { description: `Failed to run filesystem tests: ${error}` });
      console.error('Filesystem test error:', error);
    } finally {
      setIsRunningFilesystem(false);
    }
  };

  const runExternalServicesTest = async () => {
    setIsRunningExternalServices(true);
    setResults(null);
    
    try {
      showInfo('Testing External Services', 'Checking connectivity to external services...');
      
      const response = await fetch('/api/system-tests/external-services', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      const finalResults: CombinedSystemResults = {
        testType: 'external-services',
        success: data.success,
        summary: data.summary,
        externalServicesResults: data.results
      };
      
      setResults(finalResults);
      
      if (data.success) {
        showSuccess('External Services Connected', 'All external services are accessible!');
      } else {
        showError('External Service Issues', { description: 'Some external services are not accessible. Check results below.' });
      }
      
    } catch (error) {
      showError('External Services Test Failed', { description: `Failed to test external services: ${error}` });
      console.error('External services test error:', error);
    } finally {
      setIsRunningExternalServices(false);
    }
  };

  const clearResults = () => {
    setResults(null);
    onClearEnvironmentResults();
  };

  return (
    <VStack spacing={6} align="stretch">
      <HStack spacing={2}>
        <Badge colorScheme="purple" fontSize="sm" px={2} py={1}>ENVIRONMENT</Badge>
      </HStack>

      <Text color="gray.600">
        Test system-level functionality including external service connectivity, filesystem permissions, and development environment setup. Environment reset clears browser storage and resets test states.
      </Text>

      <HStack spacing={3} flexWrap="wrap">
        <Button
          bg="blue.400"
          color="white"
          _hover={{ bg: 'orange.400' }}
          size="sm"
          onClick={() => {
            const event = new CustomEvent('resetEnvironment');
            window.dispatchEvent(event);
          }}
          isLoading={isProcessingEnvironment && currentEnvironmentOperation === 'reset'}
          loadingText="Resetting..."
          leftIcon={isProcessingEnvironment && currentEnvironmentOperation === 'reset' ? <Spinner size="sm" /> : undefined}
        >
          Reset Environment
        </Button>
        
        <Button
          bg="blue.400"
          color="white"
          _hover={{ bg: 'orange.400' }}
          size="sm"
          onClick={runExternalServicesTest}
          isLoading={isRunningExternalServices}
          loadingText="Testing..."
          leftIcon={isRunningExternalServices ? <Spinner size="sm" /> : undefined}
        >
          External Services
        </Button>
        
        <Button
          bg="blue.400"
          color="white"
          _hover={{ bg: 'orange.400' }}
          size="sm"
          onClick={runFilesystemTest}
          isLoading={isRunningFilesystem}
          loadingText="Testing..."
          leftIcon={isRunningFilesystem ? <Spinner size="sm" /> : undefined}
        >
          Test Filesystem
        </Button>
      </HStack>

      {(isRunningFilesystem || isProcessingEnvironment || isRunningExternalServices) && (
        <Alert status="info">
          <AlertIcon />
          <AlertTitle>
            {isRunningFilesystem 
              ? 'Testing filesystem permissions...' 
              : isRunningExternalServices 
                ? 'Testing external services...'
                : 'Resetting environment...'}
          </AlertTitle>
          <AlertDescription>
            {isRunningFilesystem 
              ? 'Checking file and directory access permissions.'
              : isRunningExternalServices
                ? 'Checking connectivity to Clerk authentication and CDN services.'
                : 'This may take up to 2 minutes.'}
          </AlertDescription>
        </Alert>
      )}

      {results && <CombinedSystemResultsDisplay results={results} onClear={clearResults} />}
    </VStack>
  );
};