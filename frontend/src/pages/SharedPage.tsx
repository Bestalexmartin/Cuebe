// frontend/src/pages/SharedPage.tsx

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  IconButton,
  HStack,
  Button,
  useColorModeValue,
  useColorMode,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  VStack,
  Text,
  Badge
} from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { encodeShareToken } from '../utils/tokenValidation';
import { useEnhancedToast } from '../utils/toastUtils';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ViewMode } from '../features/script/components/modes/ViewMode';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useSharedData } from '../hooks/useSharedData';
import { useScriptViewing } from '../hooks/useScriptViewing';
import { useSorting } from '../hooks/useSorting';
import { ScriptHeader } from '../components/shared/ScriptHeader';
import { ShowsList } from '../components/shared/ShowsList';
import { LoadingSpinner, ErrorState, ScriptLoadingState } from '../components/shared/LoadingStates';
import { SortMenu, SortOption } from '../components/shared/SortMenu';
import { SharedPageHeader } from '../components/shared/SharedPageHeader';
import { TutorialsPage } from './TutorialsPage';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
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
  Td
} from '@chakra-ui/react';

// Independent Scoped-side MarkdownRenderer (duplicated from Auth side for architectural separation)
const ScopedMarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
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

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
};

// Scoped side tutorial implementation - independent from Auth side
interface SharedTutorialsPageProps {
  shareToken?: string;
  onClose: () => void;
}

