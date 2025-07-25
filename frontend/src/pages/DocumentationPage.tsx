import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  CardBody,
  Flex,
  useColorModeValue,
  Link,
  Button,
  Divider
} from '@chakra-ui/react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { UnifiedPageLayout } from '../components/layout/UnifiedPageLayout';
import { AppIcon } from '../components/AppIcon';

interface DocFile {
  name: string;
  path: string;
  description: string;
  category: 'Quick Start' | 'Architecture' | 'Testing' | 'Archive';
  icon: string;
}

const DOCUMENTATION_FILES: DocFile[] = [
  {
    name: 'Development Guide',
    path: '/docs/development-guide.md',
    description: 'Quick start guide for developers with setup, workflow, and best practices',
    category: 'Quick Start',
    icon: 'compass'
  },
  {
    name: 'Documentation Overview',
    path: '/docs/README.md',
    description: 'Main documentation index and navigation guide',
    category: 'Quick Start',
    icon: 'docs'
  },
  {
    name: 'Component Architecture',
    path: '/docs/architecture/component-architecture.md',
    description: 'BaseCard/BaseModal patterns and implementation guide',
    category: 'Architecture',
    icon: 'component'
  },
  {
    name: 'Performance Optimizations',
    path: '/docs/architecture/performance-optimizations.md',
    description: 'React.memo implementation and performance monitoring',
    category: 'Architecture',
    icon: 'performance'
  },
  {
    name: 'Error Handling',
    path: '/docs/architecture/error-handling.md',
    description: 'Error boundaries, validation, and recovery strategies',
    category: 'Architecture',
    icon: 'warning'
  },
  {
    name: 'Documentation Integration',
    path: '/docs/architecture/documentation-integration.md',
    description: 'How documentation is integrated into the application',
    category: 'Architecture',
    icon: 'docs'
  },
  {
    name: 'Testing Tools Guide',
    path: '/docs/testing/testing-tools-guide.md',
    description: 'Comprehensive testing suite documentation and usage',
    category: 'Testing',
    icon: 'test'
  },
  {
    name: 'Codebase Improvements Archive',
    path: '/docs/archive/codebase-improvements-archive.md',
    description: 'Complete record of major refactoring and optimizations',
    category: 'Archive',
    icon: 'archive'
  }
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Quick Start': return 'green';
    case 'Architecture': return 'blue';
    case 'Testing': return 'orange';
    case 'Archive': return 'purple';
    default: return 'gray';
  }
};


interface DocumentationPageProps {
  isMenuOpen: boolean;
  onMenuClose: () => void;
}

export const DocumentationPage: React.FC<DocumentationPageProps> = ({ isMenuOpen, onMenuClose }) => {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const cardBg = useColorModeValue('white', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.600');

  const loadDocument = async (docId: string) => {
    const doc = DOCUMENTATION_FILES.find(d => d.name === docId);
    if (!doc) return;

    setIsLoading(true);
    setSelectedDoc(docId);

    try {
      // Since we can't directly fetch local files in development,
      // we'll show the file path and description for now
      setContent(`# ${doc.name}

This document is located at: \`${doc.path}\`

${doc.description}

---

**To view the full content:**
1. Navigate to the file path shown above in your project
2. Open the markdown file in your editor or viewer
3. Or implement a markdown rendering service in your backend

**Available Documents:**
${DOCUMENTATION_FILES.map(file => `- **${file.name}**: ${file.description}`).join('\n')}
`);
    } catch (error) {
      setContent(`# Error Loading Document

Unable to load ${doc.name}. Please check the file path: \`${doc.path}\`

This is expected in the current setup. To enable full markdown rendering, you would need to:

1. **Backend Integration**: Add an API endpoint to serve markdown files
2. **Markdown Parser**: Install a markdown parsing library (like react-markdown)
3. **File Serving**: Configure your backend to serve files from the docs directory

For now, you can access these files directly in your project at the paths shown.`);
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
                <Badge colorScheme={getCategoryColor(category)} size="sm">
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
                <HStack spacing={3}>
                  <AppIcon name="docs" boxSize="24px" color="blue.400" />
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="semibold">{selectedDoc}</Text>
                    <Text fontSize="sm" color="gray.500">
                      Documentation File
                    </Text>
                  </VStack>
                </HStack>
                <Divider />
                <Box>
                  <Text whiteSpace="pre-line" fontFamily="mono" fontSize="sm">
                    {content}
                  </Text>
                </Box>
                <Divider />
                <HStack spacing={4}>
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<AppIcon name="api-docs" boxSize="14px" />}
                    onClick={() => setSelectedDoc(null)}
                  >
                    Back to Overview
                  </Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </>
      )}
    </VStack>
  ) : null;

  // Quick Access items for documentation categories
  const quickAccessItems = [
    {
      id: 'quick-start',
      title: 'Quick Start',
      description: 'Development guide and documentation overview',
      icon: 'compass' as const,
      isDisabled: false,
      onClick: () => loadDocument('Development Guide')
    },
    {
      id: 'architecture',
      title: 'Architecture',
      description: 'Component patterns and performance guides',
      icon: 'component' as const,
      isDisabled: false,
      onClick: () => loadDocument('Component Architecture')
    },
    {
      id: 'testing',
      title: 'Testing',
      description: 'Testing tools and strategies',
      icon: 'test' as const,
      isDisabled: false,
      onClick: () => loadDocument('Testing Tools Guide')
    },
    {
      id: 'archive',
      title: 'Archive',
      description: 'Project history and improvements',
      icon: 'archive' as const,
      isDisabled: false,
      onClick: () => loadDocument('Codebase Improvements Archive')
    }
  ];

  return (
    <ErrorBoundary context="Documentation Page">
      <UnifiedPageLayout
        pageTitle="Documentation"
        pageIcon="docs"
        defaultContent={defaultContent}
        selectedContent={selectedContent}
        quickAccessItems={quickAccessItems}
        activeItemId={selectedDoc || undefined}
        isMenuOpen={isMenuOpen}
        onMenuClose={onMenuClose}
      />
    </ErrorBoundary>
  );
};