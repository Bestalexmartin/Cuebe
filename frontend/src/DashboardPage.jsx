// frontend/src/DashboardPage.jsx

import React, { useState, useMemo } from 'react';
import {
  Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Spinner, useDisclosure, Menu, MenuButton, MenuList, MenuItem,
  Drawer, DrawerBody, DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton
} from "@chakra-ui/react";
import { ChevronDownIcon } from '@chakra-ui/icons';

// Import all your components and hooks
import { ShowCard } from "./ShowCard";
import { QuickAccessPanel } from './QuickAccessPanel';
import { useShows } from "./useShows";
import { usePinnedCount } from './usePinnedCount';
import { useDashboardState } from './useDashboardState';
import { CreateShowModal } from "./CreateShowModal";
import { CreateScriptModal } from "./CreateScriptModal";

const DashboardPage = ({ isMenuOpen, onMenuClose }) => {
  const { shows, isLoading, error, refetchShows } = useShows();
  const { pinnedCount } = usePinnedCount();

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

  const { isOpen: isShowModalOpen, onOpen: onShowModalOpen, onClose: onShowModalClose } = useDisclosure();
  const { isOpen: isScriptModalOpen, onOpen: onScriptModalOpen, onClose: onScriptModalClose } = useDisclosure();

  const [activeShowIdForScript, setActiveShowIdForScript] = useState(null);
  const [activeView, setActiveView] = useState('shows');

  const handleOpenCreateScriptModal = (showId) => {
    setActiveShowIdForScript(showId);
    onScriptModalOpen();
  };

  return (
    <>

      <Flex
        width="100%"
        gap="8"
        flexDirection={{ base: 'column', lg: 'row' }}
      >
        {/* --- Main Content Area (80%) --- */}
        <Box flexBasis={{ base: '100%', lg: '80%' }}>
          {activeView === 'shows' && (
            <>
              <Flex justify="space-between" align="center">
                <Heading as="h2" size="md">Shows</Heading>
                <HStack spacing="2">
                  <Menu>
                    <MenuButton as={Button} size="xs" rightIcon={<ChevronDownIcon />}>
                      Sort by: {sortBy === 'showDate' ? 'Show Date' : sortBy === 'showName' ? 'Name' : 'Updated'}
                    </MenuButton>
                    <MenuList>
                      <MenuItem onClick={() => handleSortClick('showName')}>Name</MenuItem>
                      <MenuItem onClick={() => handleSortClick('showDate')}>Show Date</MenuItem>
                      <MenuItem onClick={() => handleSortClick('dateUpdated')}>Updated</MenuItem>
                    </MenuList>
                  </Menu>
                  <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />
                  <Button bg="blue.400" color="white" size="xs" onClick={onShowModalOpen} _hover={{ bg: 'orange.400' }} _focus={{ boxShadow: 'none' }}>
                    Create Show
                  </Button>
                </HStack>
              </Flex>
              <Box mt="4" border="1px solid" borderColor="gray.300" p="4" borderRadius="md">
                {isLoading && <Spinner />}
                {error && <Text color="red.500">{error}</Text>}
                {!isLoading && !error && (
                  sortedShows.length > 0 ? (
                    <VStack spacing={4} align="stretch">
                      {sortedShows.map(show => (
                        <ShowCard
                          key={show.showID}
                          show={show}
                          sortBy={sortBy}
                          sortDirection={sortDirection}
                          isSelected={selectedShowId === show.showID}
                          isHovered={hoveredShowId === show.showID}
                          onShowHover={setHoveredShowId}
                          onShowClick={handleShowClick}
                          selectedScriptId={selectedScriptId}
                          onScriptClick={handleScriptClick}
                          onCreateScriptClick={handleOpenCreateScriptModal}
                        />
                      ))}
                    </VStack>
                  ) : (<Text>You haven't created any shows yet.</Text>)
                )}
              </Box>
            </>
          )}
          {activeView === 'venues' && <Heading>Venues Page</Heading>}
          {activeView === 'departments' && <Heading>Departments Page</Heading>}
          {activeView === 'crew' && <Heading>Crew Page</Heading>}
          {activeView === 'pinned' && <Heading>Pinned Scripts Page</Heading>}
        </Box>

        {/* --- DESKTOP Quick Access Sidebar (hidden on mobile) --- */}
        <Box
          flexBasis={{ base: '0', lg: '20%' }}
          display={{ base: 'none', lg: 'block' }}
        >
          <QuickAccessPanel activeView={activeView} setActiveView={setActiveView} />
        </Box>
      </Flex>

      {/* --- Modals --- */}
      <CreateShowModal isOpen={isShowModalOpen} onClose={onShowModalClose} onShowCreated={refetchShows} />
      {activeShowIdForScript && (
        <CreateScriptModal isOpen={isScriptModalOpen} onClose={onScriptModalClose} showId={activeShowIdForScript} onScriptCreated={refetchShows} />
      )}

      {/* --- MOBILE MENU DRAWER --- */}
      <Drawer isOpen={isMenuOpen} placement="right" onClose={onMenuClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton
            borderRadius="full"
            border="3px solid"
            borderColor="blue.400"
            bg="inherit"
            _hover={{ borderColor: 'orange.400' }} /
          >
          <DrawerHeader>Quick•Access</DrawerHeader>
          <DrawerBody>
            <QuickAccessPanel activeView={activeView} setActiveView={setActiveView} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default DashboardPage;