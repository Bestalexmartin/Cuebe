// frontend/src/pages/ApiDocsPage.tsx

import React, { useState, useRef, useEffect } from 'react';
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

  // API Cards matching tutorial section styling
  const ApiCard = ({ title, methods, description, endpoints, longDescription, colorScheme, isExpanded, onClick, cardRef }: {
    title: string;
    methods: string;
    description: string;
    endpoints: string;
    longDescription: string;
    colorScheme: string;
    isExpanded: boolean;
    onClick: () => void;
    cardRef?: React.RefObject<HTMLDivElement>;
  }) => {
    const cardBg = useColorModeValue('white', 'gray.800');
    const textColor = useColorModeValue('gray.900', 'white');
    
    return (
      <Box
        ref={cardRef}
        p={4}
        rounded="md"
        shadow="sm"
        bg={cardBg}
        borderWidth="2px"
        borderColor="gray.600"
        cursor="pointer"
        _hover={{ borderColor: "orange.400" }}
        onClick={onClick}
      >
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between">
            <Text fontWeight="semibold" fontSize="sm" color={textColor}>
              {title}
            </Text>
            <Badge colorScheme={colorScheme} fontSize="xs" px={2} py={1}>
              {methods}
            </Badge>
          </HStack>
          
          <Text fontSize="sm" color="cardText" lineHeight="tall">
            {description}
          </Text>
          
          {isExpanded && (
            <VStack align="stretch" spacing={3} mt={2}>
              <Text fontSize="sm" color="cardText" lineHeight="tall">
                {longDescription}
              </Text>
              <Box 
                p={3} 
                bg={useColorModeValue('gray.50', 'gray.700')} 
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.600"
              >
                <Text fontSize="xs" fontFamily="mono" color="cardText">
                  {endpoints}
                </Text>
              </Box>
            </VStack>
          )}
        </VStack>
      </Box>
    );
  };

  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  
  // Refs for auto-scrolling
  const cardRefs = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({
    auth: useRef<HTMLDivElement | null>(null),
    production: useRef<HTMLDivElement | null>(null),
    collaboration: useRef<HTMLDivElement | null>(null),
    team: useRef<HTMLDivElement | null>(null),
    venues: useRef<HTMLDivElement | null>(null),
    docs: useRef<HTMLDivElement | null>(null),
    system: useRef<HTMLDivElement | null>(null),
  });

  // Auto-scroll to expanded card with proper padding
  useEffect(() => {
    if (expandedCard && cardRefs.current[expandedCard]?.current) {
      // Small delay to allow expansion animation to complete
      setTimeout(() => {
        const cardElement = cardRefs.current[expandedCard]?.current;
        if (cardElement) {
          const containerElement = cardElement.closest('.edit-form-container');
          if (containerElement) {
            const cardRect = cardElement.getBoundingClientRect();
            const containerRect = containerElement.getBoundingClientRect();
            const scrollTop = containerElement.scrollTop;
            
            // Calculate desired position with 19px padding from top
            const desiredTopOffset = 19;
            const cardTopRelativeToContainer = cardRect.top - containerRect.top + scrollTop;
            const targetScrollTop = cardTopRelativeToContainer - desiredTopOffset;
            
            // Only scroll if the card would be too close to the top or off-screen
            const currentTopOffset = cardRect.top - containerRect.top;
            if (currentTopOffset < desiredTopOffset || currentTopOffset < 0) {
              containerElement.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: 'smooth'
              });
            }
          }
        }
      }, 100);
    }
  }, [expandedCard]);

  const handleCardClick = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };
  
  const apiOverviewContent = (
    <VStack spacing={4} align="stretch">
        <ApiCard
          title="Authentication & User Management"
          methods="GET, POST, PATCH"
          description="User authentication, registration, and account management with Clerk integration"
          endpoints="/api/users/*, /api/webhooks/clerk, /api/users/preferences"
          longDescription="Handles user registration, authentication flows, and profile management. Integrates with Clerk for secure authentication and supports user preferences including display settings and operational preferences. Provides webhook endpoints for user lifecycle events and supports both authenticated and guest user workflows."
          colorScheme="blue"
          isExpanded={expandedCard === 'auth'}
          onClick={() => handleCardClick('auth')}
          cardRef={cardRefs.current.auth as React.RefObject<HTMLDivElement>}
        />

        <ApiCard
          title="Production Management"
          methods="GET, POST, PATCH, DELETE"
          description="Core theater production workflows - shows, scripts, and production lifecycle"
          endpoints="/api/shows/*, /api/scripts/*, /api/me/shows, /api/scripts/import/*"
          longDescription="Central hub for theater productions including show creation, script management, and production scheduling. Supports script import from various formats (CSV, text files) with intelligent parsing and department mapping. Handles script versioning, production timelines, and integrates with venue and crew assignment systems."
          colorScheme="red"
          isExpanded={expandedCard === 'production'}
          onClick={() => handleCardClick('production')}
          cardRef={cardRefs.current.production as React.RefObject<HTMLDivElement>}
        />

        <ApiCard
          title="Real-Time Script Collaboration"
          methods="WebSocket, GET, POST, PATCH, DELETE"
          description="Live script synchronization, cue management, and collaborative editing with WebSocket support"
          endpoints="/ws/script/*, /api/scripts/*/elements, /api/elements/*, /api/elements/bulk/*"
          longDescription="Advanced script collaboration system enabling real-time synchronized playback across multiple devices. Features include live cue highlighting, timing synchronization, pause/resume with delay compensation, and 'Tetris mode' for hiding completed elements. Supports bulk operations for efficient script updates and maintains connection state for late-joining participants."
          colorScheme="green"
          isExpanded={expandedCard === 'collaboration'}
          onClick={() => handleCardClick('collaboration')}
          cardRef={cardRefs.current.collaboration as React.RefObject<HTMLDivElement>}
        />

        <ApiCard
          title="Team & Access Management"
          methods="GET, POST, PATCH, DELETE"
          description="Crew management, departments, role assignments, and collaborative sharing"
          endpoints="/api/me/crews, /api/crew/*, /api/me/departments, /api/departments/*, /api/shows/*/crew/*/share, /shared/*"
          longDescription="Comprehensive team management including crew member assignments, department organization (lighting, sound, costumes, etc.), and role-based permissions. Features secure sharing tokens for guest access, crew relationship management, and department-specific workflow support. Enables collaborative access without requiring full user accounts."
          colorScheme="purple"
          isExpanded={expandedCard === 'team'}
          onClick={() => handleCardClick('team')}
          cardRef={cardRefs.current.team as React.RefObject<HTMLDivElement>}
        />

        <ApiCard
          title="Venue & Resource Management"
          methods="GET, POST, PATCH, DELETE"
          description="Theater venues, technical specifications, and resource allocation"
          endpoints="/api/me/venues, /api/venues/*"
          longDescription="Venue management system for tracking theater spaces, technical specifications, seating arrangements, and equipment details. Supports multiple venue types from rehearsal rooms to main stages, stores contact information, and integrates with production scheduling. Essential for technical planning and resource allocation across productions."
          colorScheme="orange"
          isExpanded={expandedCard === 'venues'}
          onClick={() => handleCardClick('venues')}
          cardRef={cardRefs.current.venues as React.RefObject<HTMLDivElement>}
        />

        <ApiCard
          title="Documentation & Search"
          methods="GET"
          description="Integrated documentation system with intelligent search capabilities"
          endpoints="/api/docs/search"
          longDescription="Built-in documentation system with advanced search functionality. Automatically indexes markdown documentation by category and provides contextual search results. Supports both authenticated and guest access, enabling users to quickly find relevant information about features, workflows, and best practices."
          colorScheme="teal"
          isExpanded={expandedCard === 'docs'}
          onClick={() => handleCardClick('docs')}
          cardRef={cardRefs.current.docs as React.RefObject<HTMLDivElement>}
        />

        <ApiCard
          title="Development & System Health"
          methods="GET, POST"
          description="Health monitoring, system diagnostics, and development utilities"
          endpoints="/api/health, /api/dev/*, /api/system-tests/*"
          longDescription="Development and monitoring tools including health checks, system diagnostics, performance monitoring, and comprehensive testing endpoints. Features environment validation, API response time monitoring, database connectivity checks, and development utilities for debugging and optimization."
          colorScheme="gray"
          isExpanded={expandedCard === 'system'}
          onClick={() => handleCardClick('system')}
          cardRef={cardRefs.current.system as React.RefObject<HTMLDivElement>}
        />
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