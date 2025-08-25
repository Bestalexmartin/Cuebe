// frontend/src/shared/SharedPage.tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Flex,
  Heading,
  HStack,
  Button,
  useColorModeValue,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ViewMode } from '../features/script/components/modes/ViewMode';
import { useSharedData } from '../hooks/useSharedData';
import { useScriptViewing } from '../hooks/useScriptViewing';
import { useSorting } from '../hooks/useSorting';
import { ScriptHeader } from '../components/shared/ScriptHeader';
import { ShowsList } from '../components/shared/ShowsList';
import { LoadingSpinner, ErrorState, ScriptLoadingState } from '../components/shared/LoadingStates';
import { SortMenu, SortOption } from '../components/shared/SortMenu';
import { SharedPageHeader } from '../components/shared/SharedPageHeader';
import { SearchInput } from '../components/shared/SearchInput';
import { ScriptSyncIcon } from '../components/shared/ScriptSyncIcon';
import { BorderedContainer } from '../components/shared/BorderedContainer';
import { useScriptSync } from '../hooks/useScriptSync';
import { SharedTutorialsPage } from './components/SharedTutorialsPage';
import { GuestDarkModeSwitch } from './components/GuestDarkModeSwitch';
import { useTutorialSearch } from './hooks/useTutorialSearch';
import { useScriptUpdateHandlers } from './hooks/useScriptUpdateHandlers';

const SHOWS_SORT_OPTIONS: SortOption[] = [
  { value: 'show_name', label: 'Name' },
  { value: 'show_date', label: 'Show Date' },
  { value: 'date_created', label: 'Created' },
  { value: 'date_updated', label: 'Updated' },
];

export const SharedPage = React.memo(() => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [showTutorials, setShowTutorials] = useState<boolean>(false);
  const [shouldRotateSync, setShouldRotateSync] = useState(false);

  // Tutorial search - extracted to custom hook
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    hasSearched,
    handleSearch,
    clearSearch,
  } = useTutorialSearch(shareToken);

  const clearPageState = () => {
    // This will be passed to SharedTutorialsPage to clear its state
  };

  // Custom hooks
  const { sharedData, isLoading, error, refreshData, updateSharedData } = useSharedData(shareToken);
  const {
    viewingScriptId,
    scriptElements,
    isLoadingScript,
    scriptError,
    crewContext,
    handleScriptClick,
    handleBackToShows,
    refreshScriptElementsOnly,
    updateScriptElementsDirectly,
    updateSingleElement,
    deleteElement,
  } = useScriptViewing(shareToken);

  // Function to update script info directly without API call
  const updateScriptInfo = useCallback((changes: any) => {
    if (!viewingScriptId) return;

    updateSharedData(prevData => {
      if (!prevData?.shows) return prevData;

      const updatedShows = prevData.shows.map(show => ({
        ...show,
        scripts: show.scripts.map(script => {
          if (script.script_id === viewingScriptId) {
            const updatedScript = { ...script };

            // Apply each change
            for (const [field, changeData] of Object.entries(changes)) {
              const { new_value } = changeData as { old_value: any; new_value: any };
              if (field === 'script_name') updatedScript.script_name = new_value;
              else if (field === 'script_status') updatedScript.script_status = new_value;
              else if (field === 'start_time') updatedScript.start_time = new_value;
              else if (field === 'end_time') updatedScript.end_time = new_value;
              else if (field === 'script_notes') (updatedScript as any).script_notes = new_value;
            }
            return updatedScript;
          }
          return script;
        })
      }));

      return { ...prevData, shows: updatedShows };
    });
  }, [viewingScriptId, updateSharedData]);

  // WebSocket update handlers - extracted to custom hook
  const { handleUpdate } = useScriptUpdateHandlers({
    updateSingleElement,
    updateScriptElementsDirectly,
    deleteElement,
    refreshScriptElementsOnly,
    refreshSharedData: refreshData, // For full data refresh if needed
    updateScriptInfo, // For direct script info updates
  });

  // WebSocket sync for the currently viewing script
  const scriptSync = useScriptSync(viewingScriptId, shareToken, {
    onUpdate: handleUpdate,
    onConnect: () => { },
    onDisconnect: () => { },
    onError: () => { },
    onDataReceived: () => {
      setShouldRotateSync(true);
      setTimeout(() => setShouldRotateSync(false), 700); // Match CSS animation duration (600ms) + buffer
    },
  });

  const { sortBy, sortDirection, sortedShows, handleSortClick } = useSorting(sharedData);

  const bgColor = useColorModeValue('gray.50', 'gray.900');

  const handleShowClick = useCallback((showId: string) => {
    setSelectedShowId(prevId => prevId === showId ? null : showId);
  }, []);

  const currentScript = useMemo(() => {
    if (!viewingScriptId || !sharedData?.shows) return null;
    const foundScript = sharedData.shows
      .flatMap(show => show.scripts)
      .find(script => script.script_id === viewingScriptId) || null;
    return foundScript;
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
          <BorderedContainer>
            <GuestDarkModeSwitch shareToken={shareToken} />
          </BorderedContainer>
          <BorderedContainer>
            <ScriptSyncIcon
              isConnected={scriptSync.isConnected}
              isConnecting={scriptSync.isConnecting}
              connectionCount={scriptSync.connectionCount}
              connectionError={scriptSync.connectionError}
              userType="crew_member"
              shouldRotate={shouldRotateSync}
            />
          </BorderedContainer>
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
              <Flex align="center" flexShrink={0} mb={4}>
                {/* Left side - Title */}
                <HStack spacing="2" align="center">
                  <AppIcon
                    name={showTutorials ? 'compass' : 'show'}
                    boxSize={showTutorials ? '23px' : '25px'}
                  />
                  <Heading as="h2" size="md">
                    {showTutorials
                      ? hasSearched && searchResults.length > 0
                        ? `Tutorials • ${searchResults.length} Result${searchResults.length !== 1 ? 's' : ''}`
                        : 'Tutorials'
                      : 'Shows'}
                  </Heading>
                </HStack>

                {/* Right side - Actions aligned to content */}
                <Box flex="1" display="flex" justifyContent="space-between" alignItems="center" ml="8">
                  {/* Header actions positioned above main content - right aligned to content area */}
                  <Box flex="1" display="flex" justifyContent="flex-end" mr="8">
                    {showTutorials ? (
                      <SearchInput
                        searchQuery={searchQuery}
                        onSearchQueryChange={setSearchQuery}
                        isSearching={isSearching}
                        onSearch={(query) => handleSearch(query, clearPageState)}
                        onClearSearch={clearSearch}
                        placeholder="Search tutorials..."
                      />
                    ) : null}
                  </Box>

                  {/* Utilities menu positioned above quick access */}
                  <Box width="330px" display="flex" justifyContent="flex-end">
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
                  </Box>
                </Box>
              </Flex>
            )}

            {/* Content Area */}
            {showTutorials ? (
              <Box height="100%" flex="1">
                <SharedTutorialsPage
                  shareToken={shareToken}
                  onClose={() => setShowTutorials(false)}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  searchResults={searchResults}
                  isSearching={isSearching}
                  hasSearched={hasSearched}
                  handleSearch={handleSearch}
                  clearSearch={clearSearch}
                />
              </Box>
            ) : viewingScriptId ? (
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
                        colorizeDepNames={true}
                        showClockTimes={true}
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
