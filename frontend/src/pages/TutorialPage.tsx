// frontend/src/TutorialPage.tsx

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Box,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Text,
  Badge,
  Card,
  CardBody,
  Button,
  Divider,
  Heading,
  Code,
  UnorderedList,
  OrderedList,
  ListItem,
  Link,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue
} from '@chakra-ui/react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { BaseUtilityPage } from '../components/base/BaseUtilityPage';
import { AppIcon } from '../components/AppIcon';

interface TutorialPageProps {
  isMenuOpen: boolean;
  onMenuClose: () => void;
}

export const TutorialPage: React.FC<TutorialPageProps> = ({ isMenuOpen, onMenuClose }) => {
  const [selectedTutorial, setSelectedTutorial] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Chakra UI styled components for markdown (same as DocumentationPage)
  const codeBlockBg = useColorModeValue('gray.100', 'gray.700');
  const tableBg = useColorModeValue('white', 'gray.800');
  const tableBorderColor = useColorModeValue('gray.200', 'gray.600');
  const headingColor = useColorModeValue('blue.600', 'blue.300');
  const subHeadingColor = useColorModeValue('blue.500', 'blue.400');

  const markdownComponents = {
    h1: ({ children }: any) => (
      <Heading as="h1" size="xl" mt={8} mb={4} color={headingColor}>
        {children}
      </Heading>
    ),
    h2: ({ children }: any) => (
      <Heading as="h2" size="lg" mt={6} mb={3} color={subHeadingColor}>
        {children}
      </Heading>
    ),
    h3: ({ children }: any) => (
      <Heading as="h3" size="md" mt={5} mb={2}>
        {children}
      </Heading>
    ),
    h4: ({ children }: any) => (
      <Heading as="h4" size="sm" mt={4} mb={2}>
        {children}
      </Heading>
    ),
    p: ({ children }: any) => (
      <Text mb={4} lineHeight="1.6">
        {children}
      </Text>
    ),
    code: ({ children, className }: any) => {
      const isInline = !className;
      return isInline ? (
        <Code fontSize="sm" px={1} py={0.5} bg={codeBlockBg}>
          {children}
        </Code>
      ) : (
        <Box as="pre" bg={codeBlockBg} p={4} borderRadius="md" overflowX="auto" mb={4}>
          <Code fontSize="sm" whiteSpace="pre">
            {children}
          </Code>
        </Box>
      );
    },
    ul: ({ children }: any) => (
      <UnorderedList mb={4} spacing={1}>
        {children}
      </UnorderedList>
    ),
    ol: ({ children }: any) => (
      <OrderedList mb={4} spacing={1}>
        {children}
      </OrderedList>
    ),
    li: ({ children }: any) => (
      <ListItem>
        {children}
      </ListItem>
    ),
    a: ({ href, children }: any) => (
      <Link href={href} color="blue.400" isExternal>
        {children}
      </Link>
    ),
    blockquote: ({ children }: any) => (
      <Box
        borderLeft="4px solid"
        borderColor="blue.400"
        pl={4}
        py={2}
        bg={useColorModeValue('blue.50', 'blue.900')}
        borderRadius="md"
        mb={4}
        fontStyle="italic"
      >
        {children}
      </Box>
    ),
    table: ({ children }: any) => (
      <Box overflowX="auto" mb={4}>
        <Table variant="simple" bg={tableBg} size="sm">
          {children}
        </Table>
      </Box>
    ),
    thead: ({ children }: any) => <Thead>{children}</Thead>,
    tbody: ({ children }: any) => <Tbody>{children}</Tbody>,
    tr: ({ children }: any) => <Tr>{children}</Tr>,
    th: ({ children }: any) => (
      <Th borderColor={tableBorderColor} fontSize="xs">
        {children}
      </Th>
    ),
    td: ({ children }: any) => (
      <Td borderColor={tableBorderColor} fontSize="sm">
        {children}
      </Td>
    ),
    hr: () => <Divider my={6} />
  };

  const loadFeatureTutorial = async () => {
    setSelectedTutorial('features');
    setIsLoading(true);
    try {
      const response = await fetch('/api/docs/tutorial/feature-tutorial.md');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setContent(data.content);
    } catch (error) {
      setContent(`# Error Loading Tutorial\n\n${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Default overview content
  const defaultContent = (
    <VStack spacing={6} align="stretch">

      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>Coming Soon!</AlertTitle>
          <AlertDescription>
            We're currently developing comprehensive tutorials to help you get the most out of Call•Master.
            Check back soon for step-by-step guides and video tutorials.
          </AlertDescription>
        </Box>
      </Alert>

    </VStack>
  );

  const featureContent = (
    <VStack spacing={6} align="stretch">
      {isLoading ? (
        <VStack spacing={4}>
          <AppIcon name="compass" boxSize="32px" />
          <Box>Loading tutorial...</Box>
        </VStack>
      ) : (
        <Box>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {content}
          </ReactMarkdown>
        </Box>
        )}
    </VStack>
  );

  // QuickAccess items
  const quickAccessItems = [
    {
      id: 'features',
      title: 'Feature Tutorials',
      description: 'Step-by-step guides for core features',
      icon: 'compass' as const,
      isDisabled: true,
      onClick: () => setSelectedTutorial('features')
    },
    {
      id: 'quickstart',
      title: 'Quick Start',
      description: 'Get started in 5 minutes',
      icon: 'compass' as const,
      isDisabled: true,
      onClick: () => setSelectedTutorial('quickstart')
    },
    {
      id: 'faq',
      title: 'FAQ & Support',
      description: 'Common questions and solutions',
      icon: 'compass' as const,
      isDisabled: true,
      onClick: () => setSelectedTutorial('faq')
    },
    {
      id: 'settings',
      title: 'Settings Guide',
      description: 'Customize your experience',
      icon: 'compass' as const,
      isDisabled: true,
      onClick: () => setSelectedTutorial('settings')
    }
  ];

  return (
    <ErrorBoundary context="Tutorial Page">
      <BaseUtilityPage
        pageTitle="Tutorial"
        pageIcon="compass"
        defaultContent={defaultContent}
        selectedContent={selectedTutorial === 'features' ? featureContent : null}
        quickAccessItems={quickAccessItems}
        activeItemId={selectedTutorial || undefined}
        isMenuOpen={isMenuOpen}
        onMenuClose={onMenuClose}
      />
    </ErrorBoundary>
  );
};