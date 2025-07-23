// frontend/src/components/EnvironmentTest.tsx

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
  Code,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  IconButton,
  useClipboard,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner
} from '@chakra-ui/react';
import { AppIcon } from './AppIcon';

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

interface EnvironmentTestProps {
  environmentResults: TestResult | null;
  isProcessingEnvironment: boolean;
  currentEnvironmentOperation: string;
}

const CommandResultsDisplay: React.FC<{ results: TestResult }> = ({ results }) => {
  const { onCopy: copyStdout, hasCopied: hasCopiedStdout } = useClipboard(results.stdout || '');
  const { onCopy: copyStderr, hasCopied: hasCopiedStderr } = useClipboard(results.stderr || '');

  return (
    <Box mt={4} p={4} border="1px solid" borderColor="gray.300" borderRadius="md">
      <HStack justify="space-between" mb={3}>
        <Heading size="sm">Command Results: {results.test_suite}</Heading>
        <Badge colorScheme={results.success ? "green" : "red"}>
          {results.success ? "SUCCESS" : "FAILED"}
        </Badge>
      </HStack>

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

export const EnvironmentTest: React.FC<EnvironmentTestProps> = ({
  environmentResults,
  isProcessingEnvironment,
  currentEnvironmentOperation
}) => {

  return (
    <VStack spacing={6} align="stretch">
      <HStack spacing={2}>
        <Badge colorScheme="green" fontSize="sm" px={2} py={1}>ENVIRONMENT</Badge>
      </HStack>

      <Text color="gray.600">
        Comprehensive system reset and test result management. Reset clears browser storage (except auth) and reinstalls dependencies.
      </Text>

      <Box>
        <VStack spacing={3} align="stretch">
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
              onClick={() => {
                const event = new CustomEvent('clearTestResults');
                window.dispatchEvent(event);
              }}
              isLoading={isProcessingEnvironment && currentEnvironmentOperation === 'clear'}
              loadingText="Clearing..."
              leftIcon={isProcessingEnvironment && currentEnvironmentOperation === 'clear' ? <Spinner size="sm" /> : undefined}
            >
              Clear Test Results
            </Button>
          </HStack>
        </VStack>

      </Box>

      {isProcessingEnvironment && (
        <Alert status="info">
          <AlertIcon />
          <AlertTitle>
            {currentEnvironmentOperation === 'reset' ? 'Resetting environment...' : 'Clearing test results...'}
          </AlertTitle>
          <AlertDescription>
            {currentEnvironmentOperation === 'reset'
              ? 'This may take up to 2 minutes.'
              : 'This will only take a moment.'}
          </AlertDescription>
        </Alert>
      )}

      {environmentResults && <CommandResultsDisplay results={environmentResults} />}
    </VStack>
  );
};