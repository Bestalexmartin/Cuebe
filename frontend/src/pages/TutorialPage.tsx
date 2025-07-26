// frontend/src/TutorialPage.tsx

import React, { useState } from 'react';
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

interface TutorialPageProps {
  isMenuOpen: boolean;
  onMenuClose: () => void;
}

export const TutorialPage: React.FC<TutorialPageProps> = ({ isMenuOpen, onMenuClose }) => {
  const [selectedTutorial, setSelectedTutorial] = useState<string | null>(null);

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

  // QuickAccess items (all disabled/stubs for now)
  const quickAccessItems = [
    {
      id: 'features',
      title: 'Feature Tutorials',
      description: 'Step-by-step guides for core features',
      icon: 'compass' as const,
      isDisabled: true,
      onClick: () => setSelectedTutorial('features')
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
        selectedContent={null} // No content selected since buttons are stubs
        quickAccessItems={quickAccessItems}
        activeItemId={selectedTutorial || undefined}
        isMenuOpen={isMenuOpen}
        onMenuClose={onMenuClose}
      />
    </ErrorBoundary>
  );
};