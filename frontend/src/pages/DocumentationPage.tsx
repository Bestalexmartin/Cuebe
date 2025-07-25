import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { UnifiedPageLayout } from '../components/layout/UnifiedPageLayout';
import { AppIcon } from '../components/AppIcon';

interface DocFile {
  name: string;
  path: string;
  description: string;
  category: 'Quick Start' | 'Architecture' | 'Testing' | 'Archive';
  icon: 'compass' | 'docs' | 'component' | 'performance' | 'warning' | 'test' | 'archive';
}

const DOCUMENTATION_FILES: DocFile[] = [
  {
    name: 'Development Guide',
    path: 'development-guide.md',
    description: 'Quick start guide for developers with setup, workflow, and best practices',
    category: 'Quick Start',
    icon: 'compass'
  },
  {
    name: 'Documentation Overview',
    path: 'README.md',
    description: 'Main documentation index and navigation guide',
    category: 'Quick Start',
    icon: 'docs'
  },
  {
    name: 'System Architecture',
    path: 'architecture/system-architecture.md',
    description: 'Docker containers, database setup, and infrastructure overview',
    category: 'Architecture',
    icon: 'component'
  },
  {
    name: 'Component Architecture',
    path: 'architecture/component-architecture.md',
    description: 'BaseCard/BaseModal patterns and implementation guide',
    category: 'Architecture',
    icon: 'component'
  },
  {
    name: 'Performance Optimizations',
    path: 'architecture/performance-optimizations.md',
    description: 'React.memo implementation and performance monitoring',
    category: 'Architecture',
    icon: 'performance'
  },
  {
    name: 'Error Handling',
    path: 'architecture/error-handling.md',
    description: 'Error boundaries, validation, and recovery strategies',
    category: 'Architecture',
    icon: 'warning'
  },
  {
    name: 'Documentation Integration',
    path: 'architecture/documentation-integration.md',
    description: 'How documentation is integrated into the application',
    category: 'Architecture',
    icon: 'docs'
  },
  {
    name: 'Testing Tools Guide',
    path: 'testing/testing-tools-guide.md',
    description: 'Comprehensive testing suite documentation and usage',
    category: 'Testing',
    icon: 'test'
  },
  {
    name: 'Codebase Improvements Archive',
    path: 'archive/codebase-improvements-archive.md',
    description: 'Complete record of major refactoring and optimizations',
    category: 'Archive',
    icon: 'archive'
  }
];


interface DocumentationPageProps {
  isMenuOpen: boolean;
  onMenuClose: () => void;
}

