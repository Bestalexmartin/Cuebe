// frontend/src/pages/SharedPage.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Image,
  IconButton,
  VStack,
  HStack,
  Button,
  Spinner,
  Avatar,
  Badge,
  useColorModeValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider
} from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { ShowCard } from '../features/shows/components/ShowCard';
import { AppIcon } from '../components/AppIcon';
import { useIntegratedColorMode } from '../hooks/useIntegratedColorMode';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ViewMode } from '../features/script/components/modes/ViewMode';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { ScriptElement } from '../features/script/types/scriptElements';
import { formatRoleBadge } from '../constants/userRoles';
import { Show } from '../features/shows/types';
import { useSharedData } from '../hooks/useSharedData';
import { useScriptViewing } from '../hooks/useScriptViewing';
import { useSorting } from '../hooks/useSorting';
import { ScriptHeader } from '../components/shared/ScriptHeader';
import { ShowsList } from '../components/shared/ShowsList';
import { LoadingSpinner, ErrorState, ScriptLoadingState } from '../components/shared/LoadingStates';

interface SharedData {
  shows?: Show[];
  user_name?: string;
  user_profile_image?: string;
  share_expires?: string;
}

const DarkModeSwitch: React.FC = () => {
  const { colorMode, toggleColorMode } = useIntegratedColorMode();

  return (
    <IconButton
      aria-label="Toggle dark mode"
      icon={<AppIcon name={colorMode === 'light' ? 'moon' : 'sun'} />}
      onClick={toggleColorMode}
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
  const cardBgColor = useColorModeValue('white', 'gray.800');
  
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

  const currentShow = useMemo(() => {
    if (!viewingScriptId || !sharedData?.shows) return null;
    return sharedData.shows.find(show =>
      show.scripts.some(script => script.script_id === viewingScriptId)
    ) || null;
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
        <Flex
          as="header"
          width="100%"
          align="center"
          justify="space-between"
          borderBottom="1px solid"
          borderColor="gray.200"
          _dark={{ borderColor: 'gray.700' }}
          px={{ base: 4, md: 6 }}
          py={3}
          bg={cardBgColor}
          boxShadow="sm"
        >
          <Flex align="center">
            <Image boxSize={{ base: "40px", md: "50px" }} src="/cuebe.svg" alt="Cuebe Logo" />
            <Heading as="h1" size={{ base: "md", md: "lg" }}>
              <Text as="span" color="orange.400">
                Cue
              </Text>
              <Text as="span" color="blue.400">
                be
              </Text>
              <Text as="span" color="#48BB78" ml={2}>
                Share
              </Text>
            </Heading>
          </Flex>

          <Flex align="center" gap={4}>
            {/* Dark mode switch */}
            <Flex
              justify="center"
              align="center"
              boxSize="40px"
              borderRadius="full"
              border="3px solid"
              borderColor="blue.400"
              _hover={{ borderColor: 'orange.400' }}
            >
              <DarkModeSwitch />
            </Flex>

            {/* Shared user profile */}
            <Flex
              justify="center"
              align="center"
              boxSize="40px"
              borderRadius="full"
              border="3px solid"
              borderColor="blue.400"
              _hover={{ borderColor: 'orange.400' }}
            >
              <Avatar
                size="sm"
                name={sharedData?.user_name || 'Guest User'}
                src={sharedData?.user_profile_image}
              />
            </Flex>
          </Flex>
        </Flex>

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
                  <Menu>
                    <MenuButton as={Button} size="xs" rightIcon={<AppIcon name={sortDirection} boxSize={4} />}>Sort</MenuButton>
                    <MenuList zIndex={9999}>
                      <MenuItem
                        onClick={() => handleSortClick('show_name')}
                        color={sortBy === 'show_name' ? 'blue.400' : 'inherit'}
                        fontWeight={sortBy === 'show_name' ? 'bold' : 'normal'}
                        _hover={{ borderColor: 'orange.400' }}
                      >
                        Name
                      </MenuItem>
                      <MenuItem
                        onClick={() => handleSortClick('show_date')}
                        color={sortBy === 'show_date' ? 'blue.400' : 'inherit'}
                        fontWeight={sortBy === 'show_date' ? 'bold' : 'normal'}
                        _hover={{ borderColor: 'orange.400' }}
                      >
                        Show Date
                      </MenuItem>
                      <MenuItem
                        onClick={() => handleSortClick('date_created')}
                        color={sortBy === 'date_created' ? 'blue.400' : 'inherit'}
                        fontWeight={sortBy === 'date_created' ? 'bold' : 'normal'}
                        _hover={{ borderColor: 'orange.400' }}
                      >
                        Created
                      </MenuItem>
                      <MenuItem
                        onClick={() => handleSortClick('date_updated')}
                        color={sortBy === 'date_updated' ? 'blue.400' : 'inherit'}
                        fontWeight={sortBy === 'date_updated' ? 'bold' : 'normal'}
                        _hover={{ borderColor: 'orange.400' }}
                      >
                        Updated
                      </MenuItem>
                    </MenuList>
                  </Menu>
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