// Static tutorial file structure for Scoped side (independent of Auth side)
const SCOPED_TUTORIAL_FILES = [
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

const SharedTutorialsPage: React.FC<SharedTutorialsPageProps> = ({ shareToken, onClose }) => {
  const [selectedTutorial, setSelectedTutorial] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [tutorialFiles] = useState(SCOPED_TUTORIAL_FILES);
  
  // Scoped side search implementation
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (query: string, onClearState?: () => void) => {
    if (!query.trim() || !shareToken) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    if (onClearState) {
      onClearState();
    }

    setIsSearching(true);
    
    try {
      const response = await fetch(`/api/shared/${shareToken}/tutorials/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSearchResults(data.results || []);
      setHasSearched(true);
    } catch (error) {
      console.error('Error searching shared tutorials:', error);
      setSearchResults([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const clearPageState = () => {
    setSelectedTutorial(null);
    setSelectedCategory(null);
    setContent('');
  };

  const handleSearchResultClick = (result: any) => {
    const file = tutorialFiles.find(f => f.name === result.title || f.path === result.file_path || f.title === result.title);
    if (file) {
      clearSearch();
      loadTutorial(file.name);
    }
  };

  const loadCategory = (category: string) => {
    setSelectedCategory(category);
    setSelectedTutorial(null);
    setContent('');
    clearSearch();
  };

  const loadTutorial = async (tutorialId: string) => {
    const tutorial = tutorialFiles.find(t => t.name === tutorialId);
    if (!tutorial || !shareToken) return;

    setIsLoading(true);
    setSelectedTutorial(tutorialId);
    clearSearch();

    try {
      const response = await fetch(`/api/shared/${shareToken}/tutorials/${tutorial.path}`);
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
- Check your internet connection
- Ensure the share link is still valid
- Try refreshing the page

**Alternative:** Contact the person who shared this link with you for assistance.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Access items for Scoped side tutorials
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

  // Group tutorials by category
  const groupTutorialsByCategory = () => {
    const grouped: { [key: string]: typeof SCOPED_TUTORIAL_FILES } = {};
    tutorialFiles.forEach(tutorial => {
      if (!grouped[tutorial.category]) {
        grouped[tutorial.category] = [];
      }
      grouped[tutorial.category].push(tutorial);
    });
    return grouped;
  };

  // Search UI component
  const searchUI = (
    <Box width="300px">
      <HStack>
        <Box position="relative" flex="1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch(searchQuery, clearPageState);
              }
            }}
            placeholder="Search tutorials..."
            style={{
              width: '100%',
              padding: '6px 32px 6px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <Box
            position="absolute"
            right="8px"
            top="50%"
            transform="translateY(-50%)"
            cursor="pointer"
            onClick={() => handleSearch(searchQuery, clearPageState)}
          >
            {isSearching ? (
              <AppIcon name="compass" boxSize="16px" />
            ) : (
              <AppIcon name="compass" boxSize="16px" />
            )}
          </Box>
        </Box>
        {searchQuery && (
          <Button
            size="xs"
            variant="ghost"
            onClick={clearSearch}
          >
            Clear
          </Button>
        )}
      </HStack>
    </Box>
  );

  return (
    <Box height="100%">
      {/* Search Bar */}
      <Box mb={4} display="flex" justifyContent="flex-end">
        {searchUI}
      </Box>

      {/* Main Content */}
      <Box 
        border="1px solid"
        borderColor="container.border"
        borderRadius="md"
        height="calc(100% - 60px)"
        overflow="hidden"
        display="flex"
        flexDirection="column"
      >
        {selectedTutorial ? (
          // Selected tutorial content
          <Box height="100%" display="flex" flexDirection="column">
            {isLoading ? (
              <VStack spacing={4} p={8}>
                <AppIcon name="compass" boxSize="32px" />
                <Text>Loading tutorial...</Text>
              </VStack>
            ) : (
              <>
                {/* Sticky Header */}
                <Box bg="page.background" p={4} borderBottom="1px solid" borderColor="container.border">
                  <Flex justify="space-between" align="center">
                    <HStack spacing={3}>
                      <AppIcon name={tutorialFiles.find(t => t.name === selectedTutorial)?.icon || 'compass'} boxSize="24px" />
                      <Heading size="md">{selectedTutorial}</Heading>
                    </HStack>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        if (selectedCategory) {
                          setSelectedTutorial(null);
                          clearSearch();
                        } else {
                          setSelectedTutorial(null);
                          setSelectedCategory(null);
                          clearSearch();
                        }
                      }}
                    >
                      {selectedCategory ? `Back to ${selectedCategory}` : 'Back to All Tutorials'}
                    </Button>
                  </Flex>
                </Box>
                
                {/* Scrollable Content */}
                <Box flex={1} overflowY="auto" p={6} className="hide-scrollbar">
                  <ScopedMarkdownRenderer content={content} />
                </Box>
              </>
            )}
          </Box>
        ) : (
          // Tutorial overview or search results
          <Box p={6} height="100%" overflowY="auto" className="hide-scrollbar">
            {hasSearched ? (
              // Search results
              <VStack spacing={4} align="stretch">
                <Text fontWeight="semibold">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                </Text>
                {searchResults.map((result, idx) => (
                  <Box
                    key={idx}
                    p={4}
                    border="1px solid"
                    borderColor="gray.600"
                    borderRadius="md"
                    cursor="pointer"
                    _hover={{ borderColor: "orange.400" }}
                    onClick={() => handleSearchResultClick(result)}
                  >
                    <Text fontWeight="medium" mb={2}>{result.title}</Text>
                    <Text fontSize="sm" color="gray.600" noOfLines={2}>
                      {result.snippet}
                    </Text>
                  </Box>
                ))}
                {searchResults.length === 0 && (
                  <Text color="gray.600">No tutorials found matching your search.</Text>
                )}
              </VStack>
            ) : selectedCategory ? (
              // Category view
              <VStack spacing={4} align="stretch">
                <Flex justify="space-between" align="center">
                  <Badge colorScheme="blue" fontSize="sm" px={2} py={1}>
                    {selectedCategory}
                  </Badge>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedTutorial(null);
                      clearSearch();
                    }}
                  >
                    Back to All Tutorials
                  </Button>
                </Flex>
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
            ) : (
              // Tutorial overview
              <VStack spacing={4} align="stretch">
                {Object.entries(groupTutorialsByCategory()).map(([category, tutorials]) => (
                  <Box
                    key={category}
                    border="1px solid"
                    borderColor="gray.600"
                    borderRadius="md"
                    p={4}
                    cursor="pointer"
                    _hover={{ borderColor: "orange.400" }}
                    onClick={() => loadCategory(category)}
                  >
                    <VStack align="stretch" spacing={3}>
                      <HStack spacing={4}>
                        <Badge colorScheme="blue" fontSize="sm" px={2} py={1}>
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
                  </Box>
                ))}
              </VStack>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

const SHOWS_SORT_OPTIONS: SortOption[] = [
  { value: 'show_name', label: 'Name' },
  { value: 'show_date', label: 'Show Date' },
  { value: 'date_created', label: 'Created' },
  { value: 'date_updated', label: 'Updated' },
];

const GuestDarkModeSwitch: React.FC<{ shareToken?: string }> = ({ shareToken }) => {
  const [guestDarkMode, setGuestDarkMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { setColorMode } = useColorMode();
  const { showError } = useEnhancedToast();

  // Load guest preferences on mount
  useEffect(() => {
    const loadGuestPreferences = async () => {
      if (!shareToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/shared/${encodeShareToken(shareToken)}/preferences`);
        if (response.ok) {
          const preferences = await response.json();
          const isDark = preferences.dark_mode || false;
          setGuestDarkMode(isDark);
          setColorMode(isDark ? 'dark' : 'light');
        } else {
          console.warn('Failed to load guest preferences, using defaults');
          setGuestDarkMode(false);
          setColorMode('light');
        }
      } catch (error) {
        console.error('Error loading guest preferences:', error);
        setGuestDarkMode(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadGuestPreferences();
  }, [shareToken]);

  const toggleGuestDarkMode = async () => {
    if (!shareToken) return;

    const newDarkMode = !guestDarkMode;
    
    // Optimistic update
    setGuestDarkMode(newDarkMode);
    setColorMode(newDarkMode ? 'dark' : 'light');

    try {
      const response = await fetch(`/api/shared/${encodeShareToken(shareToken)}/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dark_mode: newDarkMode })
      });

      if (response.ok) {
        const updatedPreferences = await response.json();
        const serverDarkMode = updatedPreferences.dark_mode;
        setGuestDarkMode(serverDarkMode);
        setColorMode(serverDarkMode ? 'dark' : 'light');
      } else {
        // Revert on error
        setGuestDarkMode(!newDarkMode);
        setColorMode(!newDarkMode ? 'dark' : 'light');
        showError('Failed to save dark mode preference');
      }
    } catch (error) {
      // Revert on error
      setGuestDarkMode(!newDarkMode);
      setColorMode(!newDarkMode ? 'dark' : 'light');
      showError('Failed to save dark mode preference');
      console.error('Error updating guest dark mode:', error);
    }
  };

  if (isLoading) {
    return (
      <IconButton
        aria-label="Toggle dark mode"
        icon={<AppIcon name="moon" />}
        variant="ghost"
        isRound={true}
        size="md"
        isDisabled={true}
        _focus={{ boxShadow: 'none' }}
        _hover={{ bg: "transparent", color: "initial" }}
      />
    );
  }

  return (
    <IconButton
      aria-label="Toggle dark mode"
      icon={<AppIcon name={guestDarkMode ? 'sun' : 'moon'} />}
      onClick={toggleGuestDarkMode}
      variant="ghost"
      isRound={true}
      size="md"
      _focus={{ boxShadow: 'none' }}
      _hover={{ bg: "transparent", color: "initial" }}
    />
  );
};

export const SharedPage = React.memo(() => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [showTutorials, setShowTutorials] = useState<boolean>(false);

  // Custom hooks
  const { sharedData, isLoading, error } = useSharedData(shareToken);
  const {
    viewingScriptId,
    scriptElements,
    isLoadingScript,
    scriptError,
    crewContext,
    handleScriptClick,
    handleBackToShows,
  } = useScriptViewing(shareToken);
  const { sortBy, sortDirection, sortedShows, handleSortClick } = useSorting(sharedData);

  const bgColor = useColorModeValue('gray.50', 'gray.900');

  // Get user preferences for script viewing
  const {
    preferences: { colorizeDepNames, showClockTimes }
  } = useUserPreferences();

  const handleShowClick = useCallback((showId: string) => {
    setSelectedShowId(prevId => prevId === showId ? null : showId);
  }, []);

  const currentScript = useMemo(() => {
    if (!viewingScriptId || !sharedData?.shows) return null;
    return sharedData.shows
      .flatMap(show => show.scripts)
      .find(script => script.script_id === viewingScriptId) || null;
  }, [viewingScriptId, sharedData?.shows]);

  if (isLoading) {
    return <LoadingSpinner bgColor={bgColor} />;
  }

  if (error || !sharedData) {
    return <ErrorState bgColor={bgColor} error={error || 'Content Not Available'} />;
  }

  return (
    <ErrorBoundary context="Shared Page">
      <Box
        display="grid"
        gridTemplateRows="auto 1fr"
        height="100vh"
        width="100vw"
        overflow="hidden"
        bg={bgColor}
      >
        {/* Header */}
        <SharedPageHeader
          userName={sharedData?.user_name}
          userProfileImage={sharedData?.user_profile_image}
        >
          <GuestDarkModeSwitch shareToken={shareToken} />
        </SharedPageHeader>

        {/* Main Content Area */}
        <Box
          as="main"
          overflow="hidden"
          display="flex"
          flexDirection="column"
          p="2rem"
        >
          <Flex direction="column" height="100%">
            {/* Header - Shows or Tutorials */}
            {!viewingScriptId && (
              <Flex justify="space-between" align="center" flexShrink={0} mb={4}>
                <HStack spacing="2" align="center">
                  <AppIcon name={showTutorials ? "compass" : "show"} boxSize="25px" />
                  <Heading as="h2" size="md">{showTutorials ? "Tutorials" : "Shows"}</Heading>
                </HStack>
                <HStack spacing="2">
                  {!showTutorials && (
                    <>
                      <SortMenu
                        sortBy={sortBy}
                        sortDirection={sortDirection}
                        sortOptions={SHOWS_SORT_OPTIONS}
                        onSortClick={handleSortClick}
                      />
                      <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />
                    </>
                  )}
                  <Menu>
                    <MenuButton
                      as={Button}
                      bg="blue.400"
                      color="white"
                      size="xs"
                      _hover={{ bg: 'orange.400' }}
                      rightIcon={<AppIcon name="openmenu" />}
                    >
                      Utilities
                    </MenuButton>
                    <MenuList>
                      {showTutorials ? (
                        <MenuItem onClick={() => setShowTutorials(false)}>
                          <AppIcon name="show" boxSize="16px" mr={2} />
                          Return to Shows
                        </MenuItem>
                      ) : (
                        <MenuItem onClick={() => setShowTutorials(true)}>
                          <AppIcon name="compass" boxSize="16px" mr={2} />
                          Tutorials
                        </MenuItem>
                      )}
                    </MenuList>
                  </Menu>
                </HStack>
              </Flex>
            )}

            {/* Content Area */}
            {showTutorials ? (
              <Box height="calc(100% - 60px)">
                <SharedTutorialsPage 
                  shareToken={shareToken}
                  onClose={() => setShowTutorials(false)}
                />
              </Box>
            ) : 
            /* Script View Mode */
            viewingScriptId ? (
              <>
                <ScriptHeader
                  currentScript={currentScript}
                  crewContext={crewContext}
                  onBackToShows={handleBackToShows}
                />

                {/* Script Content */}
                <Box
                  border="1px solid"
                  borderColor="container.border"
                  borderRadius="md"
                  flexGrow={1}
                  overflow="hidden"
                  display="flex"
                  flexDirection="column"
                >
                  <ScriptLoadingState
                    isLoading={isLoadingScript}
                    error={scriptError}
                    onBackToShows={handleBackToShows}
                  />
                  {!isLoadingScript && !scriptError && (
                    <Box
                      flex={1}
                      p="4"
                      overflowY="auto"
                      className="hide-scrollbar"
                      minHeight={0}
                      maxHeight="100%"
                    >
                      <ViewMode
                        scriptId={viewingScriptId}
                        colorizeDepNames={colorizeDepNames}
                        showClockTimes={showClockTimes}
                        autoSortCues={true}
                        elements={scriptElements}
                        allElements={scriptElements}
                        script={currentScript}
                      />
                    </Box>
                  )}
                </Box>
              </>
            ) : (
              <>
                <Box
                  border="1px solid"
                  borderColor="container.border"
                  p="4"
                  borderRadius="md"
                  flexGrow={1}
                  overflowY="auto"
                  className="hide-scrollbar"
                >
                  <ShowsList
                    sortedShows={sortedShows}
                    selectedShowId={selectedShowId}
                    hoveredCardId={hoveredCardId}
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    sharedData={sharedData}
                    onShowHover={setHoveredCardId}
                    onShowClick={handleShowClick}
                    onScriptClick={handleScriptClick}
                  />
                </Box>
              </>
            )}
          </Flex>
        </Box>
      </Box>
    </ErrorBoundary>
  );
});
