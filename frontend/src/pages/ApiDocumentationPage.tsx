// frontend/src/pages/ApiDocumentationPage.tsx

import React, { useState } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue
} from '@chakra-ui/react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AppIcon } from '../components/AppIcon';
import { OptionsMenu } from '../components/OptionsMenu';

export const ApiDocumentationPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <ErrorBoundary context="API Documentation Page">
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
            <AppIcon name="api-docs" boxSize="20px" />
            <Heading as="h2" size="md">
              API Documentation
            </Heading>
            <Box ml="auto">
              <OptionsMenu />
            </Box>
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
          <VStack spacing={6} align="stretch">

            {/* Introduction */}
            <Box>
              <HStack spacing={2} mb={4}>
                <Badge colorScheme="blue" fontSize="sm" px={2} py={1}>API REFERENCE</Badge>
                <Badge colorScheme="green" fontSize="sm" px={2} py={1}>AUTO-GENERATED</Badge>
              </HStack>

              <Text color="gray.600" fontSize="md" mb={0}>
                Interactive API documentation for CallMaster. This documentation is automatically
                generated from the backend code and always stays current with the actual API.
              </Text>
            </Box>

            {/* Documentation Tabs */}
            <Tabs index={selectedTab} onChange={setSelectedTab} variant="enclosed">
              <TabList justifyContent="flex-end">
                <Tab>API Overview</Tab>
                <Tab>Swagger UI</Tab>
                <Tab>ReDoc</Tab>
              </TabList>

              <TabPanels>
                {/* API Overview Tab */}
                <TabPanel mt={0}>
                  <VStack spacing={6} align="stretch">
                    <Box>
                      <Heading size="sm" mb={3}>API Endpoints Overview</Heading>
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
                      <Heading size="sm" mb={3}>Authentication</Heading>
                      <Text fontSize="sm" color="gray.600" mb={2}>
                        All API endpoints (except health check and webhooks) require JWT authentication via Clerk.
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        Include the JWT token in the Authorization header: <code>Bearer &lt;token&gt;</code>
                      </Text>
                    </Box>

                    <Box>
                      <Heading size="sm" mb={3}>Base URL</Heading>
                      <Text fontSize="sm" color="gray.600">
                        All API endpoints are prefixed with <code>/api/</code>
                      </Text>
                    </Box>

                  </VStack>
                </TabPanel>

                {/* Swagger UI Tab */}
                <TabPanel p={0} mt={4}>
                  <Box
                    height="600px"
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
                      title="Swagger UI Documentation"
                    />
                  </Box>
                </TabPanel>

                {/* ReDoc Tab */}
                <TabPanel p={0} mt={4}>
                  <Box
                    height="600px"
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
                </TabPanel>
              </TabPanels>
            </Tabs>

          </VStack>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};