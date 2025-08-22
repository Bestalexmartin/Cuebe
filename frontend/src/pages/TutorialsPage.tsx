// frontend/src/pages/TutorialsPage.tsx

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  Button,
  Badge,
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
  useColorModeValue
} from '@chakra-ui/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { BaseUtilityPage } from '../components/base/BaseUtilityPage';
import { AppIcon } from '../components/AppIcon';
import { useAuth } from '@clerk/clerk-react';

// Tutorial file structure - organized for theater professionals
const TUTORIAL_FILES: TutorialFile[] = [
  {
    name: 'Welcome to Cuebe! 🎭',
    path: 'getting-started/welcome-to-cuebe.md',
    description: 'Your introduction to digital theater production management',
    category: 'Getting Started',
    icon: 'compass'
  },
  {
    name: 'Understanding Your Production Elements',
    path: 'workflows/production-elements-guide.md',
    description: 'Learn about Shows, Scripts, Venues, Departments, and Crew',
    category: 'Core Concepts',
    icon: 'component'
  },
  {
    name: 'Your First Production Setup',
    path: 'workflows/first-production-setup.md',
    description: 'Step-by-step walkthrough of creating your first show',
    category: 'Getting Started',
    icon: 'compass'
  },
  {
    name: 'Script Collaboration Made Simple',
    path: 'features/script-collaboration.md',
    description: 'How your team works together on scripts in real-time',
    category: 'Working Together',
    icon: 'component'
  },
  {
    name: 'Getting Started - Your Questions Answered',
    path: 'faqs/getting-started-faqs.md',
    description: 'The most common questions from new Cuebe users',
    category: 'FAQs',
    icon: 'warning'
  }
];

interface TutorialFile {
  name: string;
  path: string;
  description: string;
  category: string;
  icon: string;
}

interface TutorialPageProps {
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
  content_type: string;
}

