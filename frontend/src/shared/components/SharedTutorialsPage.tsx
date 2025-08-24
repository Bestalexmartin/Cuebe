// frontend/src/shared/components/SharedTutorialsPage.tsx
import React, { useState } from 'react';
import {
  Flex,
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Divider,
  Card,
  CardBody,
  Heading,
} from '@chakra-ui/react';
import { AppIcon } from '../../components/AppIcon';
import { ScopedMarkdownRenderer } from './ScopedMarkdownRenderer';

// Scoped side tutorial implementation - independent from Auth side
interface SharedTutorialsPageProps {
  shareToken?: string;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: any[];
  isSearching: boolean;
  hasSearched: boolean;
  handleSearch: (query: string, onClearState?: () => void) => void;
  clearSearch: () => void;
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

export const SharedTutorialsPage: React.FC<SharedTutorialsPageProps> = ({
  shareToken, 
  onClose: _onClose, 
  searchQuery: _searchQuery, 
  setSearchQuery: _setSearchQuery, 
  searchResults, 
  isSearching: _isSearching, 
  hasSearched, 
  handleSearch: _handleSearch, 
  clearSearch 
}) => {
  const [selectedTutorial, setSelectedTutorial] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [tutorialFiles] = useState(SCOPED_TUTORIAL_FILES);


  const handleSearchResultClick = (result: any) => {
    const file = tutorialFiles.find(f => f.name === result.title || f.path === result.file_path);
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


  return (
    <Flex
      gap="8"
      height="100%"
      flexDirection={{ base: 'column', lg: 'row' }}
      minHeight={0} // Important for flex items to shrink
    >
        {/* Left Main Content */}
        <Box
          flex="1"
          display="flex"
          flexDirection="column"
          minHeight={0} // Important for flex items to shrink
        >
          
          <Box
            border="1px solid"
            borderColor="container.border"
            p="4"
            borderRadius="md"
            flexGrow={1}
            overflowY="auto"
            className="hide-scrollbar edit-form-container"
            minHeight={0} // Important for flex items to shrink
          >
            {selectedTutorial ? (
              // Selected tutorial content
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
                            <AppIcon name={(tutorialFiles.find(t => t.name === selectedTutorial)?.icon as any) || 'compass'} boxSize="24px" />
                            <Text fontWeight="semibold" fontSize="lg">{selectedTutorial}</Text>
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
                        </HStack>
                        <Divider />
                      </VStack>
                    </Box>
                    
                    {/* Scrollable Content */}
                    <Box flex={1} overflowY="auto" className="hide-scrollbar">
                      <Card>
                        <CardBody>
                          <ScopedMarkdownRenderer content={content} />
                        </CardBody>
                      </Card>
                    </Box>
                  </>
                )}
              </VStack>
            ) : (
              // Default content - search results or category overview
              <VStack spacing={4} align="stretch">
                {hasSearched ? (
                  // Search results using DocumentSearchUI pattern
                  searchResults.length === 0 ? (
                    <VStack spacing={4} align="center" py={8}>
                      <AppIcon name="warning" boxSize="48px" color="gray.400" />
                      <VStack spacing={2} align="center">
                        <Text fontSize="lg" fontWeight="medium" color="cardText">
                          No results found
                        </Text>
                        <Text fontSize="sm" color="gray.400" textAlign="center" maxW="400px">
                          Try different search terms or check the spelling. You can also browse by category using the menu to the right.
                        </Text>
                      </VStack>
                    </VStack>
                  ) : (
                    <>
                      <VStack spacing={4} align="stretch">
                        {searchResults.map((result, idx) => (
                          <Box
                            key={idx}
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
                                      name={(tutorialFiles.find(f => f.name === result.title)?.icon as any) || 'docs'} 
                                      boxSize="14px" 
                                    />
                                  </Box>
                                  <Text fontSize="sm" color="white" textTransform="uppercase" fontWeight="bold">
                                    {result.category || 'Tutorial'}
                                  </Text>
                                  <Text fontSize="sm" color="cardText" fontWeight="bold">
                                    •
                                  </Text>
                                  <Text fontWeight="medium" fontSize="sm" color="cardText">
                                    {result.title}
                                  </Text>
                                </HStack>
                                {result.relevance_score && (
                                  <Text fontSize="xs" color="gray.400">
                                    {result.relevance_score.toFixed(1)}
                                  </Text>
                                )}
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
                    </>
                  )
                ) : selectedCategory ? (
                  // Category view content  
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
                          clearSearch();
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
                          <AppIcon name={tutorial.icon as any} boxSize="21px" />
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
                  // Default overview content - matches auth side
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
                                  <AppIcon name={tutorial.icon as any} boxSize="21px" />
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
            )}
          </Box>
        </Box>

        {/* Right QuickAccess Panel - Desktop Only - matches BaseUtilityPage exactly */}
        <Box
          width={{ base: '0', lg: '330px' }}
          minWidth={{ base: '0', lg: '330px' }}
          display={{ base: 'none', lg: 'flex' }}
          flexDirection="column"
          flexShrink={0}
          minHeight={0} // Important for flex items to shrink
        >
          <Box
            border="1px solid"
            borderColor="container.border"
            p="4"
            borderRadius="md"
            height="fit-content" // Shrink to fit content
            maxHeight="100%" // Don't exceed available height
            overflowY="auto" // Allow scrolling when content exceeds max height
            className="hide-scrollbar"
          >
            <VStack spacing={4} align="stretch">
              {quickAccessItems.map((item) => (
                <Box
                  key={item.id}
                  borderWidth="2px"
                  borderRadius="md"
                  p="4"
                  shadow="sm"
                  bg="card.background"
                  cursor="pointer"
                  borderColor="gray.600"
                  _hover={{ borderColor: "orange.400" }}
                  onClick={item.onClick}
                >
                  <HStack spacing="2" align="center" mb="2">
                    <AppIcon name={item.icon} boxSize="14px" />
                    <Heading size="xs" textTransform="uppercase">
                      {item.title}
                    </Heading>
                  </HStack>
                  <Text fontSize="sm" color="cardText" mb="-1">
                    {item.description}
                  </Text>
                </Box>
              ))}
            </VStack>
          </Box>
        </Box>
      </Flex>
  );
};
