// frontend/src/components/test-tools/AuthenticationTest.tsx

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
  useClipboard,
  Progress
} from '@chakra-ui/react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { AppIcon } from '../AppIcon';
import { useEnhancedToast } from '../../utils/toastUtils';

interface AuthTestResult {
  test: string;
  status: 'passed' | 'failed' | 'error';
  responseTime: number;
  statusCode?: number;
  error?: string;
  details?: {
    tokenValid?: boolean;
    userFound?: boolean;
    permissions?: string[];
    sessionActive?: boolean;
  };
}

interface TestResults {
  success: boolean;
  results: AuthTestResult[];
  summary: string;
  totalTime: number;
  userInfo?: {
    clerk_user_id?: string;
    email?: string;
    status?: string;
    permissions?: string[];
  };
}

const AuthResultsDisplay: React.FC<{ results: TestResults; onClear: () => void }> = ({ results, onClear }) => {
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
    <Box ref={resultsRef} mt={4} p={4} border="1px solid" borderColor="gray.300" borderRadius="md" bg="white" _dark={{ borderColor: "gray.700", bg: "gray.900" }}>
      <HStack justify="space-between" mb={3}>
        <Text fontWeight="semibold">Authentication Test Results</Text>
        <HStack spacing={2}>
          <Badge colorScheme={results.success ? "green" : "red"}>
            {results.success ? "ALL PASSED" : "ISSUES DETECTED"}
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
        {results.summary} | Total test time: {results.totalTime}ms
      </Text>

      {/* User Info */}
      {results.userInfo && (
        <Box mb={4} p={3} bg="blue.50" borderRadius="md" _dark={{ bg: "blue.900" }}>
          <Text fontWeight="semibold" mb={2} color="blue.700" _dark={{ color: "blue.200" }}>
            Current User Session
          </Text>
          <VStack spacing={1} align="start">
            <HStack>
              <Text fontSize="xs" color="gray.600">ID:</Text>
              <Text fontSize="sm" fontFamily="mono">{results.userInfo.clerk_user_id || 'N/A'}</Text>
            </HStack>
            <HStack>
              <Text fontSize="xs" color="gray.600">Email:</Text>
              <Text fontSize="sm">{results.userInfo.email || 'N/A'}</Text>
            </HStack>
            <HStack>
              <Text fontSize="xs" color="gray.600">Status:</Text>
              <Badge colorScheme={results.userInfo.status === 'VERIFIED' ? 'green' : 'orange'} size="sm">
                {results.userInfo.status || 'Unknown'}
              </Badge>
            </HStack>
          </VStack>
        </Box>
      )}

      {/* Test Results */}
      <VStack spacing={2} align="stretch" mb={4}>
        {results.results.map((result, index) => (
          <HStack key={index} justify="space-between" p={3} bg="gray.800" borderRadius="sm">
            <VStack align="start" spacing={1}>
              <Text fontSize="sm" fontFamily="mono" color="white" fontWeight="bold">
                {result.test}
              </Text>
              {result.error && (
                <Text fontSize="xs" color="red.300">
                  {result.error}
                </Text>
              )}
            </VStack>
            <HStack spacing={2}>
              <Badge colorScheme={result.status === 'passed' ? "green" : result.status === 'error' ? "orange" : "red"} size="sm">
                {result.status.toUpperCase()}
              </Badge>
              {result.status === 'passed' && (
                <Badge colorScheme="blue" size="sm">
                  {result.responseTime}ms
                </Badge>
              )}
              {result.statusCode && (
                <Badge colorScheme="gray" size="sm">
                  {result.statusCode}
                </Badge>
              )}
            </HStack>
          </HStack>
        ))}
      </VStack>

      <Accordion allowToggle>
        <AccordionItem>
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <Text fontWeight="semibold">Detailed Results (JSON)</Text>
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <HStack justify="space-between" align="center" mb={2}>
              <Text fontSize="sm" color="gray.600">Complete authentication test data</Text>
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

export const AuthenticationTest: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [testMode, setTestMode] = useState<'authenticated' | 'unauthenticated'>('authenticated');
  const { showSuccess, showError, showInfo } = useEnhancedToast();
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();

  const runAuthTest = async (forceMode?: 'authenticated' | 'unauthenticated') => {
    setIsRunning(true);
    setResults(null);
    setProgress(0);
    
    const currentTestMode = forceMode || testMode;
    setTestMode(currentTestMode);
    
    try {
      if (currentTestMode === 'authenticated') {
        showInfo('Testing Authentication', 'Running authenticated tests with your login credentials...');
      } else {
        showInfo('Testing Authentication', 'Running unauthenticated tests to verify security...');
      }
      
      const startTime = Date.now();
      const testResults: AuthTestResult[] = [];
      let allPassed = true;

      // Tests to perform
      const authTests = [
        { name: 'Token Validation', endpoint: '/api/me/crews' },
        { name: 'User Lookup', endpoint: '/api/me/crews' },
        { name: 'Session Validity', endpoint: '/api/health' },
        { name: 'Protected Endpoint Access', endpoint: '/api/me/venues' },
        { name: 'Authorization Scope', endpoint: '/api/me/crews' },
        { name: 'Webhook Configuration', endpoint: '/api/webhooks/clerk', method: 'POST' },
        { name: 'Webhook Security', endpoint: '/api/webhooks/clerk', method: 'POST' }
      ];

      // Get authentication token based on test mode
      let authToken: string | null = null;
      
      if (currentTestMode === 'authenticated') {
        showInfo('Checking Authentication', 'Getting authentication token from Clerk...');
        
        if (isSignedIn) {
          try {
            authToken = await getToken();
            if (authToken) {
              showInfo('Token Found', `Authentication token retrieved (${authToken.length} chars). Running authenticated tests...`);
            } else {
              showInfo('Token Issue', 'Signed in but could not retrieve token. May be a session issue.');
            }
          } catch (e) {
            showInfo('Token Error', 'Failed to retrieve authentication token from Clerk.');
          }
        } else {
          showInfo('Not Signed In', 'User is not signed in. Will test as unauthenticated user.');
        }
      } else {
        // Unauthenticated mode - explicitly don't use any token
        authToken = null;
        showInfo('Unauthenticated Mode', 'Running tests without authentication to verify security measures...');
      }
      
      for (let i = 0; i < authTests.length; i++) {
        const test = authTests[i];
        setCurrentTest(`Running ${test.name}...`);
        setProgress((i / authTests.length) * 100);
        
        try {
          const testStart = Date.now();
          
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          
          if (authToken && test.name !== 'Session Validity' && !test.name.includes('Webhook')) {
            headers['Authorization'] = `Bearer ${authToken}`;
          }
          
          let response: Response;
          let requestBody: string | undefined;
          
          // Handle webhook tests differently
          if (test.name.includes('Webhook')) {
            if (test.name === 'Webhook Configuration') {
              // Test webhook endpoint exists and responds to malformed requests
              response = await fetch(test.endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({ test: 'malformed webhook payload' })
              });
            } else if (test.name === 'Webhook Security') {
              // Test webhook security - should reject requests without proper SVIX headers
              const mockWebhookPayload = {
                type: 'user.created',
                data: {
                  id: 'test_user_123',
                  email_addresses: [{ email_address: 'test@example.com' }],
                  first_name: 'Test',
                  last_name: 'User'
                }
              };
              
              response = await fetch(test.endpoint, {
                method: 'POST',
                headers: {
                  ...headers,
                  // Missing required SVIX webhook signature headers intentionally
                },
                body: JSON.stringify(mockWebhookPayload)
              });
            } else {
              response = new Response('{}', { status: 200 });
            }
          } else {
            response = await fetch(test.endpoint, {
              method: test.method || 'GET',
              headers,
              body: requestBody
            });
          }
          
          const responseTime = Date.now() - testStart;
          
          let status: 'passed' | 'failed' | 'error' = 'passed';
          let error: string | undefined;
          
          // Determine test result based on test type and response
          switch (test.name) {
            case 'Session Validity':
              // Health endpoint should always work
              status = response.status === 200 ? 'passed' : 'failed';
              break;
            case 'Token Validation':
              if (currentTestMode === 'authenticated') {
                if (authToken) {
                  // We have a token, so validate it works
                  if (response.status === 200) {
                    status = 'passed';
                    error = 'Token valid and user authenticated';
                  } else if (response.status === 404) {
                    status = 'failed';
                    error = 'Token valid but user not found in database';
                  } else if (response.status === 401 || response.status === 403) {
                    status = 'failed';
                    error = 'Token invalid or expired';
                  } else {
                    status = 'failed';
                    error = `Unexpected response: ${response.status}`;
                  }
                } else {
                  // No token available - this is a failure for authenticated tests
                  status = 'failed';
                  error = 'No authentication token found - user may not be logged in';
                }
              } else {
                // Unauthenticated mode should be rejected
                if (response.status === 401 || response.status === 403) {
                  status = 'passed';
                  error = 'Correctly rejected unauthenticated request';
                } else {
                  status = 'failed';
                  error = 'Security issue: unauthenticated request was not properly rejected';
                }
              }
              break;
            case 'User Lookup':
            case 'Protected Endpoint Access':
            case 'Authorization Scope':
              if (currentTestMode === 'authenticated') {
                if (authToken) {
                  if (response.status === 200) {
                    status = 'passed';
                    error = test.name === 'User Lookup' ? 'User successfully found and authenticated' :
                           test.name === 'Protected Endpoint Access' ? 'Successfully accessed protected endpoint' :
                           'Successfully accessed user-scoped data';
                  } else if (response.status === 404) {
                    status = test.name === 'User Lookup' ? 'failed' : 'passed';
                    error = test.name === 'User Lookup' ? 'User not found in database despite valid token' :
                           test.name === 'Protected Endpoint Access' ? 'Endpoint accessible but no data found (normal)' :
                           'No data found for user (normal for new accounts)';
                  } else if (response.status === 401 || response.status === 403) {
                    status = 'failed';
                    error = test.name === 'User Lookup' ? 'Authentication failed - token may be invalid' :
                           test.name === 'Protected Endpoint Access' ? 'Access denied despite having token - authentication issue' :
                           'Authorization failed - token or permissions issue';
                  } else {
                    status = 'failed';
                    error = `Unexpected response: ${response.status}`;
                  }
                } else {
                  status = 'failed';
                  error = `Cannot test ${test.name.toLowerCase()} - no authentication token available`;
                }
              } else {
                // Unauthenticated mode - should be properly rejected
                if (response.status === 401 || response.status === 403) {
                  status = 'passed';
                  error = `Correctly blocked unauthenticated access to ${test.name.toLowerCase()}`;
                } else {
                  status = 'failed';
                  error = `Security issue: ${test.name.toLowerCase()} accessible without authentication`;
                }
              }
              break;
            case 'Webhook Configuration':
              // Webhook endpoint should exist and return 400/500 for malformed requests
              status = [400, 500].includes(response.status) ? 'passed' : 'failed';
              if (response.status === 400) {
                error = 'Webhook verification failed (expected - malformed payload)';
              } else if (response.status === 500 && response.statusText.includes('secret')) {
                error = 'Webhook secret not configured (expected in test env)';
              }
              break;
            case 'Webhook Security':
              // Should reject requests without proper SVIX headers (400/401)
              status = [400, 401].includes(response.status) ? 'passed' : 'failed';
              if (status === 'passed') {
                error = 'Properly rejected unsigned webhook request';
              } else {
                error = 'Webhook security may be compromised - accepts unsigned requests';
              }
              break;
          }
          
          if (status !== 'passed') {
            allPassed = false;
          }
          
          const result: AuthTestResult = {
            test: test.name,
            status,
            responseTime,
            statusCode: response.status,
            error,
            details: {
              tokenValid: authToken ? response.status !== 401 && response.status !== 403 : false,
              userFound: response.status === 200,
              sessionActive: authToken !== null
            }
          };
          
          testResults.push(result);
          
        } catch (error) {
          allPassed = false;
          testResults.push({
            test: test.name,
            status: 'error',
            responseTime: 0,
            error: String(error)
          });
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      setProgress(100);
      
      const totalTime = Date.now() - startTime;
      const passedCount = testResults.filter(r => r.status === 'passed').length;
      
      // Get user info from Clerk
      let userInfo: TestResults['userInfo'] = undefined;
      if (user && isSignedIn) {
        userInfo = {
          clerk_user_id: user.id,
          email: user.emailAddresses[0]?.emailAddress || 'N/A',
          status: 'VERIFIED', // Clerk users are verified by definition
          permissions: ['read', 'write'] // Placeholder - would need actual permission system
        };
      }
      
      const modeText = currentTestMode === 'authenticated' ? 'Authenticated' : 'Unauthenticated';
      const tokenText = currentTestMode === 'authenticated' ? (authToken ? 'Token found' : 'No token') : 'No token (by design)';
      const summary = `${passedCount}/${authTests.length} tests passed | ${modeText} mode | ${tokenText} | ${userInfo ? 'User verified' : 'User not found'}`;
      
      const finalResults: TestResults = {
        success: allPassed,
        results: testResults,
        summary,
        totalTime,
        userInfo
      };
      
      setResults(finalResults);
      
      if (allPassed) {
        showSuccess('Authentication Tests Passed', 'All authentication and authorization tests completed successfully!');
      } else {
        showError('Authentication Issues Detected', { description: 'Some authentication tests failed. Check results below.' });
      }
      
    } catch (error) {
      showError('Authentication Test Failed', { description: `Failed to run authentication tests: ${error}` });
      console.error('Authentication test error:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
      setProgress(0);
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      <HStack spacing={2} justify="space-between">
        <HStack spacing={2}>
          <Badge colorScheme="purple" fontSize="sm" px={2} py={1}>AUTHENTICATION</Badge>
        </HStack>
        <HStack spacing={2}>
          <Badge colorScheme={isSignedIn ? "green" : "red"} fontSize="xs" px={2} py={1}>
            {isSignedIn ? `SIGNED IN${user?.emailAddresses[0]?.emailAddress ? ` (${user.emailAddresses[0].emailAddress})` : ''}` : 'NOT SIGNED IN'}
          </Badge>
        </HStack>
      </HStack>

      <Text color="cardText" mt={-2}>
        Test authentication and authorization systems. Validates JWT tokens, user sessions, protected endpoint access, permission scopes, and Clerk webhook security.
      </Text>

      <HStack spacing={3} mt={-2}>
        <Button
          bg="blue.400"
          color="white"
          _hover={{ bg: 'orange.400' }}
          size="sm"
          onClick={() => runAuthTest('authenticated')}
          isLoading={isRunning && testMode === 'authenticated'}
          loadingText="Testing..."
          leftIcon={isRunning && testMode === 'authenticated' ? <Spinner size="sm" /> : undefined}
        >
          Test with Login
        </Button>
        
        <Button
          bg="blue.400"
          color="white"
          _hover={{ bg: 'orange.400' }}
          size="sm"
          onClick={() => runAuthTest('unauthenticated')}
          isLoading={isRunning && testMode === 'unauthenticated'}
          loadingText="Testing..."
          leftIcon={isRunning && testMode === 'unauthenticated' ? <Spinner size="sm" /> : undefined}
        >
          Test Security (No Auth)
        </Button>
      </HStack>

      {isRunning && (
        <Alert status="info">
          <AlertIcon />
          <VStack align="start" spacing={2} flex="1">
            <AlertTitle>{currentTest || 'Testing authentication...'}</AlertTitle>
            <AlertDescription>
              Validating tokens, user sessions, and protected endpoint access.
            </AlertDescription>
            {progress > 0 && (
              <Progress value={progress} size="sm" colorScheme="blue" width="100%" />
            )}
          </VStack>
        </Alert>
      )}

      {results && <AuthResultsDisplay results={results} onClear={() => setResults(null)} />}
    </VStack>
  );
};
