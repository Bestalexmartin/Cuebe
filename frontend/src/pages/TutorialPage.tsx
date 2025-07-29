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
  AlertDescription
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

  const loadFeatureTutorial = async () => {
    setSelectedTutorial('features');
    setIsLoading(true);
    try {
      const response = await fetch('/api/docs/tutorial/feature-tutorial.mc');
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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
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
      onClick: loadFeatureTutorial
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