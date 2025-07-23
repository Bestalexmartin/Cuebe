// frontend/src/pages/ApiDocumentationPage.tsx

import React, { useState } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  useColorModeValue
} from '@chakra-ui/react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { UnifiedPageLayout } from '../components/layout/UnifiedPageLayout';

interface ApiDocumentationPageProps {
  isMenuOpen: boolean;
  onMenuClose: () => void;
}

export const ApiDocumentationPage: React.FC<ApiDocumentationPageProps> = ({ isMenuOpen, onMenuClose }) => {
  // Initialize with session storage or default to 'swagger'
  const [selectedContent, setSelectedContent] = useState<string>(() => {
    const saved = sessionStorage.getItem('apiDocsSelectedContent');
    return saved || 'swagger';
  });

  // Save selection to session storage whenever it changes
  const handleContentSelection = (contentId: string) => {
    setSelectedContent(contentId);
    sessionStorage.setItem('apiDocsSelectedContent', contentId);
  };

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // No default content needed since we always have content selected

  // API Overview content
  const apiOverviewContent = (
    <VStack spacing={6} align="stretch">
      <Box>
        <Text fontSize="lg" fontWeight="semibold" mb={3}>API Endpoints Overview</Text>
        <VStack spacing={3} align="stretch">
          <Box p={4} border="1px solid" borderColor={borderColor} borderRadius="md">
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="semibold">Authentication & Users</Text>
              <Badge colorScheme="blue">POST, GET</Badge>
            </HStack>
            <Text fontSize="sm" color="gray.600">
              User registration, authentication, and guest user management
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              /api/users/*, /api/webhooks/clerk
            </Text>
          </Box>

          <Box p={4} border="1px solid" borderColor={borderColor} borderRadius="md">
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="semibold">Crew Management</Text>
              <Badge colorScheme="green">GET, POST, PATCH, DELETE</Badge>
            </HStack>
            <Text fontSize="sm" color="gray.600">
              Manage crew members and their relationships with managers
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              /api/me/crews, /api/crew/*, /api/crew-relationships/*
            </Text>
          </Box>

          <Box p={4} border="1px solid" borderColor={borderColor} borderRadius="md">
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="semibold">Venues</Text>
              <Badge colorScheme="purple">GET, POST, PATCH, DELETE</Badge>
            </HStack>
            <Text fontSize="sm" color="gray.600">
              Theater venue information and management
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              /api/me/venues, /api/venues/*
            </Text>
          </Box>

          <Box p={4} border="1px solid" borderColor={borderColor} borderRadius="md">
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="semibold">Departments</Text>
              <Badge colorScheme="orange">GET, POST, PATCH, DELETE</Badge>
            </HStack>
            <Text fontSize="sm" color="gray.600">
              Technical departments (Sound, Lighting, etc.)
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              /api/me/departments, /api/departments/*
            </Text>
          </Box>

          <Box p={4} border="1px solid" borderColor={borderColor} borderRadius="md">
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="semibold">Shows & Scripts</Text>
              <Badge colorScheme="red">GET, POST, PATCH, DELETE</Badge>
            </HStack>
            <Text fontSize="sm" color="gray.600">
              Theater productions and their call scripts
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              /api/shows/*, /api/scripts/*, /api/me/shows
            </Text>
          </Box>

          <Box p={4} border="1px solid" borderColor={borderColor} borderRadius="md">
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="semibold">Development & Health</Text>
              <Badge colorScheme="gray">GET, POST</Badge>
            </HStack>
            <Text fontSize="sm" color="gray.600">
              Health checks, diagnostics, and testing endpoints
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              /api/health, /api/dev/*
            </Text>
          </Box>
        </VStack>
      </Box>

      <Box>
        <Text fontSize="md" fontWeight="semibold" mb={3}>Authentication</Text>
        <Text fontSize="sm" color="gray.600" mb={2}>
          All API endpoints (except health check and webhooks) require JWT authentication via Clerk.
        </Text>
        <Text fontSize="sm" color="gray.600">
          Include the JWT token in the Authorization header: <code>Bearer &lt;token&gt;</code>
        </Text>
      </Box>

      <Box>
        <Text fontSize="md" fontWeight="semibold" mb={3}>Base URL</Text>
        <Text fontSize="sm" color="gray.600">
          All API endpoints are prefixed with <code>/api/</code>
        </Text>
      </Box>
    </VStack>
  );

  // Render selected content
  const renderSelectedContent = () => {
    switch (selectedContent) {
      case 'swagger':
        return (
          <Box
            height="80vh"
            border="1px solid"
            borderColor={borderColor}
            borderRadius="md"
            overflow="hidden"
            bg={bgColor}
          >
            <iframe
              src="/docs"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title="API Explorer Documentation"
            />
          </Box>
        );
      case 'overview':
        return apiOverviewContent;
      case 'redoc':
        return (
          <Box
            height="80vh"
            border="1px solid"
            borderColor={borderColor}
            borderRadius="md"
            overflow="hidden"
            bg={bgColor}
          >
            <iframe
              src="/redoc"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title="ReDoc Documentation"
            />
          </Box>
        );
      default:
        return (
          <Box
            height="80vh"
            border="1px solid"
            borderColor={borderColor}
            borderRadius="md"
            overflow="hidden"
            bg={bgColor}
          >
            <iframe
              src="/docs"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title="API Explorer Documentation"
            />
          </Box>
        ); // Fallback to swagger
    }
  };

  // QuickAccess items ordered as requested: API Explorer first, then Overview, then ReDoc
  const quickAccessItems = [
    {
      id: 'swagger',
      title: 'API Explorer',
      description: 'Interactive API explorer',
      onClick: () => handleContentSelection('swagger')
    },
    {
      id: 'overview',
      title: 'API Overview',
      description: 'High-level endpoints overview',
      onClick: () => handleContentSelection('overview')
    },
    {
      id: 'redoc',
      title: 'ReDoc',
      description: 'Detailed documentation',
      onClick: () => handleContentSelection('redoc')
    }
  ];

  return (
    <ErrorBoundary context="API Documentation Page">
      <UnifiedPageLayout
        pageTitle="API Documentation"
        pageIcon="api-docs"
        defaultContent={null}
        selectedContent={renderSelectedContent()}
        quickAccessItems={quickAccessItems}
        activeItemId={selectedContent}
        isMenuOpen={isMenuOpen}
        onMenuClose={onMenuClose}
      />
    </ErrorBoundary>
  );
};