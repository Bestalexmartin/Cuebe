// frontend/src/pages/SharedPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
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
import { useParams, useNavigate } from 'react-router-dom';
import { ShowCard } from '../features/shows/components/ShowCard';
import { AppIcon } from '../components/AppIcon';
import { useIntegratedColorMode } from '../hooks/useIntegratedColorMode';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ViewMode } from '../features/script/components/modes/ViewMode';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { ScriptElement } from '../features/script/types/scriptElements';
import { formatRoleBadge } from '../constants/userRoles';

// Use the same interfaces as the working ShowsView implementation
interface Venue {
  venue_id: string;
  venue_name: string;
}

interface Script {
  script_id: string;
  script_name: string;
  script_status: string;
  show_id: string;
  start_time: string;
  end_time?: string;
  date_created: string;
  date_updated: string;
  last_used?: string;
  is_shared: boolean;
}

interface Show {
  show_id: string;
  show_name: string;
  show_date?: string;
  show_end?: string;
  date_created: string;
  date_updated: string;
  venue?: Venue;
  scripts: Script[];
}

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

export const SharedPage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const [sharedData, setSharedData] = useState<SharedData | null>(null);
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'show_name' | 'show_date' | 'date_updated' | 'date_created'>('date_updated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Script viewing state
  const [viewingScriptId, setViewingScriptId] = useState<string | null>(null);
  const [scriptElements, setScriptElements] = useState<ScriptElement[]>([]);
  const [isLoadingScript, setIsLoadingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [crewContext, setCrewContext] = useState<{
    department_name?: string;
    department_initials?: string;
    department_color?: string;
    show_role?: string;
    user_name?: string;
  } | null>(null);

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  
  // Get user preferences for script viewing
  const {
    preferences: { colorizeDepNames, showClockTimes }
  } = useUserPreferences();

  // Fetch shared data
  useEffect(() => {
    const fetchSharedData = async () => {
      if (!shareToken) {
        setError('Invalid share link');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/shared/${shareToken}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Share link not found or expired');
          }
          throw new Error('Failed to load shared content');
        }

        const data = await response.json();
        setSharedData(data);
      } catch (err) {
        console.error('Error fetching shared data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load shared content');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedData();
  }, [shareToken]);

  const handleShowClick = (showId: string) => {
    setSelectedShowId(selectedShowId === showId ? null : showId);
  };

  const handleScriptClick = async (scriptId: string) => {
    setIsLoadingScript(true);
    setScriptError(null);
    setViewingScriptId(scriptId);
    
    try {
      // Load script elements using share token
      const elementsResponse = await fetch(`/api/scripts/${scriptId}/elements?share_token=${shareToken}`);
      if (!elementsResponse.ok) {
        throw new Error('Failed to load script elements');
      }
      
      const elementsData = await elementsResponse.json();
      
      // Handle both old format (array) and new format (object with crew context)
      if (Array.isArray(elementsData)) {
        setScriptElements(elementsData);
        setCrewContext(null);
      } else {
        setScriptElements(elementsData.elements || []);
        setCrewContext(elementsData.crew_context || null);
      }
    } catch (err) {
      setScriptError(err instanceof Error ? err.message : 'Failed to load script');
      setViewingScriptId(null); // Reset if failed
    } finally {
      setIsLoadingScript(false);
    }
  };

  const handleBackToShows = () => {
    setViewingScriptId(null);
    setScriptElements([]);
    setScriptError(null);
    setCrewContext(null);
  };

  // Sort handling - exactly like ShowsView
  const handleSortClick = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
    } else {
      setSortBy(newSortBy);
      const newDirection = newSortBy === 'date_updated' ? 'desc' : 'asc';
      setSortDirection(newDirection);
    }
  };

  // Sorted shows - exactly like ShowsView but filtered for shared scripts
  const sortedShows = useMemo(() => {
    if (!sharedData?.shows || sharedData.shows.length === 0) return [];

    // Filter to only shows that have shared scripts
    const showsWithSharedScripts = sharedData.shows.filter(show => 
      show.scripts && show.scripts.length > 0
    );

    if (showsWithSharedScripts.length === 0) return [];

    const showsToSort = [...showsWithSharedScripts];
    showsToSort.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'show_name') {
        comparison = a.show_name.localeCompare(b.show_name);
      } else if (sortBy === 'show_date') {
        if (!a.show_date) return 1;
        if (!b.show_date) return -1;
        comparison = new Date(a.show_date).getTime() - new Date(b.show_date).getTime();
      } else if (sortBy === 'date_created') {
        comparison = new Date(b.date_created).getTime() - new Date(a.date_created).getTime();
      } else {
        comparison = new Date(b.date_updated).getTime() - new Date(a.date_updated).getTime();
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return showsToSort;
  }, [sharedData?.shows, sortBy, sortDirection]);

  // Get current script and show for script view mode
  const currentScript = viewingScriptId ? 
    sharedData?.shows?.flatMap(show => show.scripts)?.find(script => script.script_id === viewingScriptId) : null;
  
  const currentShow = viewingScriptId ? 
    sharedData?.shows?.find(show => show.scripts.some(script => script.script_id === viewingScriptId)) : null;
  

  if (isLoading) {
    return (
      <Flex
        height="100vh"
        width="100vw"
        align="center"
        justify="center"
        bg={bgColor}
      >
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.400" />
          <Text color="gray.600" _dark={{ color: 'gray.300' }}>
            Loading shared content...
          </Text>
        </VStack>
      </Flex>
    );
  }

  if (error || !sharedData) {
    return (
      <Flex
        height="100vh"
        width="100vw"
        align="center"
        justify="center"
        bg={bgColor}
        p={4}
      >
        <VStack spacing={4} textAlign="center">
          <AppIcon name="warning" boxSize="48px" color="orange.400" />
          <Text fontSize="xl" fontWeight="bold" color="red.500">
            {error || 'Content Not Available'}
          </Text>
          <Text color="gray.600" _dark={{ color: 'gray.300' }}>
            This share link may be invalid or expired.
          </Text>
        </VStack>
      </Flex>
    );
  }


  // Add defensive programming - wrap everything in try-catch to avoid crashes
  try {
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
            {/* Dark mode switch - first to match main site */}
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

            {/* Shared user profile - second to match main site */}
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

        {/* Main Content Area - Copy ShowsView structure */}
        <Box
          as="main"
          overflow="hidden"
          display="flex"
          flexDirection="column"
          p="2rem"
        >
          <Flex direction="column" height="100%">
            {/* Header Section - conditional based on viewing mode */}
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

            {/* Script View Mode: Use ManageScriptPage structure */}
            {viewingScriptId ? (
              /* Header Section for Script View */
              <>
                <Flex justify="space-between" align="center" flexShrink={0} mb={4}>
                  <HStack spacing="3" align="center">
                    <AppIcon name="script" boxSize="20px" />
                    <Heading as="h2" size="md">{currentScript?.script_name || 'Script'}</Heading>
                    {crewContext?.department_name && (
                      <>
                        <Text color="gray.400" fontSize="lg">—</Text>
                        <Badge 
                          colorScheme="blue"
                          variant="solid"
                          fontSize="sm"
                          style={{ backgroundColor: crewContext.department_color || '#3182CE' }}
                        >
                          {crewContext.department_name}
                        </Badge>
                      </>
                    )}
                    {crewContext?.show_role && (
                      <Badge 
                        colorScheme="green"
                        variant="solid"
                        fontSize="sm"
                      >
                        {formatRoleBadge(crewContext.show_role)}
                      </Badge>
                    )}
                  </HStack>
                  <HStack spacing="2">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={handleBackToShows}
                      _hover={{ bg: 'gray.100' }}
                      _dark={{ _hover: { bg: 'gray.700' } }}
                    >
                      Back
                    </Button>
                  </HStack>
                </Flex>

                {/* Script Content - Full Window */}
                <Box
                  border="1px solid"
                  borderColor="container.border"
                  borderRadius="md"
                  flexGrow={1}
                  overflow="hidden"
                  display="flex"
                  flexDirection="column"
                >
                  {isLoadingScript ? (
                    <Flex justify="center" align="center" height="200px">
                      <VStack spacing={4}>
                        <Spinner size="lg" />
                        <Text>Loading script...</Text>
                      </VStack>
                    </Flex>
                  ) : scriptError ? (
                    <Flex direction="column" align="center" justify="center" height="200px" gap="4">
                      <AppIcon name="warning" boxSize="40px" color="red.400" />
                      <Text color="red.500" textAlign="center">{scriptError}</Text>
                      <Button onClick={handleBackToShows} variant="outline" size="sm">
                        Back to Shows
                      </Button>
                    </Flex>
                  ) : (
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
              /* Show List Mode */
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
                  {/* Loading State */}
                  {isLoading && (
                    <Flex justify="center" align="center" height="200px">
                      <Spinner />
                    </Flex>
                  )}

                  {/* Error State */}
                  {error && (
                    <Text color="red.500" textAlign="center" p="4">
                      {error}
                    </Text>
                  )}

                  {/* Show List */}
                  {!isLoading && !error && (
                    sortedShows.length > 0 ? (
                      <VStack spacing={4} align="stretch">
                        {sortedShows.map(show => (
                          <ShowCard
                            key={show.show_id}
                            show={show}
                            sortBy={sortBy}
                            sortDirection={sortDirection}
                            isSelected={selectedShowId === show.show_id}
                            isHovered={hoveredCardId === show.show_id}
                            onShowHover={setHoveredCardId}
                            onShowClick={handleShowClick}
                            selectedScriptId={null}
                            onScriptClick={handleScriptClick}
                            onCreateScriptClick={() => {}}
                            hideEditButton={true}
                            hideCreateScriptButton={true}
                            hideScriptBadges={true}
                            disableInternalNavigation={true}
                          />
                        ))}
                      </VStack>
                    ) : (
                      <Flex direction="column" align="center" justify="center" height="200px" gap="4">
                        <AppIcon name="show" boxSize="40px" color="gray.400" />
                        <Text color="gray.500" textAlign="center">
                          {sharedData && sharedData.shows ? 
                            "No scripts have been shared with you." : 
                            "No shows have been shared with you."
                          }
                        </Text>
                      </Flex>
                    )
                  )}
                </Box>
              </>
            )}
          </Flex>
        </Box>
      </Box>
    </ErrorBoundary>
  );
  } catch (renderError) {
    console.error('SharedPage render error:', renderError);
    return (
      <Flex
        height="100vh"
        width="100vw"
        align="center"
        justify="center"
        bg="gray.50"
        _dark={{ bg: 'gray.900' }}
        p={4}
      >
        <VStack spacing={4} textAlign="center">
          <AppIcon name="warning" boxSize="48px" color="red.500" />
          <Text fontSize="xl" fontWeight="bold" color="red.500">
            Something went wrong
          </Text>
          <Text color="gray.600" _dark={{ color: 'gray.300' }}>
            Please try refreshing the page or contact support if the problem persists.
          </Text>
          <Button
            onClick={() => window.location.reload()}
            colorScheme="blue"
            size="sm"
          >
            Refresh Page
          </Button>
        </VStack>
      </Flex>
    );
  }
};