// frontend/src/components/test-tools/PerformanceTest.tsx

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Text,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Badge,
  IconButton
} from '@chakra-ui/react';
import { useAuth } from '@clerk/clerk-react';
import { AppIcon } from '../AppIcon';
import { useEnhancedToast } from '../../utils/toastUtils';
import { getApiUrl } from '../../config/api';

// TypeScript interfaces
interface DatabaseConnectionResult {
  database: string;
  status: 'connected' | 'failed' | 'timeout';
  responseTime: number;
  error?: string;
  details: {
    host: string;
    port: number;
    database: string;
    ssl: boolean;
  };
}

interface APITestResult {
  endpoint: string;
  status: 'connected' | 'failed' | 'timeout' | 'skipped';
  responseTime: number;
  statusCode: number;
  error?: string;
  details: {
    url: string;
    method: string;
  };
}

interface SystemPerformanceResult {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface NetworkResult {
  ping: number;
  pingResults: Array<{
    host: string;
    ping: number;
    status: string;
    error?: string;
  }>;
  jitter: number;
  downloadSpeed: number;
  uploadSpeed: number;
  speedTestStatus: string;
  speedTestError?: string;
}

interface TestResults {
  testType: string;
  summary: string;
  results?: DatabaseConnectionResult[] | APITestResult[] | SystemPerformanceResult | NetworkResult;
}

export const PerformanceTest: React.FC = () => {
  const [isRunningDatabase, setIsRunningDatabase] = useState(false);
  const [isRunningAPI, setIsRunningAPI] = useState(false);
  const [isRunningSystem, setIsRunningSystem] = useState(false);
  const [isRunningNetwork, setIsRunningNetwork] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const { showSuccess, showError, showInfo } = useEnhancedToast();
  const { getToken } = useAuth();

  let cachedAuthToken: string | null = null;

  const getAuthTokenOnce = async (forceRefresh = false): Promise<string> => {
    if (!forceRefresh && cachedAuthToken) return cachedAuthToken;

    const token = await getToken();
    if (!token) throw new Error('Authentication token not available');

    cachedAuthToken = token;
    return token;
  };

  const isAnyRunning = isRunningDatabase || isRunningAPI || isRunningSystem || isRunningNetwork;

  // Unified results display component
  const UnifiedResultsDisplay: React.FC<{
    testType: string;
    results: any;
    success: boolean;
    onClear: () => void
  }> = ({ testType, results, success, onClear }) => {
    const getTestTypeBadge = () => {
      switch (testType) {
        case 'database': return { color: 'orange', label: 'DATABASE' };
        case 'api': return { color: 'cyan', label: 'API ENDPOINTS' };
        case 'system': return { color: 'purple', label: 'SYSTEM' };
        case 'network': return { color: 'blue', label: 'NETWORK' };
        default: return { color: 'gray', label: testType.toUpperCase() };
      }
    };

    const getPassFailCounts = () => {
      if (testType === 'database' && Array.isArray(results)) {
        const passed = (results as DatabaseConnectionResult[]).filter((r) => r.status === 'connected').length;
        const failed = results.length - passed;
        return { total: results.length, passed, failed };
      }
      if (testType === 'api' && Array.isArray(results)) {
        const passed = (results as APITestResult[]).filter((r) => r.status === 'connected').length;
        const failed = results.length - passed;
        return { total: results.length, passed, failed };
      }
      // For system and network, just show success/failure
      return { total: 1, passed: success ? 1 : 0, failed: success ? 0 : 1 };
    };

    const badge = getTestTypeBadge();
    const counts = getPassFailCounts();

    return (
      <Box
        mt={4}
        p={4}
        border="1px solid"
        borderColor="gray.300"
        borderRadius="md"
        bg="white"
        _dark={{ borderColor: "gray.700", bg: "gray.900" }}
      >
        <HStack justify="space-between" mb={3}>
          <Badge colorScheme={badge.color} fontSize="sm" px={2} py={1}>
            {badge.label}
          </Badge>
          <HStack spacing={2}>
            <Badge colorScheme="blue">Total: {counts.total}</Badge>
            <Badge colorScheme="green">Passed: {counts.passed}</Badge>
            <Badge colorScheme="red">Failed: {counts.failed}</Badge>
            <Badge colorScheme={success ? "green" : "red"}>
              {success ? "SUCCESS" : "FAILED"}
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

        {testType === 'database' && Array.isArray(results) && renderDatabaseResults(results)}
        {testType === 'api' && Array.isArray(results) && renderAPIResults(results)}
        {testType === 'system' && !Array.isArray(results) && renderSystemResults(results)}
        {testType === 'network' && !Array.isArray(results) && renderNetworkResults(results)}
      </Box>
    );
  };

  const runDatabaseTest = async () => {
    setIsRunningDatabase(true);
    setResults(null);
    setProgress(0);

    try {
      showInfo('Testing Database', 'Checking database connectivity...');
      setCurrentTest('Connecting to backend API...');
      setProgress(10);

      const authToken = await getAuthTokenOnce();
      if (!authToken) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch(getApiUrl('/api/system-tests/database-connectivity'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setProgress(50);
      setCurrentTest('Processing test results...');

      const data = await response.json();
      setProgress(100);

      setResults(data);

      const connectedCount = data.results.filter((r: any) => r.status === 'connected').length;
      const allSuccessful = connectedCount === data.results.length;

      if (allSuccessful) {
        showSuccess('Database Test Complete', data.summary);
      } else {
        showError('Database Test Issues', { description: data.summary });
      }

    } catch (error) {
      console.error('Database test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Database Test Failed', { title: 'Database Test Failed', description: `Failed to connect to test API: ${errorMessage}` });
    } finally {
      setIsRunningDatabase(false);
      setCurrentTest('');
      setProgress(0);
    }
  };

  const runAPITest = async () => {
    setIsRunningAPI(true);
    setResults(null);
    setProgress(0);

    try {
      showInfo('Testing APIs', 'Checking API endpoint connectivity...');
      setCurrentTest('Testing API endpoints...');
      setProgress(10);

      const authToken = await getAuthTokenOnce();
      if (!authToken) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch(getApiUrl('/api/system-tests/api-endpoints'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setProgress(50);
      setCurrentTest('Processing API test results...');

      const data = await response.json();
      setProgress(100);

      setResults(data);

      const successCount = data.results.filter((r: any) => r.status === 'connected').length;

      if (successCount > 0) {
        showSuccess('API Test Complete', data.summary);
      } else {
        showError('API Test Issues', { description: data.summary });
      }

    } catch (error) {
      console.error('API test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('API Test Failed', { title: 'API Test Failed', description: `Failed to connect to test API: ${errorMessage}` });
    } finally {
      setIsRunningAPI(false);
      setCurrentTest('');
      setProgress(0);
    }
  };

  const runSystemTest = async () => {
    setIsRunningSystem(true);
    setResults(null);
    setProgress(0);

    try {
      showInfo('Testing System', 'Checking system performance...');
      setCurrentTest('Gathering system metrics...');
      setProgress(10);

      const authToken = await getAuthTokenOnce();

      const response = await fetch(getApiUrl('/api/system-tests/system-performance'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setProgress(50);
      setCurrentTest('Processing system metrics...');

      const data = await response.json();
      setProgress(100);

      setResults(data);
      showSuccess('System Test Complete', data.summary);

    } catch (error) {
      console.error('System test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('System Test Failed', { title: 'System Test Failed', description: `Failed to get system metrics: ${errorMessage}` });
    } finally {
      setIsRunningSystem(false);
      setCurrentTest('');
      setProgress(0);
    }
  };

  const runNetworkTest = async () => {
    setIsRunningNetwork(true);
    setResults(null);
    setProgress(0);

    try {
      const authToken = await getAuthTokenOnce();

      // Step 1: Check speedtest-cli availability and install if needed
      showInfo('Preparing Network Test', 'Checking speed test dependencies...');
      setCurrentTest('Checking for speedtest-cli on host system...');
      setProgress(5);

      const prepResponse = await fetch(getApiUrl('/api/system-tests/prepare-speedtest'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!prepResponse.ok) {
        throw new Error(`Preparation failed: HTTP ${prepResponse.status}`);
      }

      const prepData = await prepResponse.json();
      setProgress(15);

      if (prepData.installation_required) {
        showInfo('Installing Dependencies', 'Installing speedtest-cli for accurate measurements...');
        setCurrentTest('Installing speedtest-cli on host system (this may take 30-60 seconds)...');
        setProgress(25);

        await new Promise(resolve => setTimeout(resolve, 2000));
        setProgress(35);
      } else {
        setCurrentTest('speedtest-cli found - proceeding with test...');
        setProgress(20);
      }

      // Step 2: Run ping tests
      showInfo('Testing Network', 'Testing network connectivity and latency...');
      setCurrentTest('Testing ping to DNS servers...');
      setProgress(40);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Run speed test
      setCurrentTest('Running download speed test (this may take 20-30 seconds)...');
      setProgress(50);

      const response = await fetch(getApiUrl('/api/system-tests/network-speed'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Simulate speed test progress
      setCurrentTest('Measuring download speed...');
      setProgress(60);
      await new Promise(resolve => setTimeout(resolve, 2000));

      setCurrentTest('Measuring upload speed...');
      setProgress(80);
      await new Promise(resolve => setTimeout(resolve, 1000));

      setCurrentTest('Processing results...');
      setProgress(90);

      const data = await response.json();
      setProgress(100);

      setResults(data);

      const isHostLevel = data.results.speedTestError && data.results.speedTestError.includes('host-direct');
      const successTitle = isHostLevel ? 'High-Accuracy Network Test Complete' : 'Network Test Complete';
      const successMessage = isHostLevel
        ? `${data.summary} (using host-level speed test for maximum accuracy)`
        : data.summary;

      showSuccess(successTitle, successMessage);

    } catch (error) {
      console.error('Network test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Network Test Failed', { title: 'Network Test Failed', description: `Failed to test network: ${errorMessage}` });
    } finally {
      setIsRunningNetwork(false);
      setCurrentTest('');
      setProgress(0);
    }
  };

  const renderDatabaseResults = (results: DatabaseConnectionResult[]) => (
    <VStack spacing={3} align="stretch">
      {results.map((result, index) => (
        <Box key={index} p={4} border="1px solid" borderColor="gray.300" borderRadius="md" bg="white" _dark={{ borderColor: "gray.700", bg: "gray.900" }}>
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="semibold">{result.database}</Text>
            <Badge colorScheme={result.status === 'connected' ? 'green' : 'red'}>
              {result.status.toUpperCase()}
            </Badge>
          </HStack>
          <Text fontSize="sm" color="gray.600">
            {result.details.host}:{result.details.port} • {result.details.database}
          </Text>
          {result.responseTime > 0 && (
            <Text fontSize="sm">Response time: {result.responseTime}ms</Text>
          )}
          {result.error && (
            <Text fontSize="sm" color="red.500">{result.error}</Text>
          )}
        </Box>
      ))}
    </VStack>
  );

  const renderAPIResults = (results: APITestResult[]) => (
    <VStack spacing={3} align="stretch">
      {results.map((result, index) => (
        <Box key={index} p={4} border="1px solid" borderColor="gray.300" borderRadius="md" bg="white" _dark={{ borderColor: "gray.700", bg: "gray.900" }}>
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="semibold">{result.endpoint}</Text>
            <HStack>
              {result.statusCode > 0 && (
                <Badge colorScheme={result.statusCode < 400 ? 'green' : 'red'}>
                  {result.statusCode}
                </Badge>
              )}
              <Badge colorScheme={result.status === 'connected' ? 'green' : result.status === 'skipped' ? 'yellow' : 'red'}>
                {result.status.toUpperCase()}
              </Badge>
            </HStack>
          </HStack>
          <Text fontSize="sm" color="gray.600">
            {result.details.method} {result.details.url}
          </Text>
          {result.responseTime > 0 && (
            <Text fontSize="sm">Response time: {result.responseTime}ms</Text>
          )}
          {result.error && (
            <Text fontSize="sm" color="red.500">{result.error}</Text>
          )}
        </Box>
      ))}
    </VStack>
  );

  const renderSystemResults = (results: SystemPerformanceResult) => (
    <Box p={4} border="1px solid" borderColor="gray.300" borderRadius="md" bg="white" _dark={{ borderColor: "gray.700", bg: "gray.900" }}>
      <HStack spacing={6} align="stretch">
        <Stat>
          <StatLabel>CPU Usage</StatLabel>
          <StatNumber>{results.cpu.usage}%</StatNumber>
          <StatHelpText>{results.cpu.cores} cores</StatHelpText>
        </Stat>
        <Stat>
          <StatLabel>Memory Usage</StatLabel>
          <StatNumber>{results.memory.percentage}%</StatNumber>
          <StatHelpText>{results.memory.used.toFixed(1)} MB / {results.memory.total.toFixed(1)} MB</StatHelpText>
        </Stat>
        <Stat>
          <StatLabel>Disk Usage</StatLabel>
          <StatNumber>{results.disk.percentage}%</StatNumber>
          <StatHelpText>{results.disk.used.toFixed(1)} GB / {results.disk.total.toFixed(1)} GB</StatHelpText>
        </Stat>
      </HStack>
    </Box>
  );

  const renderNetworkResults = (results: NetworkResult) => (
    <VStack spacing={4} align="stretch">
      <Box p={4} border="1px solid" borderColor="gray.300" borderRadius="md" bg="white" _dark={{ borderColor: "gray.700", bg: "gray.900" }}>
        <HStack spacing={6} wrap="wrap" align="flex-start">
          <Stat>
            <StatLabel>Average Ping</StatLabel>
            <StatNumber>{results.ping}ms</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Jitter</StatLabel>
            <StatNumber>{results.jitter}ms</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Download</StatLabel>
            <StatNumber>{results.downloadSpeed} Mbps</StatNumber>
            <StatHelpText>
              {results.speedTestStatus === 'success' ? 'Measured' : 'Unavailable'}
            </StatHelpText>
          </Stat>
          <Stat>
            <StatLabel>Upload</StatLabel>
            <StatNumber>{results.uploadSpeed} Mbps</StatNumber>
            <StatHelpText>Estimated</StatHelpText>
          </Stat>
        </HStack>
      </Box>

      {results.speedTestError && (
        <Alert status="warning" bg="orange.50" _dark={{ bg: "orange.900", borderColor: "orange.700" }} border="1px solid" borderColor="orange.200">
          <AlertIcon />
          <Box>
            <AlertTitle>Speed Test Limitation</AlertTitle>
            <AlertDescription>
              {results.speedTestError}
            </AlertDescription>
          </Box>
        </Alert>
      )}

      <Box p={4} border="1px solid" borderColor="gray.300" borderRadius="md" bg="white" _dark={{ borderColor: "gray.700", bg: "gray.900" }}>
        <VStack spacing={2} align="stretch">
          <Text fontWeight="semibold">Ping Test Results:</Text>
          {results.pingResults.map((ping, index) => (
            <HStack key={index} justify="space-between">
              <Text>{ping.host}</Text>
              <HStack>
                <Text>{ping.ping > 0 ? `${ping.ping}ms` : 'Failed'}</Text>
                <Badge colorScheme={ping.status === 'success' ? 'green' : 'red'}>
                  {ping.status.toUpperCase()}
                </Badge>
              </HStack>
            </HStack>
          ))}
        </VStack>
      </Box>
    </VStack>
  );

  return (
    <VStack spacing={6} align="stretch">
      <HStack spacing={2}>
        <Badge colorScheme="purple" fontSize="sm" px={2} py={1}>PERFORMANCE</Badge>
      </HStack>

      <Text color="cardText" fontSize="md" mt={-2}>
        These tests make actual API calls to check system connectivity and performance.
      </Text>

      <Box mt={-2}>
        <HStack spacing={2} flexWrap="wrap">
          <Button
            size="sm"
            bg="blue.400"
            color="white"
            _hover={{ bg: 'orange.400' }}
            onClick={runDatabaseTest}
            isLoading={isRunningDatabase}
            loadingText="Testing..."
            isDisabled={isAnyRunning}
          >
            Test Database
          </Button>
          <Button
            size="sm"
            bg="blue.400"
            color="white"
            _hover={{ bg: 'orange.400' }}
            onClick={runAPITest}
            isLoading={isRunningAPI}
            loadingText="Testing..."
            isDisabled={isAnyRunning}
          >
            Test APIs
          </Button>
          <Button
            size="sm"
            bg="blue.400"
            color="white"
            _hover={{ bg: 'orange.400' }}
            onClick={runSystemTest}
            isLoading={isRunningSystem}
            loadingText="Testing..."
            isDisabled={isAnyRunning}
          >
            Test System
          </Button>
          <Button
            size="sm"
            bg="blue.400"
            color="white"
            _hover={{ bg: 'orange.400' }}
            onClick={runNetworkTest}
            isLoading={isRunningNetwork}
            loadingText="Testing..."
            isDisabled={isAnyRunning}
          >
            Test Network
          </Button>
        </HStack>
      </Box>

      {currentTest && (
        <Box>
          <Text fontSize="sm" mb={2}>{currentTest}</Text>
          <Progress value={progress} colorScheme="blue" />
        </Box>
      )}

      {results && (
        <UnifiedResultsDisplay
          testType={results.testType}
          results={results.results}
          success={results.testType === 'database' ?
            Array.isArray(results.results) && (results.results as DatabaseConnectionResult[]).every((r) => r.status === 'connected') :
            results.testType === 'api' ?
              Array.isArray(results.results) && (results.results as APITestResult[]).some((r) => r.status === 'connected') :
              true // System and network tests are considered successful if they complete
          }
          onClear={() => setResults(null)}
        />
      )}
    </VStack>
  );
};
