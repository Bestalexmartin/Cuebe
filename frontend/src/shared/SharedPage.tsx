// frontend/src/shared/SharedPage.tsx
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
import { useSharedData } from '../hooks/useSharedData';
import { useScript } from '../hooks/useScript';
import { useSorting } from '../hooks/useSorting';
import { ScriptHeader } from '../components/shared/ScriptHeader';
import { ShowsList } from '../components/shared/ShowsList';
import { LoadingSpinner, ErrorState, ScriptLoadingState } from '../components/shared/LoadingStates';
import { SortMenu, SortOption } from '../components/shared/SortMenu';
import { SharedPageHeader } from '../components/shared/SharedPageHeader';
import { SearchInput } from '../components/shared/SearchInput';
import { BorderedContainer } from '../components/shared/BorderedContainer';
import { useScriptSync } from '../hooks/useScriptSync';
import { SharedTutorialsPage } from './components/SharedTutorialsPage';
import { GuestDarkModeSwitch } from './components/GuestDarkModeSwitch';
import { useTutorialSearch } from './hooks/useTutorialSearch';
import { useScriptUpdateHandlers } from './hooks/useScriptUpdateHandlers';
import { useScriptSyncContext } from '../contexts/ScriptSyncContext';
import { SynchronizedPlayProvider, useSynchronizedPlayContext } from '../contexts/SynchronizedPlayContext';
import { usePlaybackAdjustment } from '../features/script/hooks/usePlaybackAdjustment';
import { SubscriberViewMode } from '../features/script/components/modes/SubscriberViewMode';
import { SubscriberPlaybackOverlay } from '../features/script/components/SubscriberPlaybackOverlay';
import { ActionsMenu } from '../components/ActionsMenu';
import { GuestOptionsModal } from '../features/script/components/modals/GuestOptionsModal';
import { createGuestActionMenuConfig } from '../features/script/config/guestActionMenuConfig';

const SHOWS_SORT_OPTIONS: SortOption[] = [
  { value: 'show_name', label: 'Name' },
  { value: 'show_date', label: 'Show Date' },
  { value: 'date_created', label: 'Created' },
  { value: 'date_updated', label: 'Updated' },
];

