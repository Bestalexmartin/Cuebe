// frontend/src/DashboardPage.jsx

import React, { useState, useEffect } from 'react';
import {
  Flex, Box, Heading,
  Drawer, DrawerBody, DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton
} from "@chakra-ui/react";
import { useLocation } from 'react-router-dom';
import { ShowsView } from './ShowsView';
import { VenuesView } from './VenuesView';
import { DepartmentsView } from './DepartmentsView';
import { CrewView } from './CrewView';
import { QuickAccessPanel } from './QuickAccessPanel';
import { useShows } from "./hooks/useShows";
import { useDashboardState } from './hooks/useDashboardState';
import { useModalManager, MODAL_TYPES } from './hooks/useModalManager';

// Import all modals
import { CreateShowModal } from "./components/modals/CreateShowModal";
import { CreateScriptModal } from "./components/modals/CreateScriptModal";
import { CreateVenueModal } from "./components/modals/CreateVenueModal";
import { CreateDepartmentModal } from "./components/modals/CreateDepartmentModal";
import { CreateCrewModal } from "./components/modals/CreateCrewModal";

const DashboardPage = ({ isMenuOpen, onMenuClose }) => {
  const location = useLocation();
  const { shows, isLoading, error, refetchShows } = useShows();
  const { activeModal, modalData, isOpen, openModal, closeModal } = useModalManager();

  const {
    selectedShowId,
    selectedScriptId,
    hoveredCardId,
    selectedVenueId,
    selectedDepartmentId,
    selectedCrewId,
    setHoveredCardId,
    handleShowClick,
    handleScriptClick,
    handleVenueClick,
    handleDepartmentClick,
    handleCrewClick,
    showCardRefs,
    shows: safeShows,
    currentView,
    handleViewChange: hookHandleViewChange,
    saveNavigationState,
    saveCurrentNavigationState,
    restoreNavigationState,
    clearNavigationState,
  } = useDashboardState(shows);

  // Use local state for activeView, initialized from currentView
  const [activeView, setActiveView] = useState('shows');

  // Sync activeView with currentView from hook
  useEffect(() => {
    if (location.state?.returnFromEdit) {
      const { view } = location.state;
      setActiveView(view);
      hookHandleViewChange(view);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleViewChange = (newView) => {
    setActiveView(newView);
    hookHandleViewChange(newView);
  };

  // Modal handlers
  const handleCreateShow = () => openModal(MODAL_TYPES.CREATE_SHOW);
  const handleCreateScript = (showId) => openModal(MODAL_TYPES.CREATE_SCRIPT, { showId });
  const handleCreateVenue = () => openModal(MODAL_TYPES.CREATE_VENUE);
  const handleCreateDepartment = () => openModal(MODAL_TYPES.CREATE_DEPARTMENT);
  const handleCreateCrew = () => openModal(MODAL_TYPES.CREATE_CREW);

  // Data refresh handlers
  const handleDataRefresh = () => {
    refetchShows();
    // Add other refetch calls as needed
  };

  const renderModal = () => {
    switch (activeModal) {
      case MODAL_TYPES.CREATE_SHOW:
        return (
          <CreateShowModal
            isOpen={isOpen}
            onClose={closeModal}
            onShowCreated={handleDataRefresh}
          />
        );
      case MODAL_TYPES.CREATE_SCRIPT:
        return (
          <CreateScriptModal
            isOpen={isOpen}
            onClose={closeModal}
            showId={modalData.showId}
            onScriptCreated={handleDataRefresh}
          />
        );
      case MODAL_TYPES.CREATE_VENUE:
        return (
          <CreateVenueModal
            isOpen={isOpen}
            onClose={closeModal}
            onVenueCreated={handleDataRefresh}
          />
        );
      case MODAL_TYPES.CREATE_DEPARTMENT:
        return (
          <CreateDepartmentModal
            isOpen={isOpen}
            onClose={closeModal}
            onDepartmentCreated={handleDataRefresh}
          />
        );
      case MODAL_TYPES.CREATE_CREW:
        return (
          <CreateCrewModal
            isOpen={isOpen}
            onClose={closeModal}
            onCrewCreated={handleDataRefresh}
          />
        );
      default:
        return null;
    }
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
          {activeView === 'shows' && (
            <ShowsView
              shows={shows}
              isLoading={isLoading}
              error={error}
              onCreateShow={handleCreateShow}
              selectedShowId={selectedShowId}
              hoveredCardId={hoveredCardId}
              setHoveredCardId={setHoveredCardId}
              handleShowClick={handleShowClick}
              showCardRefs={showCardRefs}
              selectedScriptId={selectedScriptId}
              handleScriptClick={handleScriptClick}
              onCreateScript={handleCreateScript}
              onSaveNavigationState={saveCurrentNavigationState}
            />
          )}
          {activeView === 'venues' && (
            <VenuesView
              onCreateVenue={handleCreateVenue}
              selectedVenueId={selectedVenueId}
              onVenueClick={handleVenueClick}
              hoveredCardId={hoveredCardId}
              setHoveredCardId={setHoveredCardId}
              onSaveNavigationState={saveCurrentNavigationState}
            />
          )}
          {activeView === 'departments' && (
            <DepartmentsView
              onCreateDepartment={handleCreateDepartment}
              selectedDepartmentId={selectedDepartmentId}
              onDepartmentClick={handleDepartmentClick}
              hoveredCardId={hoveredCardId}
              setHoveredCardId={setHoveredCardId}
              onSaveNavigationState={saveCurrentNavigationState}
            />
          )}
          {activeView === 'crew' && (
            <CrewView
              onCreateCrew={handleCreateCrew}
              selectedCrewId={selectedCrewId}
              onCrewClick={handleCrewClick}
              hoveredCardId={hoveredCardId}
              setHoveredCardId={setHoveredCardId}
              onSaveNavigationState={saveCurrentNavigationState}
            />
          )}
        </Box>

        <Box
          flexBasis={{ base: '0', lg: '20%' }}
          display={{ base: 'none', lg: 'flex' }}
          flexDirection="column"
        >
          <QuickAccessPanel activeView={activeView} setActiveView={handleViewChange} />
        </Box>
      </Flex>

      {/* Single modal renderer */}
      {renderModal()}

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
            <QuickAccessPanel activeView={activeView} setActiveView={handleViewChange} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default DashboardPage;