export const DocumentationPage: React.FC<DocumentationPageProps> = ({ isMenuOpen, onMenuClose }) => {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Chakra UI styled components for markdown
  const codeBlockBg = useColorModeValue('gray.100', 'gray.700');
  const tableBg = useColorModeValue('white', 'gray.800');
  const tableBorderColor = useColorModeValue('gray.200', 'gray.600');

  const markdownComponents = {
    h1: ({ children }: any) => (
      <Heading as="h1" size="xl" mt={8} mb={4} color="blue.400">
        {children}
      </Heading>
    ),
    h2: ({ children }: any) => (
      <Heading as="h2" size="lg" mt={6} mb={3} color="blue.300">
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


  const loadCategory = (category: string) => {
    setSelectedCategory(category);
    setSelectedDoc(null);
    setContent('');
  };

  // Quick Access items for documentation categories
  const quickAccessItems = [
    {
      id: 'quick-start',
      title: 'Quick Start',
      description: 'Development guide and documentation overview',
      icon: 'compass' as const,
      isDisabled: false,
      onClick: () => loadCategory('Quick Start')
    },
    {
      id: 'architecture',
      title: 'Architecture',
      description: 'Component patterns and performance guides',
      icon: 'component' as const,
      isDisabled: false,
      onClick: () => loadCategory('Architecture')
    },
    {
      id: 'testing',
      title: 'Testing',
      description: 'Testing tools and strategies',
      icon: 'test' as const,
      isDisabled: false,
      onClick: () => loadCategory('Testing')
    },
    {
      id: 'archive',
      title: 'Archive',
      description: 'Project history and improvements',
      icon: 'archive' as const,
      isDisabled: false,
      onClick: () => loadCategory('Archive')
    }
  ];

  // Helper function to get category icon
  const getCategoryIcon = (category: string) => {
    const item = quickAccessItems.find(item => item.title === category);
    return item?.icon || 'docs';
  };

  const loadDocument = async (docId: string) => {
    const doc = DOCUMENTATION_FILES.find(d => d.name === docId);
    if (!doc) return;

    setIsLoading(true);
    setSelectedDoc(docId);

    try {
      const response = await fetch(`/api/docs/${doc.path}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setContent(data.content);
    } catch (error) {
      setContent(`# Error Loading Document

Unable to load **${doc.name}** from \`${doc.path}\`

**Error details:**
${error instanceof Error ? error.message : 'Unknown error occurred'}

**Troubleshooting:**
- Ensure the backend server is running
- Check that the file exists at the specified path
- Verify API endpoint is accessible at \`/api/docs/${doc.path}\`

**Alternative:** You can access this file directly in your project at: \`${doc.path}\``);
    } finally {
      setIsLoading(false);
    }
  };

  // Default overview content
  const defaultContent = (
    <VStack spacing={4} align="stretch">
      {/* Documentation Overview Cards */}
      {Object.entries(
        DOCUMENTATION_FILES.reduce((groups, doc) => {
          if (!groups[doc.category]) groups[doc.category] = [];
          groups[doc.category].push(doc);
          return groups;
        }, {} as Record<string, DocFile[]>)
      ).map(([category, docs]) => (
        <Card key={category} size="sm" bg="gray.800">
          <CardBody>
            <VStack align="stretch" spacing={3}>
              <HStack spacing={2}>
                <Badge colorScheme="blue" size="sm">
                  {category}
                </Badge>
                <Text fontWeight="semibold" fontSize="sm" color="white">
                  {docs.length} document{docs.length > 1 ? 's' : ''}
                </Text>
              </HStack>
              <VStack spacing={2} align="stretch">
                {docs.map((doc) => (
                  <HStack key={doc.name} spacing={3} p={2} rounded="md" bg="gray.700">
                    <Box px={2}>
                      <AppIcon name={doc.icon} boxSize="25px" color="white" />
                    </Box>
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontWeight="medium" fontSize="sm" color="white">
                        {doc.name}
                      </Text>
                      <Text fontSize="xs" color="whiteAlpha.800" noOfLines={1}>
                        {doc.description}
                      </Text>
                    </VStack>
                  </HStack>
                ))}
              </VStack>
            </VStack>
          </CardBody>
        </Card>
      ))}
    </VStack>
  );

  // Category view content
  const categoryContent = selectedCategory ? (
    <VStack spacing={4} align="stretch">
      <Card>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <HStack spacing={3} align="start">
              <AppIcon 
                name={getCategoryIcon(selectedCategory)} 
                boxSize="24px" 
                color="white" 
              />
              <VStack align="start" spacing={0}>
                <Text fontWeight="semibold" fontSize="lg">{selectedCategory} Documentation</Text>
                <Text fontSize="sm" color="gray.500">
                  {DOCUMENTATION_FILES.filter(doc => doc.category === selectedCategory).length} documents
                </Text>
              </VStack>
            </HStack>
            <Divider />
            <VStack spacing={3} align="stretch">
              {DOCUMENTATION_FILES
                .filter(doc => doc.category === selectedCategory)
                .map((doc) => (
                  <HStack 
                    key={doc.name} 
                    spacing={3} 
                    p={3} 
                    rounded="md" 
                    bg="gray.700"
                    cursor="pointer"
                    _hover={{ bg: "gray.600" }}
                    onClick={() => loadDocument(doc.name)}
                    align="start"
                  >
                    <Box px={2}>
                      <AppIcon name={doc.icon} boxSize="20px" color="white" />
                    </Box>
                    <VStack align="start" spacing={1} flex={1}>
                      <Text fontWeight="medium" fontSize="sm" color="white">
                        {doc.name}
                      </Text>
                      <Text fontSize="xs" color="whiteAlpha.800">
                        {doc.description}
                      </Text>
                    </VStack>
                  </HStack>
                ))}
            </VStack>
            <Divider />
            <HStack spacing={4}>
              <Button
                size="sm"
                variant="outline"
                _hover={{ borderColor: 'orange.400' }}
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedDoc(null);
                }}
              >
                Back to Overview
              </Button>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  ) : null;

  // Selected document content
  const selectedContent = selectedDoc ? (
    <VStack spacing={6} align="stretch">
      {isLoading ? (
        <VStack spacing={4}>
          <AppIcon name="docs" boxSize="32px" />
          <Text>Loading documentation...</Text>
        </VStack>
      ) : (
        <>
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <HStack spacing={3} align="start">
                  <AppIcon name={DOCUMENTATION_FILES.find(doc => doc.name === selectedDoc)?.icon || 'docs'} boxSize="24px" color="white" />
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="semibold">{selectedDoc}</Text>
                  </VStack>
                </HStack>
                <Divider />
                <Box>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {content}
                  </ReactMarkdown>
                </Box>
                <Divider />
                <HStack spacing={4}>
                  <Button
                    size="sm"
                    variant="outline"
                    _hover={{ borderColor: 'orange.400' }}
                    onClick={() => {
                      if (selectedCategory) {
                        // Go back to category view
                        setSelectedDoc(null);
                      } else {
                        // Go back to overview
                        setSelectedDoc(null);
                        setSelectedCategory(null);
                      }
                    }}
                  >
                    {selectedCategory ? `Back to ${selectedCategory}` : 'Back to Overview'}
                  </Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </>
      )}
    </VStack>
  ) : null;

  return (
    <ErrorBoundary context="Documentation Page">
      <UnifiedPageLayout
        pageTitle="Documentation"
        pageIcon="docs"
        defaultContent={defaultContent}
        selectedContent={selectedDoc ? selectedContent : categoryContent}
        quickAccessItems={quickAccessItems}
        activeItemId={selectedCategory ? selectedCategory.toLowerCase().replace(' ', '-') : undefined}
        isMenuOpen={isMenuOpen}
        onMenuClose={onMenuClose}
      />
    </ErrorBoundary>
  );
};