// Inner component to access synchronized play context
const SharedPageContent = React.memo(() => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [showTutorials, setShowTutorials] = useState<boolean>(false);
  const [contentAreaBounds, setContentAreaBounds] = useState<DOMRect | null>(null);
  const [showGuestOptions, setShowGuestOptions] = useState(false);
  const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({});
  const [guestLookaheadSeconds, setGuestLookaheadSeconds] = useState(30);
  const [guestUseMilitaryTime, setGuestUseMilitaryTime] = useState(false);
  const triggerRotationRef = useRef<(() => void) | null>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  
  // Access synchronized play context
  const { 
    handlePlaybackCommand,
    setScript,
    playbackState,
    isPlaybackPlaying,
    isPlaybackPaused,
    isPlaybackSafety,
    isPlaybackComplete,
    lastPauseDurationMs,
    currentTime,
    setElementBoundaries
  } = useSynchronizedPlayContext();

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
  
  // Custom hooks - useScript provides script viewing functionality with element handlers
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
  } = useScript(shareToken, updateSharedData, refreshData);

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

  // Memoize the getCurrentElements callback to prevent render loops - use ref for stability
  const scriptElementsRef = useRef(scriptElements);
  scriptElementsRef.current = scriptElements;
  const getCurrentElements = useCallback(() => scriptElementsRef.current, []);

  // Get current script from shared data (for script metadata) - preserve old functionality
  const currentScript = useMemo(() => {
    if (!viewingScriptId || !sharedData?.shows) return null;
    const foundScript = sharedData.shows
      .flatMap(show => show.scripts)
      .find(script => script.script_id === viewingScriptId) || null;
    return foundScript;
  }, [viewingScriptId, sharedData?.shows]);

  // Pass script to synchronized context for timing calculations
  useEffect(() => {
    if (currentScript) {
      setScript(currentScript);
    }
  }, [currentScript, setScript]);

  // Scoped-side equivalent of applyLocalChange for pause adjustments
  const applyTimingAdjustment = useCallback((operation: any) => {
    console.log('🔧 SCOPED RETIME: applyTimingAdjustment called with:', operation);
    
    if (operation.type === 'UPDATE_SCRIPT_INFO') {
      console.log('🔧 SCOPED RETIME: UPDATE_SCRIPT_INFO not implemented on scoped side (read-only)');
      return;
    }
    
    if (operation.type === 'BULK_OFFSET_ADJUSTMENT' && scriptElements.length > 0) {
      // Recreate timing boundaries with adjusted offset times for future elements
      const currentTimeMs = operation.current_time_ms;
      const delayMs = operation.delay_ms;
      const lookaheadMs = guestLookaheadSeconds * 1000;
      
      console.log('🔧 SCOPED RETIME: Processing adjustment:', {
        currentTimeMs,
        delayMs,
        elementsCount: scriptElements.length
      });
      
      const adjustedElements = scriptElements.map(element => {
        const originalOffset = element.offset_ms || 0;
        // Only adjust elements that haven't played yet
        if (originalOffset > currentTimeMs) {
          console.log(`🔧 SCOPED RETIME: Adjusting element ${element.element_id} from ${originalOffset}ms to ${originalOffset + delayMs}ms`);
          return {
            ...element,
            offset_ms: originalOffset + delayMs
          };
        }
        return element;
      });
      
      // Rebuild timing boundaries with adjusted elements
      setElementBoundaries(adjustedElements, lookaheadMs);
    }
  }, [scriptElements, guestLookaheadSeconds, setElementBoundaries]);

  // Debug the pause adjustment inputs
  useEffect(() => {
    console.log('🔧 SCOPED RETIME: usePlaybackAdjustment inputs:', {
      scriptId: viewingScriptId,
      elementsCount: scriptElements.length,
      currentScript: !!currentScript,
      lastPauseDurationMs,
      currentTime
    });
  }, [viewingScriptId, scriptElements.length, currentScript, lastPauseDurationMs, currentTime]);

  // Scoped-side pause adjustment - force BULK_OFFSET_ADJUSTMENT approach only
  const lastProcessedPauseRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!lastPauseDurationMs || !currentScript || !currentTime) {
      return;
    }
    
    // Prevent processing the same pause duration multiple times
    if (lastProcessedPauseRef.current === lastPauseDurationMs) {
      return;
    }
    
    console.log('🔧 SCOPED RETIME: Processing pause duration:', {
      lastPauseDurationMs,
      currentTime,
      scriptElements: scriptElements.length
    });
    
    lastProcessedPauseRef.current = lastPauseDurationMs;
    
    // Always use BULK_OFFSET_ADJUSTMENT approach (scoped side is read-only)
    applyTimingAdjustment({
      type: 'BULK_OFFSET_ADJUSTMENT',
      element_id: 'playback-delay-adjustment', 
      delay_ms: Math.ceil(lastPauseDurationMs / 1000) * 1000, // Round up to nearest second
      current_time_ms: currentTime
    });
  }, [lastPauseDurationMs, currentTime, currentScript, applyTimingAdjustment]);

  // Load guest preferences
  useEffect(() => {
    const loadGuestPreferences = async () => {
      if (!shareToken) return;

      try {
        const response = await fetch(`/api/shared/${encodeURIComponent(shareToken)}/preferences`);
        if (response.ok) {
          const preferences = await response.json();
          console.log('Loaded preferences response:', preferences);
          setGuestLookaheadSeconds(preferences.lookahead_seconds || 30);
          setGuestUseMilitaryTime(preferences.use_military_time || false);
        }
      } catch (error) {
        console.error('Failed to load guest preferences:', error);
      }
    };

    loadGuestPreferences();
  }, [shareToken]);

  // Memoize the callbacks object with more stable dependencies
  const updateHandlerCallbacks = useMemo(() => ({
    updateSingleElement,
    updateScriptElementsDirectly,
    deleteElement,
    refreshScriptElementsOnly,
    refreshSharedData: refreshData,
    updateScriptInfo,
    getCurrentElements,
  }), [updateSingleElement, updateScriptElementsDirectly, deleteElement, refreshScriptElementsOnly, refreshData, updateScriptInfo, getCurrentElements]);

  // WebSocket update handlers - with stable callbacks object
  const { handleUpdate } = useScriptUpdateHandlers(updateHandlerCallbacks);

  // Playback command handler for synchronized playback
  const onPlaybackCommand = useCallback((message: any) => {
    if (message.command && message.timestamp_ms) {
      handlePlaybackCommand(
        message.command,
        message.timestamp_ms,
        message.show_time_ms,
        message.start_time
      );
    }
  }, [handlePlaybackCommand]);

  // Group collapse functionality
  const toggleGroupCollapse = useCallback((elementId: string) => {
    setGroupOverrides(prev => ({
      ...prev,
      [elementId]: !prev[elementId]
    }));
  }, []);

  // Guest options functionality
  const handleOptionsClick = useCallback(() => {
    setShowGuestOptions(true);
  }, []);

  const handleGuestOptionsSave = useCallback(async (lookaheadSeconds: number, useMilitaryTime: boolean) => {
    if (!shareToken) return;

    try {
      const response = await fetch(`/api/shared/${encodeURIComponent(shareToken)}/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          lookahead_seconds: lookaheadSeconds,
          use_military_time: useMilitaryTime 
        })
      });

      if (response.ok) {
        const updatedPreferences = await response.json();
        console.log('Updated preferences response:', updatedPreferences);
        setGuestLookaheadSeconds(updatedPreferences.lookahead_seconds || 30);
        setGuestUseMilitaryTime(updatedPreferences.use_military_time || false);
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      throw error;
    }
  }, [shareToken]);

  // Trigger rotation on data received (ping/pong and incoming updates)
  const onDataReceived = useCallback(() => {
    // Trigger a brief rotation on websocket activity
    triggerRotationRef.current?.();
  }, []);

  // Other websocket callbacks - kept simple and stable
  const onConnect = useCallback(() => {}, []);
  const onDisconnect = useCallback(() => {}, []);
  const onError = useCallback(() => {}, []);

  // Websocket setup - connects when we have a script ID
  const scriptSync = useScriptSync(viewingScriptId, shareToken, {
    onUpdate: handleUpdate,
    onConnect,
    onDisconnect,
    onError,
    onDataReceived,
    onPlaybackCommand,
  });

  // Update sync context for header display
  const { setSyncData } = useScriptSyncContext();
  
  // Simple sync data - only update when connection actually changes
  const syncData = useMemo(() => {
    if (!viewingScriptId) return null;
    
    return {
      isConnected: scriptSync.isConnected,
      isConnecting: scriptSync.isConnecting,
      connectionCount: scriptSync.connectionCount,
      connectionError: scriptSync.connectionError,
      userType: 'crew_member' as const,
      triggerRotation: triggerRotationRef
    };
  }, [viewingScriptId, scriptSync.isConnected, scriptSync.isConnecting]);
  
  useEffect(() => {
    setSyncData(syncData);
    
    // Cleanup when component unmounts
    return () => setSyncData(null);
  }, [syncData, setSyncData]);

  // Force clear sync data immediately when leaving script view
  useEffect(() => {
    if (!viewingScriptId) {
      setSyncData(null);
    }
  }, [viewingScriptId, setSyncData]);

  // Track content area bounds for overlay positioning
  useEffect(() => {
    if (contentAreaRef.current) {
      const updateBounds = () => {
        if (contentAreaRef.current) {
          setContentAreaBounds(contentAreaRef.current.getBoundingClientRect());
        }
      };
      
      updateBounds();
      window.addEventListener('resize', updateBounds);
      return () => window.removeEventListener('resize', updateBounds);
    }
  }, [viewingScriptId]);


  const { sortBy, sortDirection, sortedShows, handleSortClick } = useSorting(sharedData);

  const bgColor = useColorModeValue('gray.50', 'gray.900');

  const handleShowClick = useCallback((showId: string) => {
    setSelectedShowId(prevId => prevId === showId ? null : showId);
  }, []);

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
                  actions={createGuestActionMenuConfig({
                    onOptionsClick: handleOptionsClick
                  })}
                />

                {/* Script Content */}
                <Box
                  ref={contentAreaRef}
                  border={playbackState === 'STOPPED' ? "1px solid" : "none"}
                  borderColor="container.border"
                  borderRadius="md"
                  flexGrow={1}
                  overflow="hidden"
                  display="flex"
                  flexDirection="column"
                  mt="-1px"
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
                      overflow="hidden"
                      minHeight={0}
                      maxHeight="100%"
                    >
                      <SubscriberViewMode
                        scriptId={viewingScriptId}
                        colorizeDepNames={true}
                        showClockTimes={true}
                        autoSortCues={true}
                        elements={scriptElements}
                        allElements={scriptElements}
                        script={currentScript}
                        useMilitaryTime={guestUseMilitaryTime}
                        onToggleGroupCollapse={toggleGroupCollapse}
                        groupOverrides={groupOverrides}
                        lookaheadSeconds={guestLookaheadSeconds}
                      />
                    </Box>
                  )}
                </Box>
                
                {/* Synchronized Playback Overlay */}
                {(() => {
                  const shouldShow = (isPlaybackPlaying || isPlaybackPaused || isPlaybackSafety || isPlaybackComplete) && contentAreaBounds;
                  console.log('🔍 OVERLAY: Render condition check:', {
                    playbackState,
                    isPlaybackPlaying,
                    isPlaybackPaused,
                    isPlaybackSafety,
                    isPlaybackComplete,
                    hasContentAreaBounds: !!contentAreaBounds,
                    shouldShow
                  });
                  return shouldShow ? (
                    <SubscriberPlaybackOverlay
                      contentAreaBounds={contentAreaBounds}
                      script={currentScript}
                      useMilitaryTime={guestUseMilitaryTime}
                    />
                  ) : null;
                })()}
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

      {/* Guest Options Modal */}
      <GuestOptionsModal
        isOpen={showGuestOptions}
        onClose={() => setShowGuestOptions(false)}
        initialLookaheadSeconds={guestLookaheadSeconds}
        initialUseMilitaryTime={guestUseMilitaryTime}
        onSave={handleGuestOptionsSave}
      />
    </ErrorBoundary>
  );
});

export const SharedPage = React.memo(() => {
  return (
    <SynchronizedPlayProvider>
      <SharedPageContent />
    </SynchronizedPlayProvider>
  );
});
