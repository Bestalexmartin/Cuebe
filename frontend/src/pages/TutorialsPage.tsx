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
  Divider
} from '@chakra-ui/react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { BaseUtilityPage } from '../components/base/BaseUtilityPage';
import { AppIcon } from '../components/AppIcon';
import { DocumentSearchUI } from '../components/shared/DocumentSearchUI';
import { SearchInput } from '../components/shared/SearchInput';
import { MarkdownRenderer } from '../components/shared/MarkdownRenderer';
import { useDocumentSearch } from '../hooks/useDocumentSearch';
import { useAuth } from '@clerk/clerk-react';
import { authTutorialCache } from '../utils/tutorialCache';
import { getApiUrl } from '../config/api';

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


export const TutorialsPage: React.FC<TutorialPageProps> = ({ isMenuOpen, onMenuClose }) => {
  const [selectedTutorial, setSelectedTutorial] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [tutorialFiles] = useState<TutorialFile[]>(TUTORIAL_FILES);
  
  // Use the shared search hook
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    hasSearched,
    handleSearch,
    clearSearch,
    handleSearchResultClick
  } = useDocumentSearch('tutorial');

  // Clear state function to reset selected docs/categories when searching
  const clearPageState = () => {
    setSelectedTutorial(null);
    setSelectedCategory(null);
    setContent('');
  };


  const { getToken, userId } = useAuth();



  const loadCategory = (category: string) => {
    setSelectedCategory(category);
    setSelectedTutorial(null);
    setContent('');
    // Clear search when navigating to category
    clearSearch();
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
    if (!tutorial || !userId) return;

    setIsLoading(true);
    setSelectedTutorial(tutorialId);
    // Clear search when navigating to tutorial
    clearSearch();

    try {
      // Check cache first
      const cachedContent = authTutorialCache.get(userId, tutorial.path);
      if (cachedContent) {
        setContent(cachedContent);
        setIsLoading(false);
        return;
      }

      // Fetch from server with caching headers
      const headers: Record<string, string> = {
        'Cache-Control': 'public, max-age=3600' // 1 hour browser cache
      };
      const authToken = await getToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(getApiUrl(`/api/tutorials/${tutorial.path}`), { headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.content;
      
      // Cache the content
      authTutorialCache.set(userId, tutorial.path, content);
      setContent(content);
    } catch (error) {
      const errorContent = `# Error Loading Tutorial

Unable to load **${tutorial.name}** from \`${tutorial.path}\`

**Error details:**
${error instanceof Error ? error.message : 'Unknown error occurred'}

**Troubleshooting:**
- Ensure the backend server is running
- Check that the file exists at the specified path
- Verify API endpoint is accessible at \`/api/tutorials/${tutorial.path}\`

**Alternative:** You can access this file directly in your project at: \`tutorials/${tutorial.path}\``;
      
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

  // Default overview content
  const defaultContent = (
    <VStack spacing={4} align="stretch">
      {/* Show search results if user has performed a search, otherwise show tutorial overview */}
      {hasSearched ? (
        <DocumentSearchUI
          searchResults={searchResults}
          onResultClick={(result) => handleSearchResultClick(result, tutorialFiles, loadTutorial)}
          files={tutorialFiles}
        />
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
  ) : null;

  // Search UI component  
  const searchUI = (
    <SearchInput
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      isSearching={isSearching}
      onSearch={(query) => handleSearch(query, clearPageState)}
      onClearSearch={clearSearch}
      placeholder="Search tutorials..."
    />
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
                  <AppIcon name={(tutorialFiles.find(t => t.name === selectedTutorial)?.icon as any) || 'compass'} boxSize="24px" />
                  <Text fontWeight="semibold" fontSize="lg">{selectedTutorial}</Text>
                </HStack>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    if (selectedCategory) {
                      // Go back to category view
                      setSelectedTutorial(null);
                      clearSearch();
                    } else {
                      // Go back to overview
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
                <MarkdownRenderer content={content} />
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