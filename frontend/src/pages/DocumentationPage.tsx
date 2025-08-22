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
  Divider
} from '@chakra-ui/react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { BaseUtilityPage } from '../components/base/BaseUtilityPage';
import { AppIcon } from '../components/AppIcon';
import { DocumentCard } from '../components/shared/DocumentCard';
import { CategoryDocumentList } from '../components/shared/CategoryDocumentList';
import { DocumentSearchUI } from '../components/shared/DocumentSearchUI';
import { SearchInput } from '../components/shared/SearchInput';
import { MarkdownRenderer } from '../components/shared/MarkdownRenderer';
import { DocFile, groupAndSortDocuments, getDocumentsForCategory } from '../utils/documentSorting';
import { useDocumentSearch } from '../hooks/useDocumentSearch';
import { useAuth } from '@clerk/clerk-react';




interface DocumentationPageProps {
  isMenuOpen: boolean;
  onMenuClose: () => void;
}


export const DocumentationPage: React.FC<DocumentationPageProps> = ({ isMenuOpen, onMenuClose }) => {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [documentFiles, setDocumentFiles] = useState<DocFile[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  
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
  } = useDocumentSearch('documentation');

  // Clear state function to reset selected docs/categories when searching
  const clearPageState = () => {
    setSelectedDoc(null);
    setSelectedCategory(null);
    setContent('');
  };



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
        setDocumentFiles([]);
      } finally {
        setIsLoadingDocs(false);
      }
    };

    loadDocumentationFiles();
  }, [getToken]);




  const loadCategory = (category: string) => {
    setSelectedCategory(category);
    setSelectedDoc(null);
    setContent('');
    // Clear search when navigating to category
    clearSearch();
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
    // Clear search when navigating to document
    clearSearch();

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
      {/* Show search results if user has performed a search, otherwise show documentation overview */}
      {hasSearched ? (
        <DocumentSearchUI
          searchResults={searchResults}
          onResultClick={(result) => handleSearchResultClick(result, documentFiles, loadDocument)}
          files={documentFiles}
        />
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
        clearSearch();
      }}
    />
  ) : null;

  // Search UI component  
  const searchUI = (
    <SearchInput
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      isSearching={isSearching}
      onSearch={(query) => handleSearch(query, clearPageState)}
      onClearSearch={clearSearch}
      placeholder="Search docs..."
    />
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
                      clearSearch();
                    } else {
                      // Go back to overview
                      setSelectedDoc(null);
                      setSelectedCategory(null);
                      clearSearch();
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
