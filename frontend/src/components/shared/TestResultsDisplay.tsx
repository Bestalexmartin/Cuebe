// frontend/src/components/shared/TestResultsDisplay.tsx

import React from 'react';
import {
  Box,
  HStack,
  VStack,
  Badge,
  Text,
  Code,
  IconButton,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useClipboard
} from '@chakra-ui/react';
import { AppIcon } from '../AppIcon';

export interface TestResult {
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

interface TestResultsDisplayProps {
  results: TestResult;
  onClear: () => void;
}

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

export const TestResultsDisplay: React.FC<TestResultsDisplayProps> = ({ results, onClear }) => {
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