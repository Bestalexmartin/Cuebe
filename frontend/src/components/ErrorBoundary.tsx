// frontend/src/components/ErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Code,
  useColorModeValue
} from '@chakra-ui/react';
import { AppIcon } from './AppIcon';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: string; // Context for better error reporting
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate a unique error ID for tracking
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // Log error details
    console.error('[ErrorBoundary] Component error caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString()
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendErrorReport(error, errorInfo, this.state.errorId);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return <ErrorFallback 
        error={this.state.error}
        errorInfo={this.state.errorInfo}
        errorId={this.state.errorId}
        context={this.props.context}
        onRetry={this.handleRetry}
        onReload={this.handleReload}
      />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  context?: string;
  onRetry: () => void;
  onReload: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  context,
  onRetry,
  onReload
}) => {
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('red.200', 'red.300');

  return (
    <Box
      p={8}
      bg={bgColor}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      maxW="600px"
      mx="auto"
      mt={8}
    >
      <VStack spacing={6} align="stretch">
        {/* Error Header */}
        <HStack spacing={3}>
          <AppIcon name="warning" boxSize="24px" color="red.500" />
          <Heading size="md" color="red.600">
            Something went wrong
          </Heading>
        </HStack>

        {/* Error Alert */}
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Component Error!</AlertTitle>
            <AlertDescription>
              {context 
                ? `An error occurred in ${context}. The component has crashed but the rest of the application should continue working.`
                : 'A component has crashed, but the rest of the application should continue working.'
              }
            </AlertDescription>
          </Box>
        </Alert>

        {/* Error Message */}
        {error && (
          <Box>
            <Text fontWeight="semibold" mb={2}>Error Message:</Text>
            <Code p={3} borderRadius="md" fontSize="sm" display="block" whiteSpace="pre-wrap">
              {error.message}
            </Code>
          </Box>
        )}

        {/* Error ID */}
        <Box>
          <Text fontSize="sm" color="gray.600">
            Error ID: <Code fontSize="xs">{errorId}</Code>
          </Text>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Use this ID when reporting the issue to support
          </Text>
        </Box>

        {/* Action Buttons */}
        <HStack spacing={3} justify="center">
          <Button
            colorScheme="blue"
            onClick={onRetry}
          >
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={onReload}
          >
            Reload Page
          </Button>
        </HStack>

        {/* Technical Details (Collapsible) */}
        {(error?.stack || errorInfo?.componentStack) && (
          <Accordion allowToggle>
            <AccordionItem border="none">
              <AccordionButton px={0} _hover={{ bg: 'transparent' }}>
                <Box flex="1" textAlign="left">
                  <Text fontSize="sm" fontWeight="semibold">
                    Technical Details
                  </Text>
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel px={0} pb={0}>
                <VStack align="stretch" spacing={4}>
                  {error?.stack && (
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" mb={2}>
                        Error Stack:
                      </Text>
                      <Code 
                        p={3} 
                        borderRadius="md" 
                        fontSize="xs" 
                        display="block" 
                        whiteSpace="pre-wrap"
                        maxH="200px"
                        overflowY="auto"
                      >
                        {error.stack}
                      </Code>
                    </Box>
                  )}
                  
                  {errorInfo?.componentStack && (
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" mb={2}>
                        Component Stack:
                      </Text>
                      <Code 
                        p={3} 
                        borderRadius="md" 
                        fontSize="xs" 
                        display="block" 
                        whiteSpace="pre-wrap"
                        maxH="200px"
                        overflowY="auto"
                      >
                        {errorInfo.componentStack}
                      </Code>
                    </Box>
                  )}
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        )}

        {/* Help Text */}
        <Box textAlign="center">
          <Text fontSize="sm" color="gray.600">
            If this problem persists, please contact support with the error ID above.
          </Text>
        </Box>
      </VStack>
    </Box>
  );
};

/**
 * Simplified error boundary for smaller components
 */
export const SimpleErrorBoundary: React.FC<{
  children: ReactNode;
  context?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}> = ({ children, context, onError }) => {
  return (
    <ErrorBoundary
      context={context}
      onError={onError}
      fallback={
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Component Error</AlertTitle>
            <AlertDescription>
              {context ? `Error in ${context}` : 'A component error occurred'}
            </AlertDescription>
          </Box>
        </Alert>
      }
    >
      {children}
    </ErrorBoundary>
  );
};