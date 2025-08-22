// frontend/src/pages/DocumentationPage.tsx

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
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
  Input,
  InputGroup,
  InputRightElement,
  useColorModeValue
} from '@chakra-ui/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { BaseUtilityPage } from '../components/base/BaseUtilityPage';
import { AppIcon } from '../components/AppIcon';
import { useAuth } from '@clerk/clerk-react';
import { DocumentCard } from '../components/shared/DocumentCard';
import { CategoryDocumentList } from '../components/shared/CategoryDocumentList';
import { DocFile, groupAndSortDocuments, getDocumentsForCategory } from '../utils/documentSorting';


const DOCUMENTATION_FILES: DocFile[] = [
  {
    name: 'Documentation Index',
    path: 'quickstart/documentation-index.md',
    description: 'Complete documentation index with guided navigation and use cases',
    category: 'Quick Start',
    icon: 'docs'
  },
  {
    name: 'Development Guide',
    path: 'development/development-guide.md',
    description: 'Quick start guide for developers with setup, workflow, and best practices',
    category: 'Quick Start',
    icon: 'compass'
  },
  {
    name: 'Database Seed Data System',
    path: 'data/database-seed-data-system.md',
    description: 'Complete seed data creation, backup, and restoration system',
    category: 'Quick Start',
    icon: 'component'
  },
  {
    name: 'Testing Tools Guide',
    path: 'testing/testing-tools-guide.md',
    description: 'Verify your installation with comprehensive testing suite',
    category: 'Quick Start',
    icon: 'test'
  },
  {
    name: 'Development Roadmap',
    path: 'planning/roadmap.md',
    description: 'Comprehensive roadmap for script editing, real-time collaboration, and advanced theater production features',
    category: 'Planning',
    icon: 'roadmap'
  },
  {
    name: 'UI Interaction Guide',
    path: 'development/ui-interaction-guide.md',
    description: 'Best practices for interactive UI development and gesture recognition',
    category: 'User Interface',
    icon: 'component'
  },
  {
    name: 'Documentation Standards',
    path: 'standards/documentation-standards.md',
    description: 'File naming conventions, content guidelines, and maintenance practices',
    category: 'Planning',
    icon: 'docs'
  },
  {
    name: 'State Management Principles',
    path: 'standards/state-management-principles.md',
    description: 'User-centered state management principles and philosophy',
    category: 'Planning',
    icon: 'planning'
  },
  {
    name: 'Code Quality Guide',
    path: 'development/code-quality-guide.md',
    description: 'Code quality maintenance, DRY principles, and performance optimization guide',
    category: 'Planning',
    icon: 'performance'
  },
  {
    name: 'System Architecture',
    path: 'architecture/system-architecture.md',
    description: 'Docker containers, database setup, and infrastructure overview',
    category: 'System Architecture',
    icon: 'component'
  },
  {
    name: 'Component Architecture',
    path: 'architecture/component-architecture.md',
    description: 'BaseCard/BaseModal patterns and implementation guide',
    category: 'Component Architecture',
    icon: 'component'
  },
  {
    name: 'Performance Optimizations',
    path: 'architecture/performance-optimizations.md',
    description: 'React.memo implementation and performance monitoring',
    category: 'System Architecture',
    icon: 'performance'
  },
  {
    name: 'Async/Sync Architecture',
    path: 'architecture/async-sync-architecture.md',
    description: 'Backend architecture decisions, database operations, and async/sync trade-offs',
    category: 'System Architecture',
    icon: 'component'
  },
  {
    name: 'Error Handling',
    path: 'architecture/error-handling.md',
    description: 'Error boundaries, validation, and recovery strategies',
    category: 'System Architecture',
    icon: 'warning'
  },
  {
    name: 'Documentation Integration',
    path: 'architecture/documentation-integration.md',
    description: 'How documentation is integrated into the application',
    category: 'System Architecture',
    icon: 'docs'
  },
  {
    name: 'Script Elements Data Model',
    path: 'architecture/script-elements-data-model.md',
    description: 'Complete data model for script elements including cues, notes, and groups',
    category: 'Data Management',
    icon: 'component'
  },
  {
    name: 'Script Elements Database Schema',
    path: 'architecture/script-elements-database-schema.md',
    description: 'Database schema and relationships for script elements',
    category: 'Data Management',
    icon: 'component'
  },
  {
    name: 'Edit Queue System',
    path: 'architecture/edit-queue-system.md',
    description: 'Professional non-destructive editing with undo/redo, change tracking, and batch saves',
    category: 'Data Management',
    icon: 'component'
  },
  {
    name: 'User Preferences Bitmap System',
    path: 'architecture/user-preferences-bitmap-system.md',
    description: 'Efficient bitmap-based system for storing and managing boolean user preferences',
    category: 'Data Management',
    icon: 'component'
  },
  {
    name: 'Drag-and-Drop System',
    path: 'architecture/drag-and-drop-system.md',
    description: 'Script element reordering with @dnd-kit integration and conflict resolution',
    category: 'User Interface',
    icon: 'component'
  },
  {
    name: 'Script Element Interaction System',
    path: 'architecture/script-element-interaction-system.md',
    description: 'Click-to-select and drag-to-reorder interaction patterns with gesture detection',
    category: 'User Interface',
    icon: 'component'
  },
  {
    name: 'Note Color Customization',
    path: 'architecture/note-color-customization.md',
    description: 'Color selection and customization system for script notes',
    category: 'User Interface',
    icon: 'component'
  },
  {
    name: 'Feature Tutorial',
    path: 'tutorial/feature-tutorial.md',
    description: 'Comprehensive user guide for theater production management features',
    category: 'Tutorial',
    icon: 'compass'
  },
  {
    name: 'Codebase Improvements Archive',
    path: 'archive/codebase-improvements-archive.md',
    description: 'Complete record of major refactoring and optimizations',
    category: 'Archive',
    icon: 'archive'
  },
  {
    name: 'Code Quality Improvements - July 2025',
    path: 'archive/code-quality-improvements-july-2025.md',
    description: 'Archive of July 2025 code quality improvements and refactoring efforts',
    category: 'Archive',
    icon: 'archive'
  },
  {
    name: 'Design Insights Archive',
    path: 'archive/design-insights-archive.md',
    description: 'Valuable design decisions, feature rationales, and architectural insights',
    category: 'Archive',
    icon: 'archive'
  },
  {
    name: 'UI Interaction Improvements - July 2025',
    path: 'archive/ui-interaction-improvements-july-2025.md',
    description: 'Archive of July 2025 UI interaction improvements and implementation details',
    category: 'Archive',
    icon: 'archive'
  },
  {
    name: 'ManageScriptPage Component',
    path: 'components/manage-script-page.md',
    description: 'Comprehensive component guide documenting architecture, mode system, and state management',
    category: 'Component Architecture',
    icon: 'component'
  },
  {
    name: 'Script Mode System',
    path: 'features/script-mode-system.md',
    description: 'Documentation of 6-mode system with implementation details and transition logic',
    category: 'User Interface',
    icon: 'component'
  },
  {
    name: 'User Preferences Integration',
    path: 'features/user-preferences-integration.md',
    description: 'Preview system, auto-sort integration, performance optimizations',
    category: 'Data Management',
    icon: 'component'
  },
  {
    name: 'Script Management Workflows',
    path: 'user-guides/script-management-workflows.md',
    description: 'Step-by-step user workflows for common script management tasks',
    category: 'Tutorial',
    icon: 'compass'
  }
];


