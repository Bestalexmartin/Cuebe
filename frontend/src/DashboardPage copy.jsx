// frontend/src/DashboardPage.jsx

import React, { useState, useMemo } from 'react';

import { Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Spinner, Collapse, useDisclosure, Menu, MenuButton, MenuList, MenuItem, IconButton } from "@chakra-ui/react";
import { ChevronDownIcon } from '@chakra-ui/icons';
import { useShows } from "./useShows";
import { usePinnedCount } from './usePinnedCount';
import { CreateShowModal } from "./CreateShowModal";
import { CreateScriptModal } from "./CreateScriptModal";

const DashboardPage = () => {
  const { shows, isLoading, error, refetchShows } = useShows();
  const { pinnedCount } = usePinnedCount();

  const [sortBy, setSortBy] = useState('dateUpdated');
  const [sortDirection, setSortDirection] = useState('desc');

  const { isOpen: isShowModalOpen, onOpen: onShowModalOpen, onClose: onShowModalClose } = useDisclosure();
  const { isOpen: isScriptModalOpen, onOpen: onScriptModalOpen, onClose: onScriptModalClose } = useDisclosure();

  const [selectedShowId, setSelectedShowId] = useState(null);
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [activeShowIdForScript, setActiveShowIdForScript] = useState(null);

  // This single state now tracks which show card is being hovered
  const [hoveredShowId, setHoveredShowId] = useState(null);

  const handleShowClick = (showId) => {
    setSelectedShowId(selectedShowId === showId ? null : showId);
  };

  const handleScriptClick = (scriptId) => {
    setSelectedScriptId(selectedScriptId === scriptId ? null : scriptId);
  };

  const handleOpenCreateScriptModal = (showId) => {
    setActiveShowIdForScript(showId);
    onScriptModalOpen();
  };

  const handleSortClick = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortDirection(newSortBy === 'dateUpdated' ? 'desc' : 'asc');
    }
  };

  const sortedShows = useMemo(() => {
    const showsToSort = [...shows];
    showsToSort.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'showName') {
        comparison = a.showName.localeCompare(b.showName);
      } else if (sortBy === 'showDate') {
        if (!a.showDate) return 1;
        if (!b.showDate) return -1;
        comparison = new Date(a.showDate) - new Date(b.showDate);
      } else {
        comparison = new Date(b.dateUpdated) - new Date(a.dateUpdated);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return showsToSort;
  }, [shows, sortBy, sortDirection]);

  return (
    <>
      <Flex
        width="100%"
        gap="8"
        flexDirection={['column-reverse', 'column-reverse', 'row']}
      >
        <Box flexBasis={['100%', '100%', '70%']}>
          <Flex justify="space-between" align="center">
            <Heading as="h2" size="md">Shows</Heading>
            <HStack spacing="2">
              <Menu>
                <MenuButton as={Button} size="" rightIcon={<ChevronDownIcon />}>
                  Sort by: {sortBy === 'showDate' ? 'Show Date' : sortBy === 'showName' ? 'Name' : 'Updated'}
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={() => handleSortClick('showName')}>Name</MenuItem>
                  <MenuItem onClick={() => handleSortClick('showDate')}>Show Date</MenuItem>
                  <MenuItem onClick={() => handleSortClick('dateUpdated')}>Updated</MenuItem>
                </MenuList>
              </Menu>
              <Divider orientation="vertical" height="20px" borderColor="gray.200" mx="4" />

              <Button
                bg="blue.400"
                color="white"
                size="xs"
                onClick={onShowModalOpen}
                _hover={{ bg: 'orange.400' }}
                _focus={{ boxShadow: 'none' }}
              >
                Create Show
              </Button>
            </HStack>
          </Flex>

          <Box
            mt="4"
            border="1px solid"
            borderColor="gray.300"
            p="4"
            borderRadius="md"
          >
            {isLoading && <Spinner />}
            {error && <Text color="red.500">{error}</Text>}
            {!isLoading && !error && (
              sortedShows.length > 0 ? (
                <VStack spacing={4} align="stretch">
                  {sortedShows.map(show => {
                    const sortedScripts = show.scripts ? [...show.scripts].sort((a, b) => {
                      let comparison = 0;
                      if (sortBy === 'showName') {
                        comparison = a.scriptName.localeCompare(b.scriptName);
                      } else {
                        comparison = new Date(b.dateUpdated) - new Date(a.dateUpdated);
                      }
                      return sortDirection === 'asc' ? comparison : -comparison;
                    }) : [];

                    const getShowBorderColor = () => {
                      if (hoveredShowId === show.showID) return 'orange.400';
                      if (selectedShowId === show.showID) return 'blue.400';
                      return 'gray.600';
                    };

                    return (
                      <Box
                        key={show.showID}
                        p="4"
                        borderWidth="2px"
                        borderRadius="md"
                        shadow="sm"
                        cursor="pointer"
                        onClick={() => handleShowClick(show.showID)}
                        borderColor={getShowBorderColor()}
                        onMouseEnter={() => setHoveredShowId(show.showID)}
                        onMouseLeave={() => setHoveredShowId(null)}
                      >
                        <Flex justify="space-between" align="center">
                          <Heading size="sm">{show.showName}</Heading>
                          {selectedShowId === show.showID && (
                            <Button
                              bg="blue.400"
                              color="white"
                              size="xs"
                              onClick={(e) => { e.stopPropagation(); handleOpenCreateScriptModal(show.showID); }}
                              _hover={{ bg: 'orange.400' }}
                              _focus={{ boxShadow: 'none' }}
                            >
                              Create Script
                            </Button>
                          )}
                        </Flex>
                        <Text fontSize="sm" color="gray.400" mt={2}>{show.showVenue || 'No venue set'}</Text>
                        <HStack mt={2} justify="space-between" fontSize="xs" color="gray.400">
                          <Text>Date: {show.showDate ? new Date(show.showDate).toLocaleDateString() : 'N/A'}</Text>
                          <Text>Scripts: {show.scripts ? show.scripts.length : 0}</Text>
                          <Text>Updated: {new Date(show.dateUpdated).toLocaleDateString()}</Text>
                        </HStack>
                        <Collapse in={selectedShowId === show.showID} animateOpacity>
                          <Box pl="8" pt="4">
                            {sortedScripts.length > 0 ? (
                              <VStack spacing={2} align="stretch">
                                {sortedScripts.map(script => (
                                  <Box
                                    key={script.scriptID}
                                    p="3"
                                    borderWidth="2px"
                                    borderRadius="md"
                                    shadow="sm"
                                    cursor="pointer"
                                    onClick={(e) => { e.stopPropagation(); handleScriptClick(script.scriptID); }}
                                    borderColor={selectedScriptId === script.scriptID ? 'blue.400' : 'gray.600'}
                                    _hover={{ borderColor: 'orange.400' }}
                                    // --- CORRECTED LOGIC ---
                                    // When entering a script card, cancel the parent's hover state.
                                    onMouseEnter={() => setHoveredShowId(null)}
                                    // When leaving a script card, restore the parent's hover state.
                                    onMouseLeave={() => setHoveredShowId(show.showID)}
                                  >
                                    <Flex justify="space-between" align="center">
                                      <Heading size="sm" mb="0">{script.scriptName}</Heading>
                                      <Text fontSize="xs" color="gray.500">
                                        Updated: {new Date(script.dateUpdated).toLocaleDateString()}
                                      </Text>
                                    </Flex>
                                  </Box>
                                ))}
                              </VStack>
                            ) : (
                              <Text fontSize="sm" fontStyle="italic" pl={2}>No scripts for this show.</Text>
                            )}
                          </Box>
                        </Collapse>
                      </Box>
                    );
                  })}
                </VStack>
              ) : (
                <Text>You haven't created any shows yet.</Text>
              )
            )}
          </Box>
        </Box>

        {/* Quick Access Sidebar (30%) */}
        <Box
          flexBasis={['100%', '100%', '30%']}
          display={pinnedCount === 0 ? ['none', 'none', 'block'] : 'block'}
        >
          {/* This Flex container aligns the title and the new button */}
          <Flex justify="space-between" align="center">
            <Heading as="h2" size="md"></Heading>
            <Button
              bg="blue.400"
              color="white"
              size="xs"
              _hover={{ bg: 'orange.400' }}
              _focus={{ boxShadow: 'none' }}
            >
              Options
            </Button>
          </Flex>

          <Box
            mt="4"
            border="1px solid"
            borderColor="gray.300"
            p="4"
            borderRadius="md"
          >
            <VStack spacing={4} align="stretch">
              {/* Placeholder for Recent Script with a DOTTED border */}
              <Box borderWidth="2px" borderRadius="md" p="4" shadow="sm" borderStyle="dashed" borderColor="gray.600">
                <Heading size="xs" textTransform="uppercase">Recent Script</Heading>
                <Text pt="2" fontSize="sm" color="gray.400">
                  Placeholder for last edited script.
                </Text>
              </Box>

              {/* Other cards with a SOLID border */}
              <Box borderWidth="2px" borderRadius="md" p="4" shadow="sm" cursor="pointer" borderColor="gray.600" _hover={{ borderColor: 'orange.400' }}>
                <Heading size="xs" textTransform="uppercase">Venues</Heading>
                <Text pt="2" fontSize="sm" color="gray.400">
                  Manage your list of venues.
                </Text>
              </Box>
              <Box borderWidth="2px" borderRadius="md" p="4" shadow="sm" cursor="pointer" borderColor="gray.600" _hover={{ borderColor: 'orange.400' }}>
                <Heading size="xs" textTransform="uppercase">Departments</Heading>
                <Text pt="2" fontSize="sm" color="gray.400" >
                  Manage your list of departments.
                </Text>
              </Box>
              <Box borderWidth="2px" borderRadius="md" p="4" shadow="sm" cursor="pointer" borderColor="gray.600" _hover={{ borderColor: 'orange.400' }}>
                <Heading size="xs" textTransform="uppercase">Crew</Heading>
                <Text pt="2" fontSize="sm" color="gray.400" >
                  Manage your crew members.
                </Text>
              </Box>
            </VStack>
          </Box>
        </Box>

      </Flex>
      <CreateShowModal
        isOpen={isShowModalOpen}
        onClose={onShowModalClose}
        onShowCreated={refetchShows}
      />
      {activeShowIdForScript && (
        <CreateScriptModal
          isOpen={isScriptModalOpen}
          onClose={onScriptModalClose}
          showId={activeShowIdForScript}
          onScriptCreated={refetchShows}
        />
      )}
    </>
  );
};

export default DashboardPage;