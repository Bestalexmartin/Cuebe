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
  Divider
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
            {/* Shows header */}
            {!viewingScriptId && (
              <Flex justify="space-between" align="center" flexShrink={0} mb={4}>
                <HStack spacing="2" align="center">
                  <AppIcon name="show" boxSize="25px" />
                  <Heading as="h2" size="md">Shows</Heading>
                </HStack>
                <HStack spacing="2">
                  <SortMenu
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    sortOptions={SHOWS_SORT_OPTIONS}
                    onSortClick={handleSortClick}
                  />
                  <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />
                  <Button
                    bg="blue.400"
                    color="white"
                    size="xs"
                    _hover={{ bg: 'orange.400' }}
                  >
                    Utilities
                  </Button>
                </HStack>
              </Flex>
            )}

            {/* Script View Mode */}
            {viewingScriptId ? (
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
