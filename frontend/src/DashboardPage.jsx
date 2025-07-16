// frontend/src/DashboardPage.jsx

import React, { useState } from 'react';
import {
  Flex, Box, Heading, useDisclosure,
  Drawer, DrawerBody, DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton
} from "@chakra-ui/react";
import { PinnedView } from './PinnedView';
import { ShowsView } from './ShowsView';
import { VenuesView } from './VenuesView';
import { DepartmentsView } from './DepartmentsView';
import { CrewView } from './CrewView';
import { QuickAccessPanel } from './QuickAccessPanel';
import { useShows } from "./useShows";
import { useDashboardState } from './useDashboardState';
import { CreateShowModal } from "./CreateShowModal";
import { CreateScriptModal } from "./CreateScriptModal";
import { CreateVenueModal } from './CreateVenueModal';
import { CreateDepartmentModal } from "./CreateDepartmentModal";
import { CreateCrewModal } from "./CreateCrewModal";

const DashboardPage = ({ isMenuOpen, onMenuClose }) => {
  const { shows, isLoading, error, refetchShows } = useShows();

  const {
    selectedShowId,
    selectedScriptId,
    hoveredShowId,
    setHoveredShowId,
    handleScriptClick,
    handleShowClick,
    showCardRefs,
    shows: safeShows,
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
        height="100%"
        gap="8"
        p="2rem"
        flexDirection={{ base: 'column', lg: 'row' }}
        boxSizing="border-box"
      >
        <Box
          flexBasis={{ base: '100%', lg: '80%' }}
          display="flex"
          flexDirection="column"
          height={{ base: '100vh', lg: 'auto' }}
          overflowY={{ base: 'auto', lg: 'visible' }}
        >
          {activeView === 'pinned' && (
            <PinnedView
              sortedPins={sortedPins}
              isLoading={isLoading}
              error={error}
            />
          )}
          {activeView === 'shows' && (
            <ShowsView
              shows={shows}
              isLoading={isLoading}
              error={error}
              onShowModalOpen={onShowModalOpen}
              selectedShowId={selectedShowId}
              hoveredShowId={hoveredShowId}
              setHoveredShowId={setHoveredShowId}
              handleShowClick={handleShowClick}
              showCardRefs={showCardRefs}
              selectedScriptId={selectedScriptId}
              handleScriptClick={handleScriptClick}
              handleOpenCreateScriptModal={handleOpenCreateScriptModal}
            />
          )}
          {activeView === 'venues' && (
            <VenuesView /> // No props needed
          )}
          {activeView === 'departments' && (
            <DepartmentsView /> // No props needed
          )}
          {activeView === 'crew' && (
            <CrewView />
          )}
        </Box>

        <Box
          flexBasis={{ base: '0', lg: '20%' }}
          display={{ base: 'none', lg: 'flex' }}
          flexDirection="column"
        >
          <QuickAccessPanel activeView={activeView} setActiveView={setActiveView} />
        </Box>
      </Flex>

      <CreateShowModal isOpen={isShowModalOpen} onClose={onShowModalClose} onShowCreated={refetchShows} />

      {activeShowIdForScript && (
        <CreateScriptModal
          isOpen={isScriptModalOpen}
          onClose={onScriptModalClose}
          showId={activeShowIdForScript}
          onScriptCreated={refetchShows}
        />
      )}

      <Drawer isOpen={isMenuOpen} placement="right" onClose={onMenuClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton
            borderRadius="full"
            border="3px solid"
            borderColor="blue.400"
            bg="inherit"
            _hover={{ borderColor: 'orange.400' }}
          />
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