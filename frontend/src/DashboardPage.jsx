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
    handleScriptClick,
    handleSortClick,
    handleShowClick,
    showCardRefs,
    sortedShows,
    sortedVenues,
    sortedDepartments,
    sortedCrew,
    sortedPins
  } = useDashboardState(shows);

  const { isOpen: isShowModalOpen, onOpen: onShowModalOpen, onClose: onShowModalClose } = useDisclosure();
  const { isOpen: isScriptModalOpen, onOpen: onScriptModalOpen, onClose: onScriptModalClose } = useDisclosure();
  const { isOpen: isVenueModalOpen, onOpen: onVenueModalOpen, onClose: onVenueModalClose } = useDisclosure();
  const { isOpen: isDepartmentModalOpen, onOpen: onDepartmentModalOpen, onClose: onDepartmentModalClose } = useDisclosure();
  const { isOpen: isCrewModalOpen, onOpen: onCrewModalOpen, onClose: onCrewModalClose } = useDisclosure();

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
        <Box
          flexBasis={{ base: '100%', lg: '80%' }}
          display="flex"
          flexDirection="column"
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
              sortedShows={sortedShows}
              isLoading={isLoading}
              error={error}
              sortBy={sortBy}
              sortDirection={sortDirection}
              handleSortClick={handleSortClick}
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
            <VenuesView
              sortedVenues={sortedVenues}
              isLoading={isLoading}
              error={error}
              onVenueModalOpen={onVenueModalOpen}
            />
          )}
          {activeView === 'departments' && (
            <DepartmentsView
              sortedDepartments={sortedDepartments}
              isLoading={isLoading}
              error={error}
              onVenueModalOpen={onDepartmentModalOpen}
            />
          )}
          {activeView === 'crew' && (
            <CrewView
              sortedCrew={sortedCrew}
              isLoading={isLoading}
              error={error}
              onVenueModalOpen={onCrewModalOpen}
            />
          )}
        </Box>

        <Box
          flexBasis={{ base: '0', lg: '20%' }}
          display={{ base: 'none', lg: 'block' }}
        >
          <QuickAccessPanel activeView={activeView} setActiveView={setActiveView} />
        </Box>
      </Flex>

      <CreateShowModal isOpen={isShowModalOpen} onClose={onShowModalClose} onShowCreated={refetchShows} />
      {activeShowIdForScript && (
        <CreateScriptModal isOpen={isScriptModalOpen} onClose={onScriptModalClose} showId={activeShowIdForScript} onScriptCreated={refetchShows} />
      )}

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