// frontend/src/shared/components/SharedTutorialsPage.tsx
import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Divider,
  Card,
  CardBody,
} from '@chakra-ui/react';
import { AppIcon } from '../../components/AppIcon';
import { MarkdownRenderer } from '../../components/shared/MarkdownRenderer';
import { SCOPED_TUTORIAL_FILES, TutorialFile } from '../constants/tutorialData';
import type { TutorialSearchResult } from '../hooks/useTutorialSearch';
import { tutorialCache } from '../utils/tutorialCache';
import { getApiUrl } from '../../config/api';

// Scoped side tutorial implementation - independent from Auth side
interface SharedTutorialsPageProps {
  shareToken?: string;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: TutorialSearchResult[];
  isSearching: boolean;
  hasSearched: boolean;
  handleSearch: (query: string, onClearState?: () => void) => void;
  clearSearch: () => void;
}

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


  const handleSearchResultClick = (result: TutorialSearchResult) => {
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
      // Check cache first
      const cachedContent = tutorialCache.get(shareToken, tutorial.path);
      if (cachedContent) {
        setContent(cachedContent);
        setIsLoading(false);
        return;
      }

      // Fetch from server with caching headers
      const response = await fetch(getApiUrl(`/api/shared/${shareToken}/tutorials/${tutorial.path}`), {
        headers: {
          'Cache-Control': 'public, max-age=3600' // 1 hour browser cache
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.content;
      
      // Cache the content
      tutorialCache.set(shareToken, tutorial.path, content);
      setContent(content);
    } catch (error) {
      const errorContent = `# Error Loading Tutorial

Unable to load **${tutorial.name}** from \`${tutorial.path}\`

**Error details:**
${error instanceof Error ? error.message : 'Unknown error occurred'}

**Troubleshooting:**
- Check your internet connection
- Ensure the share link is still valid
- Try refreshing the page

**Alternative:** Contact the person who shared this link with you for assistance.`;
      
      setContent(errorContent);
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


  return (
    <>
      {selectedTutorial ? (
        // Selected tutorial content
        <VStack spacing={0} align="stretch">
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
                    
                    {/* Tutorial Content */}
                    <Card>
                      <CardBody>
                        <MarkdownRenderer content={content} />
                      </CardBody>
                    </Card>
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
    </>
  );
};
