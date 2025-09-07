// frontend/src/shared/SharedPage.tsx
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  HStack,
  Button,
  Text,
  useColorModeValue,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Badge,
} from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { formatRoleBadge } from '../constants/userRoles';
import { useSharedData } from '../hooks/useSharedData';
import { useScript } from '../hooks/useScript';
import { useEnhancedToast } from '../utils/toastUtils';
import { useSorting } from '../hooks/useSorting';
import { ScriptHeader } from '../components/shared/ScriptHeader';
import { ShowsList } from '../components/shared/ShowsList';
import { LoadingSpinner, ErrorState, ScriptLoadingState } from '../components/shared/LoadingStates';
import { SortMenu, SortOption } from '../components/shared/SortMenu';
import { SharedPageHeader } from './components/SharedPageHeader';
import { SearchInput } from '../components/shared/SearchInput';
import { BorderedContainer } from '../components/shared/BorderedContainer';
import { useScriptSync } from '../hooks/useScriptSync';
import { SharedTutorialsPage } from './components/SharedTutorialsPage';
import { SharedPreferencesPage } from './components/SharedPreferencesPage';
import { GuestDarkModeSwitch } from './components/GuestDarkModeSwitch';
import { useTutorialSearch } from './hooks/useTutorialSearch';
import { useScriptUpdateHandlers } from './hooks/useScriptUpdateHandlers';
import { useScriptSyncContext } from '../contexts/ScriptSyncContext';
import { SynchronizedPlayProvider, useSynchronizedPlayContext } from '../contexts/SynchronizedPlayContext';
import { SubscriberViewMode } from './components/modes/SubscriberViewMode';
import { SubscriberPlaybackOverlay } from './components/SubscriberPlaybackOverlay';
import { MobileSearchModal } from './components/modals/MobileSearchModal';

const SHOWS_SORT_OPTIONS: SortOption[] = [
  { value: 'show_name', label: 'Name' },
  { value: 'show_date', label: 'Show Date' },
  { value: 'date_created', label: 'Created' },
  { value: 'date_updated', label: 'Updated' },
];

// Mobile Clock Bar component - extracted from SubscriberPlaybackOverlay
const MobileClockBar: React.FC<{
  playbackState: string;
  currentScript: any;
  useMilitaryTime: boolean;
  cumulativeDelayMs: number;
}> = React.memo(({ playbackState, currentScript, useMilitaryTime, cumulativeDelayMs: _cumulativeDelayMs }) => {
  const [timestamp, setTimestamp] = useState(Date.now());
  const { pauseStartTime } = useSynchronizedPlayContext();

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimestamp(Date.now());
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const formatRealTimeClock = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = useMilitaryTime ? date.getHours() : date.getHours() % 12 || 12;
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatShowTimer = (liveTimestamp: number) => {
    const displayTimestamp = (playbackState === 'PAUSED' || playbackState === 'SAFETY' || playbackState === 'COMPLETE') && pauseStartTime
      ? pauseStartTime
      : liveTimestamp;
    if (!currentScript?.start_time) return "00:00:00";
    const scriptStart = new Date(currentScript.start_time);
    const diffMs = scriptStart.getTime() - displayTimestamp;
    const diffSeconds = Math.round(diffMs / 1000);
    const hours = Math.floor(Math.abs(diffSeconds) / 3600);
    const minutes = Math.floor((Math.abs(diffSeconds) % 3600) / 60);
    const seconds = Math.abs(diffSeconds) % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return diffSeconds < 0 ? timeStr : `–${timeStr}`;
  };

  return (
    <Box
      display={{ base: 'block', lg: 'none' }}
      bg="#0F0F0F"
      height="60px"
      borderBottom="1px solid"
      borderColor="gray.700"
      animation={playbackState === 'PAUSED' ? "flash 1s infinite" : undefined}
      sx={playbackState === 'PAUSED' ? {
        "@keyframes flash": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.3 }
        }
      } : {}}
    >
      <HStack spacing={0} justify="center" align="center" height="100%">
        {/* Realtime Clock */}
        <Box
          bg="transparent"
          color="amber"
          px={{ base: "7px", sm: "10px" }}
          borderRadius="none"
          fontSize={{ base: "xl", sm: "3xl" }}
          fontFamily="mono"
          textAlign="center"
        >
          {formatRealTimeClock(timestamp)}
        </Box>

        {/* Bullet separator */}
        <Box bg="transparent" px={{ base: "3px", sm: "5px" }} display="flex" alignItems="center" height="100%">
          <Text fontSize={{ base: "xl", sm: "3xl" }} color="gray.500" fontFamily="mono">•</Text>
        </Box>

        {/* Show Timer */}
        <Box
          bg="transparent"
          color="red.500"
          px={{ base: "7px", sm: "10px" }}
          borderRadius="none"
          fontSize={{ base: "xl", sm: "3xl" }}
          fontFamily="mono"
          textAlign="center"
        >
          {formatShowTimer(timestamp)}
        </Box>

        {/* Bullet separator */}
        <Box bg="transparent" px={{ base: "3px", sm: "5px" }} display="flex" alignItems="center" height="100%">
          <Text fontSize={{ base: "xl", sm: "3xl" }} color="gray.500" fontFamily="mono">•</Text>
        </Box>

        {/* Playback Status */}
        <Box
          bg="transparent"
          color={playbackState === 'SAFETY' ? 'orange.500' : playbackState === 'COMPLETE' ? 'green.500' : 'red.500'}
          px={{ base: "7px", sm: "10px" }}
          borderRadius="none"
          fontSize={{ base: "xl", sm: "3xl" }}
          fontFamily="mono"
          fontWeight="bold"
          textAlign="center"
        >
          {playbackState === 'COMPLETE' ? 'COMPLETE' : playbackState}
        </Box>
      </HStack>
    </Box>
  );
});

