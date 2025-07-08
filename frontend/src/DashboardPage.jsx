// frontend/src/DashboardPage.jsx

// Import necessary libraries and components
import React, { useState } from 'react';
import { Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Spinner, Collapse, useDisclosure, Menu, MenuButton, MenuList, MenuItem, IconButton } from "@chakra-ui/react";
import { AddIcon, ChevronDownIcon } from '@chakra-ui/icons';

// Import our custom card components
import { ShowCard } from "./ShowCard";

// Import all our custom hooks
import { useShows } from "./useShows";
import { usePinnedCount } from './usePinnedCount';
import { useDashboardState } from './useDashboardState';

// Import our modals
import { CreateShowModal } from "./CreateShowModal";
import { CreateScriptModal } from "./CreateScriptModal";

// Main DashboardPage component
const DashboardPage = () => {
  const { shows, isLoading, error, refetchShows } = useShows();
  const { pinnedCount } = usePinnedCount();

  // Retrieve and manage dashboard state using our custom hook
  const {
    sortBy,
    sortDirection,
    selectedShowId,
    selectedScriptId,
    hoveredShowId,
    setHoveredShowId,
    handleShowClick,
    handleScriptClick,
    handleSortClick,
    sortedShows
  } = useDashboardState(shows);

  // Modal management using Chakra UI's useDisclosure hook
  const { isOpen: isShowModalOpen, onOpen: onShowModalOpen, onClose: onShowModalClose } = useDisclosure();
  const { isOpen: isScriptModalOpen, onOpen: onScriptModalOpen, onClose: onScriptModalClose } = useDisclosure();
  const [activeShowIdForScript, setActiveShowIdForScript] = useState(null);

  // Function to handle opening the Create Script modal
  const handleOpenCreateScriptModal = (showId) => {
    setActiveShowIdForScript(showId);
    onScriptModalOpen();
  };

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
                <MenuButton as={Button}
                  size="xs"
                  rightIcon={<ChevronDownIcon />}
                  px={3}
                  borderWidth='0px'
                  _hover={{ bg: 'orange.400' }}
                >
                  Sort by: {sortBy === 'showDate' ? 'Show Date' : sortBy === 'showName' ? 'Name' : 'Updated'}
                </MenuButton>
                <MenuList>
                  <MenuItem _hover={{ bg: 'inherit', borderColor: 'orange.400' }} onClick={() => handleSortClick('showName')}>Name</MenuItem>
                  <MenuItem _hover={{ bg: 'inherit', borderColor: 'orange.400' }} onClick={() => handleSortClick('showDate')}>Show Date</MenuItem>
                  <MenuItem _hover={{ bg: 'inherit', borderColor: 'orange.400' }} onClick={() => handleSortClick('dateUpdated')}>Updated</MenuItem>
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
                  {sortedShows.map(show => (
                    <ShowCard
                      key={show.showID}
                      show={show}
                      isSelected={selectedShowId === show.showID}
                      isHovered={hoveredShowId === show.showID}
                      onShowHover={setHoveredShowId}
                      onShowClick={handleShowClick}
                      onCreateScriptClick={handleOpenCreateScriptModal}
                    />
                  ))}
                </VStack>
              ) : (
                <Text>You haven't created any shows yet.</Text>
              )
            )}
          </Box>
        </Box >

        {/* Quick Access Sidebar (30%) */}
        < Box
          flexBasis={['100%', '100%', '30%']}
          display={pinnedCount === 0 ? ['none', 'none', 'block'] : 'block'
          }
        >
          {/* This Flex container aligns the title and the new button */}
          < Flex justify="space-between" align="center" >
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
          </Flex >

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
        </Box >

      </Flex >

      {/* --- Modals --- */}
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