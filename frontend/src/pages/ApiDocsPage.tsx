// frontend/src/pages/ApiDocsPage.tsx

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
import { BaseUtilityPage } from '../components/base/BaseUtilityPage';

interface ApiDocsPageProps {
  isMenuOpen: boolean;
  onMenuClose: () => void;
}

export const ApiDocsPage: React.FC<ApiDocsPageProps> = ({ isMenuOpen, onMenuClose }) => {
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
        <VStack spacing={3} align="stretch">
          <Box p={4} border="1px solid" borderColor={borderColor} borderRadius="md">
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="semibold">Authentication</Text>
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
              <Text fontWeight="semibold">Script Elements</Text>
              <Badge colorScheme="teal">GET, POST, PATCH, DELETE</Badge>
            </HStack>
            <Text fontSize="sm" color="gray.600">
              Individual cues, notes, and groups within theater scripts - lighting cues, sound effects, stage directions, and safety-critical elements
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              /api/scripts/*/elements, /api/elements/*, bulk operations
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
    </VStack>
  );

  // Render selected content
  const renderSelectedContent = () => {
    switch (selectedContent) {
      case 'swagger':
        return (
          <Box
            height="100%"
            border="1px solid"
            borderColor={borderColor}
            borderRadius="md"
            overflow="hidden"
            bg="white"
          >
            <iframe
              src="/docs"
              width="100%"
              height="100%"
              style={{ 
                border: 'none',
                backgroundColor: 'white'
              }}
              title="API Explorer Documentation"
            />
          </Box>
        );
      case 'overview':
        return apiOverviewContent;
      case 'redoc':
        return (
          <Box
            height="100%"
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
            height="100%"
            border="1px solid"
            borderColor={borderColor}
            borderRadius="md"
            overflow="hidden"
            bg="white"
          >
            <iframe
              src="/docs"
              width="100%"
              height="100%"
              style={{ 
                border: 'none',
                backgroundColor: 'white'
              }}
              title="API Explorer Documentation"
            />
          </Box>
        ); // Fallback to swagger
    }
  };

  // QuickAccess items ordered: API Overview first, then API Explorer, then ReDoc
  const quickAccessItems = [
    {
      id: 'overview',
      title: 'API Overview',
      description: 'High-level endpoints overview',
      icon: 'api-docs' as const,
      onClick: () => handleContentSelection('overview')
    },
    {
      id: 'swagger',
      title: 'API Explorer',
      description: 'Interactive API explorer',
      icon: 'api-docs' as const,
      onClick: () => handleContentSelection('swagger')
    },
    {
      id: 'redoc',
      title: 'ReDoc',
      description: 'Detailed documentation',
      icon: 'api-docs' as const,
      onClick: () => handleContentSelection('redoc')
    }
  ];

  return (
    <ErrorBoundary context="API Documentation Page">
      <BaseUtilityPage
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