// Inner component to access synchronized play context
const SharedPageContent = React.memo(() => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [showTutorials, setShowTutorials] = useState<boolean>(false);
  const [showPreferences, setShowPreferences] = useState<boolean>(false);
  const [contentAreaBounds, setContentAreaBounds] = useState<DOMRect | null>(null);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [guestLookaheadSeconds, setGuestLookaheadSeconds] = useState(30);
  const [guestUseMilitaryTime, setGuestUseMilitaryTime] = useState(false);
  const savedLookaheadRef = useRef<number | null>(null);
  const savedMilitaryRef = useRef<boolean | null>(null);
  const triggerRotationRef = useRef<(() => void) | null>(null);
  const { showSuccess, showError } = useEnhancedToast();
  
  // Track when preferences view is left to trigger optional auto-save
  const prevShowPreferences = useRef(showPreferences);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  // Access synchronized play context
  const {
    handlePlaybackCommand,
    setScript,
    playbackState,
    lastPauseDurationMs,
    currentTime,
    cumulativeDelayMs,
    updateElementBoundaries,
    processBoundariesForTime,
    registerRetimingCallback,
    resetAllPlaybackState
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
    updateScriptElementsDirectly,
    updateSingleElement,
    deleteElement,
  } = useScript(shareToken, updateSharedData, refreshData);

  // Reset all playback and script state on page load/mount to clear persistent state
  useEffect(() => {
    resetAllPlaybackState();
  }, []); // Empty dependency array = runs only on mount

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

  // Utility: adjust only future element offsets by a delay
  const adjustFutureOffsets = useCallback((elements: any[], currentMs: number, delayMs: number) => {
    if (!Array.isArray(elements) || !currentMs || !delayMs) return elements;
    return elements.map(element => {
      const currentOffset = element.offset_ms || 0;
      return currentOffset > currentMs
        ? { ...element, offset_ms: currentOffset + delayMs }
        : element;
    });
  }, []);

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


  // Late joiner retiming - apply cumulative delay when first joining mid-script
  // Only run on true late join (provider sets lastPauseDurationMs undefined when starting fresh)
  const hasAppliedCumulativeDelayRef = useRef(false);
  useEffect(() => {
    if (
      !hasAppliedCumulativeDelayRef.current &&
      cumulativeDelayMs > 0 &&
      // Guard against normal pause/resume cycles to avoid double-applying
      (lastPauseDurationMs === undefined || lastPauseDurationMs === null) &&
      currentScript &&
      currentTime &&
      scriptElements.length > 0 &&
      (playbackState === 'PLAYING' || playbackState === 'PAUSED')
    ) {
      hasAppliedCumulativeDelayRef.current = true;

      const adjustedElements = adjustFutureOffsets(scriptElements, currentTime, cumulativeDelayMs);
      updateScriptElementsDirectly(adjustedElements);

      // Proactively refresh timing boundaries and process to stabilize highlights
      try {
        updateElementBoundaries?.(adjustedElements, guestLookaheadSeconds * 1000);
        processBoundariesForTime?.(currentTime);
      } catch (_) {
        // best-effort only
      }
    }
  }, [cumulativeDelayMs, lastPauseDurationMs, currentScript, currentTime, scriptElements, playbackState, updateScriptElementsDirectly, adjustFutureOffsets, updateElementBoundaries, processBoundariesForTime, guestLookaheadSeconds]);

  // Reset late joiner flag when leaving script
  useEffect(() => {
    if (!viewingScriptId) {
      hasAppliedCumulativeDelayRef.current = false;
    }
  }, [viewingScriptId]);

  // Register centralized retiming callback from sync context to adjust future offsets on UNPAUSE
  useEffect(() => {
    const cb = (op: any) => {
      if (!op || op.type !== 'BULK_OFFSET_ADJUSTMENT') return;
      const delayMs = op.delay_ms || 0;
      const currentMs = op.current_time_ms || 0;
      if (delayMs <= 0) return;

      const base = scriptElementsRef.current || [];
      if (!Array.isArray(base) || base.length === 0) return;
      const adjusted = adjustFutureOffsets(base, currentMs, delayMs);

      updateScriptElementsDirectly(adjusted);

      // Refresh timing boundaries and process immediately to avoid flicker
      try {
        if (updateElementBoundaries) {
          updateElementBoundaries(adjusted, guestLookaheadSeconds * 1000);
        }
        if (processBoundariesForTime && typeof currentMs === 'number') {
          processBoundariesForTime(currentMs);
        }
      } catch (_) {
        // noop - boundary refresh is best-effort
      }
    };

    registerRetimingCallback(cb);
    return () => {
      // Unregister by setting a no-op to avoid stale closures
      registerRetimingCallback(() => { });
    };
  }, [registerRetimingCallback, updateScriptElementsDirectly, updateElementBoundaries, processBoundariesForTime, guestLookaheadSeconds, adjustFutureOffsets]);

  // Load guest preferences
  useEffect(() => {
    const loadGuestPreferences = async () => {
      if (!shareToken) return;

      try {
        const response = await fetch(`/api/shared/${encodeURIComponent(shareToken)}/preferences`);
        if (response.ok) {
          const preferences = await response.json();
          const la = preferences.lookahead_seconds ?? 30;
          const mil = preferences.use_military_time ?? false;
          setGuestLookaheadSeconds(la);
          setGuestUseMilitaryTime(mil);
          savedLookaheadRef.current = la;
          savedMilitaryRef.current = mil;
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
    refreshSharedData: refreshData,
    updateScriptInfo,
    getCurrentElements,
  }), [updateSingleElement, updateScriptElementsDirectly, deleteElement, refreshData, updateScriptInfo, getCurrentElements]);

  // WebSocket update handlers - with stable callbacks object
  const { handleUpdate } = useScriptUpdateHandlers(updateHandlerCallbacks);

  // Playback command handler for synchronized playback (no local dedupe)
  const onPlaybackCommand = useCallback((message: any) => {
    if (!message?.command) return;
    handlePlaybackCommand(
      message.command,
      message.timestamp_ms || Date.now(),
      message.show_time_ms,
      message.start_time,
      message.cumulative_delay_ms
    );
  }, [handlePlaybackCommand]);

  // Removed group collapse state/handler (unused in subscriber view)

  // Preferences navigation
  const handleOptionsClick = useCallback(() => {
    setShowPreferences(true);
    setShowTutorials(false);
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
        const la = updatedPreferences.lookahead_seconds ?? 30;
        const mil = updatedPreferences.use_military_time ?? false;
        setGuestLookaheadSeconds(la);
        setGuestUseMilitaryTime(mil);
        savedLookaheadRef.current = la;
        savedMilitaryRef.current = mil;
        showSuccess('Preferences Updated', 'Your preferences have been saved successfully.');
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      showError('Failed to save preferences');
      throw error;
    }
  }, [shareToken]);

  // Auto-save preferences when leaving preferences view, only if changed
  useEffect(() => {
    if (prevShowPreferences.current && !showPreferences) {
      const changed =
        savedLookaheadRef.current !== guestLookaheadSeconds ||
        savedMilitaryRef.current !== guestUseMilitaryTime;
      if (changed) {
        handleGuestOptionsSave(guestLookaheadSeconds, guestUseMilitaryTime);
      }
    }
    prevShowPreferences.current = showPreferences;
  }, [showPreferences, guestLookaheadSeconds, guestUseMilitaryTime, handleGuestOptionsSave]);

  // Trigger rotation on data received (ping/pong and incoming updates)
  const onDataReceived = useCallback(() => {
    // Trigger a brief rotation on websocket activity
    triggerRotationRef.current?.();
  }, []);

  // Other websocket callbacks - kept simple and stable
  const onConnect = useCallback(() => { }, []);
  const onDisconnect = useCallback(() => { }, []);
  const onError = useCallback(() => { }, []);

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
  }, [viewingScriptId, scriptSync.isConnected, scriptSync.isConnecting, scriptSync.connectionCount, scriptSync.connectionError]);

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

  // Track content area bounds for overlay positioning via ResizeObserver
  useEffect(() => {
    const node = contentAreaRef.current;
    if (!node) return;

    const updateBounds = () => setContentAreaBounds(node.getBoundingClientRect());
    updateBounds(); // initial

    // Use ResizeObserver for precise updates on container size changes
    const ResizeObserverCtor = (window as any).ResizeObserver as any;
    if (ResizeObserverCtor) {
      const ro = new ResizeObserverCtor(() => updateBounds());
      if (ro && ro.observe) {
        ro.observe(node);
        return () => {
          try { ro.disconnect(); } catch { }
        };
      }
    }

    // Fallback to window resize if ResizeObserver is unavailable
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
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
        height="100dvh"
        width="100vw"
        overflow="hidden"
        bg={bgColor}
        sx={{
          // Fallback for browsers that don't support dvh
          height: "100vh",
          "@supports (height: 100dvh)": {
            height: "100dvh"
          }
        }}
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
          p={{ base: "0", sm: "2rem" }}
          position="relative"
          height="100%"
        >
          {/* Mobile Script Info Bar - positioned above clock */}
          {viewingScriptId && (
            <Box
              display={{ base: 'block', sm: 'none' }}
              position="absolute"
              top="0"
              left="0"
              right="0"
              zIndex="11"
              bg={bgColor}
              py="16px"
              px={{ base: "1rem", sm: "2rem" }}
              borderBottom="1px solid"
              borderColor="gray.200"
              _dark={{ borderColor: 'gray.700' }}
            >
              <Flex justify="space-between" align="center">
                <Flex align="center" gap="2">
                  {crewContext?.department_name && (
                    <Badge
                      colorScheme="blue"
                      variant="solid"
                      fontSize="sm"
                      size="md"
                      style={{ backgroundColor: crewContext.department_color || '#3182CE' }}
                    >
                      {crewContext.department_name}
                    </Badge>
                  )}
                  {crewContext?.show_role && (
                    <Badge
                      colorScheme="green"
                      variant="solid"
                      fontSize="sm"
                      size="md"
                    >
                      {formatRoleBadge(crewContext.show_role)}
                    </Badge>
                  )}
                </Flex>
                <Menu>
                  <MenuButton
                    as={Button}
                    bg="blue.400"
                    color="white"
                    size="xs"
                    _hover={{ bg: 'orange.400' }}
                    rightIcon={<AppIcon name="openmenu" />}
                  >
                    Options
                  </MenuButton>
                  <MenuList>
                    <MenuItem onClick={handleOptionsClick}>
                      Viewing Options
                    </MenuItem>
                    <MenuItem onClick={handleBackToShows}>
                      Back to Shows
                    </MenuItem>
                  </MenuList>
                </Menu>
              </Flex>
            </Box>
          )}

          {/* Mobile Clock Bar - positioned below mobile script info */}
          {viewingScriptId && playbackState !== 'STOPPED' && (
            <Box
              position="absolute"
              top={{ base: "56px", sm: "0" }}
              left="0"
              right="0"
              zIndex="10"
            >
              <MobileClockBar
                playbackState={playbackState}
                currentScript={currentScript}
                useMilitaryTime={guestUseMilitaryTime}
                cumulativeDelayMs={cumulativeDelayMs}
              />
            </Box>
          )}

          <Flex
            direction="column"
            height="100%"
            pt={{
              base: viewingScriptId
                ? playbackState !== 'STOPPED'
                  ? "104px"  // Mobile: script info + clock - 12px adjustment
                  : "44px"   // Mobile: script info only - 12px adjustment
                : "0",
              sm: viewingScriptId && playbackState !== 'STOPPED' ? "60px" : "0",  // Tablet: just clock space
              lg: "0"  // Desktop: no padding, clock moved to overlay
            }}
          >
            {/* Header - Shows or Tutorials */}
            {!viewingScriptId && (
              <Flex align="center" flexShrink={0} mb={4} px={{ base: "1rem", sm: "0" }} mt={{ base: "16px", sm: "0" }}>
                {/* Left side - Title */}
                <HStack spacing="2" align="center">
                  <AppIcon
                    name={showPreferences ? 'options' : showTutorials ? 'compass' : 'show'}
                    boxSize={showPreferences ? '23px' : showTutorials ? '23px' : '25px'}
                  />
                  <Heading as="h2" size="md">
                    {showPreferences
                      ? 'Preferences'
                      : showTutorials
                        ? hasSearched && searchResults.length > 0
                          ? (
                              <>
                                <Text as="span" display={{ base: "inline", sm: "none" }}>
                                  Tutorials
                                </Text>
                                <Text as="span" display={{ base: "none", sm: "inline" }}>
                                  {`Tutorials • ${searchResults.length} Result${searchResults.length !== 1 ? 's' : ''}`}
                                </Text>
                              </>
                            )
                          : 'Tutorials'
                        : 'Shows'}
                  </Heading>
                </HStack>

                {/* Right side - Actions */}
                <Flex flex="1" justify="flex-end" align="center">
                  <HStack spacing="2">
                    {/* Search for tutorials - not shown in preferences */}
                    {showTutorials && !showPreferences && (
                      <>
                        {/* Desktop search input >425px */}
                        <Box display={{ base: "none", sm: "block" }}>
                          <SearchInput
                            searchQuery={searchQuery}
                            onSearchQueryChange={setSearchQuery}
                            isSearching={isSearching}
                            onSearch={(query) => handleSearch(query, clearPageState)}
                            onClearSearch={clearSearch}
                            placeholder="Search tutorials..."
                          />
                        </Box>

                        {/* Mobile search button <=425px */}
                        <Button
                          display={{ base: "block", sm: "none" }}
                          size="xs"
                          rightIcon={<AppIcon name="search" height="10px" transform="translate(-2px, 1px)" />}
                          pl="14px"
                          onClick={() => setShowMobileSearch(true)}
                        >
                          Search
                        </Button>

                        <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />
                      </>
                    )}
                    {!showTutorials && !showPreferences && (
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
                        View Mode
                      </MenuButton>
                      <MenuList minW="140px">
                        <MenuItem 
                          onClick={() => {
                            setShowTutorials(false);
                            setShowPreferences(false);
                          }}
                          isDisabled={!showTutorials && !showPreferences}
                          opacity={!showTutorials && !showPreferences ? 0.4 : 1}
                        >
                          <AppIcon name="show" boxSize="16px" mr={2} />
                          Shows
                        </MenuItem>
                        <MenuItem 
                          onClick={() => {
                            setShowTutorials(false);
                            setShowPreferences(true);
                          }}
                          isDisabled={showPreferences}
                          opacity={showPreferences ? 0.4 : 1}
                        >
                          <AppIcon name="options" boxSize="16px" mr={2} />
                          Preferences
                        </MenuItem>
                        <MenuItem 
                          onClick={() => {
                            setShowTutorials(true);
                            setShowPreferences(false);
                          }}
                          isDisabled={showTutorials}
                          opacity={showTutorials ? 0.4 : 1}
                        >
                          <AppIcon name="compass" boxSize="16px" mr={2} />
                          Tutorials
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </HStack>
                </Flex>
              </Flex>
            )}

            {/* Content Area */}
            {showPreferences ? (
              <Box
                border={{ base: "none", sm: "1px solid var(--chakra-colors-container-border)" }}
                p={{ base: "1rem", sm: "4" }}
                borderRadius={{ base: "0", sm: "md" }}
                flex={1}
                height="100%"
                overflow="hidden"
                mt={{ base: "-16px", sm: "0" }}
                minHeight={0}
              >
                <Box
                  height="100%"
                  overflowY="auto"
                  className="hide-scrollbar"
                >
                  <SharedPreferencesPage
                    useMilitaryTime={guestUseMilitaryTime}
                    lookaheadSeconds={guestLookaheadSeconds}
                    onMilitaryTimeChange={setGuestUseMilitaryTime}
                    onLookaheadSecondsChange={setGuestLookaheadSeconds}
                  />
                </Box>
              </Box>
            ) : showTutorials ? (
              <Box
                border={{ base: "none", sm: "1px solid var(--chakra-colors-container-border)" }}
                p={{ base: "1rem", sm: "4" }}
                borderRadius={{ base: "0", sm: "md" }}
                flex={1}
                height="100%"
                overflow="hidden"
                mt={{ base: "-16px", sm: "0" }}
                minHeight={0}
              >
                <Box
                  height="100%"
                  overflowY="auto"
                  className="hide-scrollbar"
                >
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
              </Box>
            ) : viewingScriptId ? (
              <>
                <ScriptHeader
                  currentScript={currentScript}
                  crewContext={crewContext}
                  onBackToShows={handleBackToShows}
                  showPreferences={showPreferences}
                  showTutorials={showTutorials}
                  setShowPreferences={setShowPreferences}
                  setShowTutorials={setShowTutorials}
                />

                {/* Script Content */}
                <Box
                  ref={contentAreaRef}
                  border={{
                    base: "none",
                    sm: `1px solid ${playbackState !== 'STOPPED' ? 'transparent' : 'var(--chakra-colors-container-border)'}`
                  }}
                  borderRadius={{ base: "0", sm: "md" }}
                  flexGrow={1}
                  overflow="hidden"
                  display="flex"
                  flexDirection="column"
                  mt={{ base: "-1px", sm: "0" }}
                >
                  <ScriptLoadingState
                    isLoading={isLoadingScript}
                    error={scriptError}
                    onBackToShows={handleBackToShows}
                  />
                  {!isLoadingScript && !scriptError && (
                    <Box
                      flex={1}
                      p={{ base: "0", sm: "4" }}
                      overflow="hidden"
                      minHeight={0}
                      maxHeight="100%"
                    >
                      <SubscriberViewMode
                        scriptId={viewingScriptId}
                        colorizeDepNames={true}
                        showClockTimes={true}
                        elements={scriptElements}
                        script={currentScript}
                        useMilitaryTime={guestUseMilitaryTime}
                        lookaheadSeconds={guestLookaheadSeconds}
                      />
                    </Box>
                  )}
                </Box>

                {/* Synchronized Playback Overlay */}
                {(() => {
                  const shouldShow = playbackState !== 'STOPPED' && contentAreaBounds;
                  return shouldShow ? (
                    <SubscriberPlaybackOverlay
                      contentAreaBounds={contentAreaBounds!}
                      script={currentScript}
                      useMilitaryTime={guestUseMilitaryTime}
                    />
                  ) : null;
                })()}
              </>
            ) : (
              <>
                <Box
                  border={{ base: "none", sm: "1px solid var(--chakra-colors-container-border)" }}
                  p={{ base: "1rem", sm: "4" }}
                  borderRadius={{ base: "0", sm: "md" }}
                  flex={1}
                  height="100%"
                  overflow="hidden"
                  mt={{ base: "-17px", sm: "0" }}
                  minHeight={0}
                >
                  <Box
                    height="100%"
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
                </Box>
              </>
            )}
          </Flex>
        </Box>
      </Box>

      {/* Mobile Search Modal */}
      <MobileSearchModal
        isOpen={showMobileSearch}
        onClose={() => setShowMobileSearch(false)}
        onSearch={(query) => handleSearch(query, clearPageState)}
      />
    </ErrorBoundary >
  );
});

export const SharedPage = React.memo(() => {
  return (
    <SynchronizedPlayProvider>
      <SharedPageContent />
    </SynchronizedPlayProvider>
  );
});
