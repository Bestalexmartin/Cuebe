// frontend/src/pages/TestToolsPage.tsx

import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ToastTest } from '../components/test-tools/ToastTest';
import { FormValidationTest } from '../components/test-tools/FormValidationTest';
import { ErrorBoundaryTest } from '../components/test-tools/ErrorBoundaryTest';
import { ApiTest } from '../components/test-tools/ApiTest';
import { AuthenticationTest } from '../components/test-tools/AuthenticationTest';
import { PerformanceTest } from '../components/test-tools/PerformanceTest';
import { EnvironmentTest } from '../components/test-tools/EnvironmentTest';
import { PytestTest } from '../components/test-tools/PytestTest';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { BaseUtilityPage } from '../components/base/BaseUtilityPage';
import { useEnhancedToast } from '../utils/toastUtils';
import { TestResultsDisplay, TestResult } from '../components/shared/TestResultsDisplay';
import { TestCardWrapper } from '../components/shared/TestCardWrapper';
import { getApiUrl } from '../config/api';


interface TestToolsPageProps {
  isMenuOpen: boolean;
  onMenuClose: () => void;
}

export const TestToolsPage: React.FC<TestToolsPageProps> = ({ isMenuOpen, onMenuClose }) => {
  const { showSuccess, showError, showInfo } = useEnhancedToast();
  const { getToken } = useAuth();

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

      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }
      
      const response = await fetch(getApiUrl(`/api/dev/run-tests?test_suite=${testSuite}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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


  // No default content needed since we always have a test selected

  // Render individual test component with card wrapper
  const renderTestComponent = () => {
    switch (selectedTest) {
      case 'performance':
        return <TestCardWrapper><PerformanceTest /></TestCardWrapper>;
      case 'environment':
        return (
          <TestCardWrapper>
            <EnvironmentTest
              environmentResults={environmentResults}
              isProcessingEnvironment={isProcessingEnvironment}
              currentEnvironmentOperation={currentEnvironmentOperation}
              onClearEnvironmentResults={() => setEnvironmentResults(null)}
            />
          </TestCardWrapper>
        );
      case 'api':
        return (
          <TestCardWrapper>
            <ApiTest
              testResults={testResults}
              isRunningTests={isRunningTests}
              currentTestSuite={currentTestSuite}
              onRunTestSuite={runTestSuite}
              TestResultsDisplay={TestResultsDisplay}
              onClearTestResults={() => setTestResults(null)}
            />
          </TestCardWrapper>
        );
      case 'authentication':
        return <TestCardWrapper><AuthenticationTest /></TestCardWrapper>;
      case 'pytest':
        return <TestCardWrapper><PytestTest /></TestCardWrapper>;
      case 'error-boundary':
        return <TestCardWrapper><ErrorBoundaryTest /></TestCardWrapper>;
      case 'toast':
        return <TestCardWrapper><ToastTest /></TestCardWrapper>;
      case 'form-validation':
        return <TestCardWrapper><FormValidationTest /></TestCardWrapper>;
      default:
        return (
          <TestCardWrapper>
            <EnvironmentTest
              environmentResults={environmentResults}
              isProcessingEnvironment={isProcessingEnvironment}
              currentEnvironmentOperation={currentEnvironmentOperation}
              onClearEnvironmentResults={() => setEnvironmentResults(null)}
            />
          </TestCardWrapper>
        ); // Fallback to environment
    }
  };

  // QuickAccess items ordered as requested: ENVIRONMENT | PERFORMANCE | AUTHENTICATION | API TESTING | PYTEST TESTS | NOTIFICATIONS | ERROR BOUNDARY | FORM VALIDATION
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
      id: 'authentication',
      title: 'Authentication',
      description: 'Test login and session management',
      badgeTitle: 'AUTHENTICATION',
      badgeColorScheme: 'purple',
      onClick: () => handleTestSelection('authentication')
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
      id: 'pytest',
      title: 'Pytest Tests',
      description: 'Run pytest test suites and manage test fixtures',
      badgeTitle: 'PYTEST TESTS',
      badgeColorScheme: 'green',
      onClick: () => handleTestSelection('pytest')
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
      id: 'error-boundary',
      title: 'Error Boundary',
      description: 'Test error handling and recovery',
      badgeTitle: 'ERROR BOUNDARY',
      badgeColorScheme: 'red',
      onClick: () => handleTestSelection('error-boundary')
    },
    {
      id: 'form-validation',
      title: 'Form Validation',
      description: 'Test form validation and input handling',
      badgeTitle: 'FORM VALIDATION',
      badgeColorScheme: 'teal',
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