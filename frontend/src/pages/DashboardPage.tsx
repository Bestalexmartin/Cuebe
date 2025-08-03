// frontend/src/pages/DashboardPage.tsx

import React, { useState, useEffect } from 'react';
import {
  Flex, Box,
  Drawer, DrawerBody, DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton
} from "@chakra-ui/react";
import { useLocation } from 'react-router-dom';
import { ShowsView } from '../features/shows/components/ShowsView';
import { VenuesView } from '../features/venues/components/VenuesView';
import { DepartmentsView } from '../features/departments/components/DepartmentsView';
import { CrewView } from '../features/crew/components/CrewView';
import { QuickAccessPanel } from '../components/layout/QuickAccessPanel';
import { useShows } from "../features/shows/hooks/useShows";
import { useDashboardState } from '../hooks/useDashboardState';
import { useModalManager, MODAL_TYPES } from '../hooks/useModalManager';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Import all modals
import { CreateShowModal } from "../features/shows/components/modals/CreateShowModal";
import { CreateScriptModal } from "../features/shows/components/modals/CreateScriptModal";
import { CreateVenueModal } from "../features/venues/components/modals/CreateVenueModal";
import { CreateDepartmentModal } from "../features/departments/components/modals/CreateDepartmentModal";
import { CreateCrewModal } from "../features/crew/components/modals/CreateCrewModal";

// TypeScript interfaces
interface DashboardPageProps {
  isMenuOpen: boolean;
  onMenuClose: () => void;
}