export const TutorialsPage: React.FC<TutorialPageProps> = ({ isMenuOpen, onMenuClose }) => {
  const [selectedTutorial, setSelectedTutorial] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [tutorialFiles, setTutorialFiles] = useState<TutorialFile[]>(TUTORIAL_FILES);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Chakra UI styled components for markdown
  const codeBlockBg = useColorModeValue('gray.100', 'gray.700');
  const tableBg = useColorModeValue('white', 'gray.800');
  const tableBorderColor = useColorModeValue('gray.200', 'gray.600');
  const headingColor = useColorModeValue('blue.600', 'blue.300'); // Blue for trust and comfort
  const subHeadingColor = useColorModeValue('blue.500', 'blue.400');

  const { getToken } = useAuth();

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
      // Filter to only show tutorial results
      const tutorialResults = data.results.filter((result: SearchResult) => result.content_type === 'tutorial');
      setSearchResults(tutorialResults);
    } catch (error) {
      console.error('Error searching tutorials:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search result click
  const handleSearchResultClick = (result: SearchResult) => {
    // Find the tutorial by title or path
    const tutorial = tutorialFiles.find(t => t.name === result.title || t.path === result.file_path);
    if (tutorial) {
      setSearchQuery(''); // Clear search
      setSearchResults([]);
      loadTutorial(tutorial.name);
    } else {
      console.log('No matching tutorial found for search result:', result);
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
    setSelectedTutorial(null);
    setContent('');
    // Clear search when navigating to category
    setSearchQuery('');
    setSearchResults([]);
  };

  // Quick Access items for tutorial categories
  const quickAccessItems = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'New to Cuebe? Start here!',
      icon: 'compass' as const,
      isDisabled: false,
      onClick: () => loadCategory('Getting Started')
    },
    {
      id: 'core-concepts',
      title: 'Core Concepts',
      description: 'Understanding the building blocks',
      icon: 'component' as const,
      isDisabled: false,
      onClick: () => loadCategory('Core Concepts')
    },
    {
      id: 'working-together',
      title: 'Working Together',
      description: 'Team collaboration features',
      icon: 'component' as const,
      isDisabled: false,
      onClick: () => loadCategory('Working Together')
    },
    {
      id: 'faqs',
      title: 'FAQs',
      description: 'Common questions and answers',
      icon: 'warning' as const,
      isDisabled: false,
      onClick: () => loadCategory('FAQs')
    }
  ];

  const loadTutorial = async (tutorialId: string) => {
    const tutorial = tutorialFiles.find(t => t.name === tutorialId);
    if (!tutorial) return;

    setIsLoading(true);
    setSelectedTutorial(tutorialId);

    try {
      const headers: Record<string, string> = {};
      const authToken = await getToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const response = await fetch(`/api/tutorials/${tutorial.path}`, { headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setContent(data.content);
    } catch (error) {
      setContent(`# Error Loading Tutorial

Unable to load **${tutorial.name}** from \`${tutorial.path}\`

**Error details:**
${error instanceof Error ? error.message : 'Unknown error occurred'}

**Troubleshooting:**
- Ensure the backend server is running
- Check that the file exists at the specified path
- Verify API endpoint is accessible at \`/api/tutorials/${tutorial.path}\`

**Alternative:** You can access this file directly in your project at: \`tutorials/${tutorial.path}\``);
    } finally {
      setIsLoading(false);
    }
  };

  // Group tutorials by category
  const groupTutorialsByCategory = () => {
    const grouped: { [key: string]: TutorialFile[] } = {};
    tutorialFiles.forEach(tutorial => {
      if (!grouped[tutorial.category]) {
        grouped[tutorial.category] = [];
      }
      grouped[tutorial.category].push(tutorial);
    });
    return grouped;
  };

  // Default overview content
  const defaultContent = (
    <VStack spacing={4} align="stretch">
      {/* Show search results if searching, otherwise show tutorial overview */}
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
                        name={tutorialFiles.find(t => t.name === result.title)?.icon || 'compass'} 
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
      ) : (
        Object.entries(groupTutorialsByCategory()).map(([category, tutorials]) => (
          <Card 
            key={category}
            size="sm" 
            bg="card.background"
            borderWidth="2px"
            borderRadius="md"
            shadow="sm"
            borderColor="gray.600"
            cursor="pointer"
            _hover={{ borderColor: "orange.400" }}
            onClick={() => loadCategory(category)}
          >
            <CardBody>
              <VStack align="stretch" spacing={3}>
                <HStack spacing={4}>
                  <Badge
                    colorScheme="blue"
                    fontSize="sm"
                    px={2}
                    py={1}
                  >
                    {category}
                  </Badge>
                  <Text fontWeight="semibold" fontSize="sm" color="cardText">
                    {tutorials.length} tutorial{tutorials.length > 1 ? 's' : ''}
                  </Text>
                </HStack>
                <VStack spacing={2} align="stretch">
                  {tutorials.map((tutorial) => (
                    <HStack
                      key={tutorial.name}
                      spacing={3}
                      p={2}
                      rounded="md"
                      shadow="sm"
                      bg="app.background"
                      borderWidth="2px"
                      borderColor="gray.600"
                      cursor="pointer"
                      _hover={{ borderColor: "orange.400" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        loadTutorial(tutorial.name);
                      }}
                    >
                      <Box px={2}>
                        <AppIcon name={tutorial.icon} boxSize="21px" />
                      </Box>
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontWeight="medium" fontSize="sm" color="cardText">
                          {tutorial.name}
                        </Text>
                        <Text fontSize="xs" color="cardText" noOfLines={1}>
                          {tutorial.description}
                        </Text>
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        ))
      )}
    </VStack>
  );

  // Category view content  
  const categoryContent = selectedCategory ? (
    <VStack spacing={4} align="stretch">
      <HStack spacing={3} align="center" justify="space-between">
        <Badge
          colorScheme="blue"
          fontSize="sm"
          px={2}
          py={1}
        >
          {selectedCategory}
        </Badge>
        <Button
          size="xs"
          variant="outline"
          onClick={() => {
            setSelectedCategory(null);
            setSelectedTutorial(null);
          }}
        >
          Back to All Tutorials
        </Button>
      </HStack>
      <Divider />
      {groupTutorialsByCategory()[selectedCategory]?.map((tutorial) => (
        <HStack
          key={tutorial.name}
          spacing={3}
          p={3}
          rounded="md"
          shadow="sm"
          bg="card.background"
          borderWidth="2px"
          borderColor="gray.600"
          cursor="pointer"
          _hover={{ borderColor: "orange.400" }}
          onClick={() => loadTutorial(tutorial.name)}
        >
          <Box px={2}>
            <AppIcon name={tutorial.icon} boxSize="21px" />
          </Box>
          <VStack align="start" spacing={1} flex={1}>
            <Text fontWeight="medium" fontSize="sm" color="cardText">
              {tutorial.name}
            </Text>
            <Text fontSize="xs" color="cardText" opacity={0.8}>
              {tutorial.description}
            </Text>
          </VStack>
        </HStack>
      ))}
    </VStack>
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

  // Selected tutorial content
  const selectedContent = selectedTutorial ? (
    <VStack spacing={0} align="stretch" height="100%">
      {isLoading ? (
        <VStack spacing={4}>
          <AppIcon name="compass" boxSize="32px" />
          <Text>Loading tutorial...</Text>
        </VStack>
      ) : (
        <>
          {/* Sticky Header */}
          <Box position="sticky" top={0} bg="page.background" zIndex={10} pb="4px">
            <VStack spacing={4} align="stretch">
              <HStack spacing={3} align="center" justify="space-between">
                <HStack spacing={3} align="center">
                  <AppIcon name={tutorialFiles.find(t => t.name === selectedTutorial)?.icon || 'compass'} boxSize="24px" />
                  <Text fontWeight="semibold" fontSize="lg">{selectedTutorial}</Text>
                </HStack>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    if (selectedCategory) {
                      // Go back to category view
                      setSelectedTutorial(null);
                    } else {
                      // Go back to overview
                      setSelectedTutorial(null);
                      setSelectedCategory(null);
                    }
                  }}
                >
                  {selectedCategory ? `Back to ${selectedCategory}` : 'Back to All Tutorials'}
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
    ? `Tutorials • ${searchResults.length} Result${searchResults.length !== 1 ? 's' : ''}`
    : "Tutorials";

  return (
    <ErrorBoundary context="Tutorials Page">
      <BaseUtilityPage
        pageTitle={pageTitle}
        pageIcon="compass"
        defaultContent={defaultContent}
        selectedContent={selectedTutorial ? selectedContent : categoryContent}
        quickAccessItems={quickAccessItems}
        activeItemId={selectedCategory ? selectedCategory.toLowerCase().replace(' ', '-') : undefined}
        headerActions={searchUI}
        isMenuOpen={isMenuOpen}
        onMenuClose={onMenuClose}
      />
    </ErrorBoundary>
  );
};