interface DocumentationPageProps {
  isMenuOpen: boolean;
  onMenuClose: () => void;
}

interface SearchResult {
  file_path: string;
  title: string;
  category: string;
  url: string;
  snippet: string;
  relevance_score: number;
}

export const DocumentationPage: React.FC<DocumentationPageProps> = ({ isMenuOpen, onMenuClose }) => {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [documentFiles, setDocumentFiles] = useState<DocFile[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Chakra UI styled components for markdown
  const codeBlockBg = useColorModeValue('gray.100', 'gray.700');
  const tableBg = useColorModeValue('white', 'gray.800');
  const tableBorderColor = useColorModeValue('gray.200', 'gray.600');
  const headingColor = useColorModeValue('blue.600', 'blue.300');
  const subHeadingColor = useColorModeValue('blue.500', 'blue.400');


  const { getToken } = useAuth();

  // Load documentation files on component mount
  React.useEffect(() => {
    const loadDocumentationFiles = async () => {
      try {
        setIsLoadingDocs(true);
        const headers: Record<string, string> = {};
        const authToken = await getToken();
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const response = await fetch('/api/docs/index', { headers });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setDocumentFiles(data.documents);
      } catch (error) {
        console.error('Error loading documentation files:', error);
        // Fallback to static array if API fails
        setDocumentFiles(DOCUMENTATION_FILES);
      } finally {
        setIsLoadingDocs(false);
      }
    };

    loadDocumentationFiles();
  }, [getToken]);

  // Search function
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const headers: Record<string, string> = {};
      const authToken = await getToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/docs/search?q=${encodeURIComponent(query)}`, { headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSearchResults(data.results);
    } catch (error) {
      console.error('Error searching documentation:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search result click
  const handleSearchResultClick = (result: SearchResult) => {
    // Find the doc by title or path
    const doc = documentFiles.find(d => d.title === result.title || d.path === result.file_path);
    if (doc) {
      setSearchQuery(''); // Clear search
      setSearchResults([]);
      loadDocument(doc.name);
    } else {
      console.log('No matching document found for search result:', result);
      console.log('Available documents:', documentFiles.map(d => ({ name: d.name, title: d.title, path: d.path })));
    }
  };

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


  const loadCategory = (category: string) => {
    setSelectedCategory(category);
    setSelectedDoc(null);
    setContent('');
    // Clear search when navigating to category
    setSearchQuery('');
    setSearchResults([]);
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
      id: 'planning',
      title: 'Planning',
      description: 'Project roadmap and documentation standards',
      icon: 'planning' as const,
      isDisabled: false,
      onClick: () => loadCategory('Planning')
    },
    {
      id: 'tutorial',
      title: 'Tutorial',
      description: 'User guides and feature tutorials',
      icon: 'compass' as const,
      isDisabled: false,
      onClick: () => loadCategory('Tutorial')
    },
    {
      id: 'user-interface',
      title: 'User Interface',
      description: 'Interactions, drag-and-drop, and customization',
      icon: 'component' as const,
      isDisabled: false,
      onClick: () => loadCategory('User Interface')
    },
    {
      id: 'component-architecture',
      title: 'Component Architecture',
      description: 'UI patterns and React component design',
      icon: 'component' as const,
      isDisabled: false,
      onClick: () => loadCategory('Component Architecture')
    },
    {
      id: 'data-management',
      title: 'Data Management',
      description: 'Data models, schemas, and edit systems',
      icon: 'component' as const,
      isDisabled: false,
      onClick: () => loadCategory('Data Management')
    },
    {
      id: 'system-architecture',
      title: 'System Architecture',
      description: 'Infrastructure, performance, and core systems',
      icon: 'component' as const,
      isDisabled: false,
      onClick: () => loadCategory('System Architecture')
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
    const doc = documentFiles.find(d => d.name === docId);
    if (!doc) return;

    setIsLoading(true);
    setSelectedDoc(docId);

    try {
      const headers: Record<string, string> = {};
      const authToken = await getToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const response = await fetch(`/api/docs/${doc.path}`, { headers });
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

  // Default overview content with enhanced navigation
  const defaultContent = (
    <VStack spacing={4} align="stretch">
      {/* Show search results if searching, otherwise show documentation overview */}
      {searchResults.length > 0 ? (
        <VStack spacing={4} align="stretch">
          {searchResults.map((result, index) => (
            <Box
              key={index}
              p={3}
              rounded="md"
              shadow="sm"
              bg="card.background"
              borderWidth="2px"
              borderColor="gray.600"
              cursor="pointer"
              _hover={{ borderColor: "orange.400" }}
              onClick={() => handleSearchResultClick(result)}
            >
              <VStack align="start" spacing={1}>
                <HStack justify="space-between" width="100%">
                  <HStack spacing={2} align="center">
                    <Box px={1} pt="2px">
                      <AppIcon 
                        name={documentFiles.find(d => d.name === result.title)?.icon || 'docs'} 
                        boxSize="14px" 
                      />
                    </Box>
                    <Text fontSize="sm" color="white" textTransform="uppercase" fontWeight="bold">
                      {result.category}
                    </Text>
                    <Text fontSize="sm" color="cardText" fontWeight="bold">
                      •
                    </Text>
                    <Text fontWeight="medium" fontSize="sm" color="cardText">
                      {result.title}
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.400">
                    {result.relevance_score.toFixed(1)}
                  </Text>
                </HStack>
                {result.snippet && (
                  <Text fontSize="xs" color="cardText" opacity={0.8} noOfLines={2} ml={6}>
                    {result.snippet}
                  </Text>
                )}
              </VStack>
            </Box>
          ))}
        </VStack>
      ) : isLoadingDocs ? (
        <Text>Loading documentation...</Text>
      ) : (
        groupAndSortDocuments(
          documentFiles, 
          quickAccessItems.map(item => item.title)
        ).map(([category, docs]) => (
          <DocumentCard
            key={category}
            category={category}
            documents={docs}
            onCategoryClick={loadCategory}
            onDocumentClick={loadDocument}
          />
        ))
      )}
    </VStack>
  );

  // Category view content
  const categoryContent = selectedCategory ? (
    <CategoryDocumentList
      category={selectedCategory}
      documents={getDocumentsForCategory(documentFiles, selectedCategory)}
      categoryIcon={getCategoryIcon(selectedCategory)}
      onDocumentClick={loadDocument}
      onBackToOverview={() => {
        setSelectedCategory(null);
        setSelectedDoc(null);
      }}
    />
  ) : null;

  // Search UI component  
  const searchUI = (
    <HStack spacing={2}>
        <Input
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          if (!e.target.value.trim()) {
            setSearchResults([]);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSearch(searchQuery);
          } else if (e.key === 'Escape') {
            setSearchQuery('');
            setSearchResults([]);
          }
        }}
        size="xs"
        width={{ base: "125px", md: "150px", lg: "200px" }}
        borderRadius="md"
        borderColor="gray.700"
        _hover={{ borderColor: "container.border" }}
      />
      <Button
        size="xs"
        bg="blue.400"
        color="white"
        _hover={{ bg: 'orange.400' }}
        _active={{ bg: 'orange.400' }}
        onClick={() => handleSearch(searchQuery)}
        isDisabled={!searchQuery.trim()}
        isLoading={isSearching}
      >
        Search
      </Button>
    </HStack>
  );


  // Selected document content
  const selectedContent = selectedDoc ? (
    <VStack spacing={0} align="stretch" height="100%">
      {isLoading ? (
        <VStack spacing={4}>
          <AppIcon name="docs" boxSize="32px" />
          <Text>Loading documentation...</Text>
        </VStack>
      ) : (
        <>
          {/* Sticky Header */}
          <Box position="sticky" top={0} bg="page.background" zIndex={10} pb="4px">
            <VStack spacing={4} align="stretch">
              <HStack spacing={3} align="center" justify="space-between">
                <HStack spacing={3} align="center">
                  <AppIcon name={documentFiles.find(doc => doc.name === selectedDoc)?.icon || 'docs'} boxSize="24px" />
                  <Text fontWeight="semibold" fontSize="lg">{selectedDoc}</Text>
                </HStack>
                <Button
                  size="xs"
                  variant="outline"
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
              <Divider />
            </VStack>
          </Box>
          
          {/* Scrollable Content */}
          <Box flex={1} overflowY="auto" className="hide-scrollbar">
            <Card>
              <CardBody>
                <Box>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {content}
                  </ReactMarkdown>
                </Box>
              </CardBody>
            </Card>
          </Box>
        </>
      )}
    </VStack>
  ) : null;

  // Dynamic page title with search results count
  const pageTitle = searchResults.length > 0 
    ? `Documentation • ${searchResults.length} Result${searchResults.length !== 1 ? 's' : ''}`
    : "Documentation";

  return (
    <ErrorBoundary context="Documentation Page">
      <BaseUtilityPage
        pageTitle={pageTitle}
        pageIcon="docs"
        defaultContent={defaultContent}
        selectedContent={selectedDoc ? selectedContent : categoryContent}
        quickAccessItems={quickAccessItems}
        activeItemId={selectedCategory ? selectedCategory.toLowerCase().replace(' ', '-') : undefined}
        headerActions={searchUI}
        isMenuOpen={isMenuOpen}
        onMenuClose={onMenuClose}
      />
    </ErrorBoundary>
  );
};