interface LocationState {
  returnFromEdit?: boolean;
  returnFromManage?: boolean;
  view?: string;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ isMenuOpen, onMenuClose }) => {
  const location = useLocation();
  const { shows, isLoading, error, refetchShows } = useShows();
  const { activeModal, modalData, isOpen, openModal, closeModal } = useModalManager();

  // Simple refresh key to force re-mounting/re-fetching
  const [refreshKey, setRefreshKey] = useState(0);

  // Check if we're returning from edit/manage to skip session storage restoration
  const state = location.state as LocationState;
  const skipSessionRestore = Boolean(state?.returnFromEdit || state?.returnFromManage);

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
    shows: _safeShows,
    handleViewChange: hookHandleViewChange,
    saveCurrentNavigationState,
    sortState,
    updateSortState,
    currentView,
  } = useDashboardState(shows, skipSessionRestore);

  // Sync with navigation state from route
  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.returnFromEdit) {
      const { view } = state;
      if (view) {
        hookHandleViewChange(view);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state]); // Removed hookHandleViewChange from dependencies to prevent loop

  // Modal handlers
  const handleCreateShow = () => openModal(MODAL_TYPES.createShow);
  const handleCreateScript = (showId: string) => openModal(MODAL_TYPES.createScript, { showId });
  const handleCreateVenue = () => openModal(MODAL_TYPES.createVenue);
  const handleCreateDepartment = () => openModal(MODAL_TYPES.createDepartment);
  const handleCreateCrew = () => openModal(MODAL_TYPES.createCrew);

  // Data refresh handlers
  const handleDataRefresh = () => {
    refetchShows();
    setRefreshKey(prev => prev + 1); // Force re-mount of view components
  };

  const renderModal = () => {
    switch (activeModal) {
      case MODAL_TYPES.createShow:
        return (
          <CreateShowModal
            isOpen={isOpen}
            onClose={closeModal}
            onShowCreated={handleDataRefresh}
          />
        );
      case MODAL_TYPES.createScript:
        return (
          <CreateScriptModal
            isOpen={isOpen}
            onClose={closeModal}
            showId={modalData.showId}
            onScriptCreated={handleDataRefresh}
          />
        );
      case MODAL_TYPES.createVenue:
        return (
          <CreateVenueModal
            isOpen={isOpen}
            onClose={closeModal}
            onVenueCreated={handleDataRefresh}
          />
        );
      case MODAL_TYPES.createDepartment:
        return (
          <CreateDepartmentModal
            isOpen={isOpen}
            onClose={closeModal}
            onDepartmentCreated={handleDataRefresh}
          />
        );
      case MODAL_TYPES.createCrew:
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
    <ErrorBoundary context="Dashboard Page">
      <Flex
        width="100%"
        height="100%"
        gap="8"
        p="2rem"
        flexDirection={{ base: 'column', lg: 'row' }}
        boxSizing="border-box"
      >
        <Box
          flex="1"
          display="flex"
          flexDirection="column"
          height={{ base: '100vh', lg: 'auto' }}
          overflowY={{ base: 'auto', lg: 'visible' }}
        >
          {currentView === 'shows' && (
            <ShowsView
              key={`shows-${refreshKey}`}
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
              sortBy={sortState.shows.sortBy}
              sortDirection={sortState.shows.sortDirection}
              onSortChange={(sortBy, sortDirection) => updateSortState('shows', sortBy, sortDirection)}
            />
          )}
          {currentView === 'venues' && (
            <VenuesView
              key={`venues-${refreshKey}`}
              onCreateVenue={handleCreateVenue}
              selectedVenueId={selectedVenueId}
              onVenueClick={handleVenueClick}
              hoveredCardId={hoveredCardId}
              setHoveredCardId={setHoveredCardId}
              onSaveNavigationState={saveCurrentNavigationState}
              sortBy={sortState.venues.sortBy}
              sortDirection={sortState.venues.sortDirection}
              onSortChange={(sortBy, sortDirection) => updateSortState('venues', sortBy, sortDirection)}
              showCardRefs={showCardRefs}
            />
          )}
          {currentView === 'departments' && (
            <DepartmentsView
              key={`departments-${refreshKey}`}
              onCreateDepartment={handleCreateDepartment}
              selectedDepartmentId={selectedDepartmentId}
              onDepartmentClick={handleDepartmentClick}
              hoveredCardId={hoveredCardId}
              setHoveredCardId={setHoveredCardId}
              onSaveNavigationState={saveCurrentNavigationState}
              sortBy={sortState.departments.sortBy}
              sortDirection={sortState.departments.sortDirection}
              onSortChange={(sortBy, sortDirection) => updateSortState('departments', sortBy, sortDirection)}
              showCardRefs={showCardRefs}
            />
          )}
          {currentView === 'crew' && (
            <CrewView
              key={`crew-${refreshKey}`}
              onCreateCrew={handleCreateCrew}
              selectedCrewId={selectedCrewId}
              onCrewClick={handleCrewClick}
              hoveredCardId={hoveredCardId}
              setHoveredCardId={setHoveredCardId}
              onSaveNavigationState={saveCurrentNavigationState}
              sortBy={sortState.crew.sortBy}
              sortDirection={sortState.crew.sortDirection}
              onSortChange={(sortBy, sortDirection) => updateSortState('crew', sortBy, sortDirection)}
              showCardRefs={showCardRefs}
            />
          )}
        </Box>

        <Box
          width={{ base: '0', lg: '330px' }}
          minWidth={{ base: '0', lg: '330px' }}
          display={{ base: 'none', lg: 'flex' }}
          flexDirection="column"
          flexShrink={0}
        >
          <QuickAccessPanel 
            activeView={currentView} 
            setActiveView={hookHandleViewChange} 
            onSaveNavigationState={saveCurrentNavigationState}
          />
        </Box>
      </Flex>

      {/* Single modal renderer */}
      {renderModal()}

      <Drawer isOpen={isMenuOpen} placement="right" onClose={onMenuClose}>
        <DrawerOverlay />
        <DrawerContent bg="page.background">
          <DrawerCloseButton
            borderRadius="full"
            border="3px solid"
            borderColor="blue.400"
            bg="inherit"
            _hover={{ borderColor: 'orange.400' }}
          />
          <DrawerHeader>Quick•Access</DrawerHeader>
          <DrawerBody>
            <QuickAccessPanel 
            activeView={currentView} 
            setActiveView={hookHandleViewChange} 
            onSaveNavigationState={saveCurrentNavigationState}
          />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </ErrorBoundary>
  );
};

export default DashboardPage;