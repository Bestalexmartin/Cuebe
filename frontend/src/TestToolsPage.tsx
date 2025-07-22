// frontend/src/TestToolsPage.tsx

import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Badge,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorTestComponent } from './components/ErrorTestComponent';
import { AppIcon } from './components/AppIcon';

export const TestToolsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/dashboard');
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
            <Button
              onClick={handleClose}
              size="xs"
              ml="auto"
              _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
            >
              Back to Dashboard
            </Button>
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

            {/* Error Testing Section */}
            <Box
              display="flex"
              flexWrap="wrap"
              gap={4}
              alignItems="flex-start"
            >
              <Box
                p={4}
                border="1px solid"
                borderColor="gray.600"
                borderRadius="md"
                flex="0 0 auto"
                maxW="600px"
                width="100%"
              >
                <ErrorTestComponent />
              </Box>
            </Box>

          </VStack>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};