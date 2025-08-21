// frontend/src/pages/DashboardPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Flex, Box,
  Drawer, DrawerBody, DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton
} from "@chakra-ui/react";
import { useLocation } from 'react-router-dom';
import { QuickAccessPanel } from '../components/layout/QuickAccessPanel';
import { useShows } from "../features/shows/hooks/useShows";
import { useDashboardState } from '../hooks/useDashboardState';
import { useModalManager } from '../hooks/useModalManager';
import { useModalActions } from '../hooks/useModalActions';
import { clearSavedDepartmentMappings } from '../features/script/import/utils/departmentMappingStorage';
import { useEnhancedToast } from '../utils/toastUtils';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ModalRenderer } from '../components/dashboard/ModalRenderer';
import { ViewRenderer } from '../components/dashboard/ViewRenderer';
import { DashboardProvider } from '../contexts/DashboardContext';

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

const DashboardPage = React.memo<DashboardPageProps>(({ isMenuOpen, onMenuClose }) => {
  const location = useLocation();
  const { shows, isLoading, error, refetchShows } = useShows();
  const { activeModal, modalData, isOpen, openModal, closeModal } = useModalManager();
  const { showSuccess } = useEnhancedToast();

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

  // Modal actions hook
  const {
    handleDataRefresh,
    handleCreateShow,
    handleCreateScript,
    handleImportScript,
    handleCreateVenue,
    handleCreateDepartment,
    handleCreateCrew,
  } = useModalActions({ openModal, refetchShows, setRefreshKey });

  // Handle clearing department mappings
  const handleClearDepartmentMapping = useCallback((_showId: string) => {
    clearSavedDepartmentMappings();
    showSuccess('Department Mappings Cleared', 'Saved department mappings have been cleared for future imports');
  }, [showSuccess]);

  // Memoized sort change handlers (after useDashboardState)
  const handleShowsSortChange = useCallback((sortBy: string, sortDirection: string) => {
    updateSortState('shows', sortBy, sortDirection as "asc" | "desc");
  }, [updateSortState]);

  const handleVenuesSortChange = useCallback((sortBy: string, sortDirection: string) => {
    updateSortState('venues', sortBy, sortDirection as "asc" | "desc");
  }, [updateSortState]);

  const handleDepartmentsSortChange = useCallback((sortBy: string, sortDirection: string) => {
    updateSortState('departments', sortBy, sortDirection as "asc" | "desc");
  }, [updateSortState]);

  const handleCrewSortChange = useCallback((sortBy: string, sortDirection: string) => {
    updateSortState('crew', sortBy, sortDirection as "asc" | "desc");
  }, [updateSortState]);

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
          <DashboardProvider
            hoveredCardId={hoveredCardId}
            setHoveredCardId={setHoveredCardId}
            showCardRefs={showCardRefs}
            saveCurrentNavigationState={saveCurrentNavigationState}
          >
            <ViewRenderer
              currentView={currentView}
              refreshKey={refreshKey}
              shows={shows}
              isLoading={isLoading}
              error={error}
              selectedShowId={selectedShowId}
              selectedScriptId={selectedScriptId}
              handleShowClick={handleShowClick}
              handleScriptClick={handleScriptClick}
              onCreateShow={handleCreateShow}
              onCreateScript={handleCreateScript}
              onImportScript={handleImportScript}
              onClearDepartmentMappingClick={handleClearDepartmentMapping}
              selectedVenueId={selectedVenueId}
              handleVenueClick={handleVenueClick}
              onCreateVenue={handleCreateVenue}
              selectedDepartmentId={selectedDepartmentId}
              handleDepartmentClick={handleDepartmentClick}
              onCreateDepartment={handleCreateDepartment}
              selectedCrewId={selectedCrewId}
              handleCrewClick={handleCrewClick}
              onCreateCrew={handleCreateCrew}
              sortState={sortState}
              handleShowsSortChange={handleShowsSortChange}
              handleVenuesSortChange={handleVenuesSortChange}
              handleDepartmentsSortChange={handleDepartmentsSortChange}
              handleCrewSortChange={handleCrewSortChange}
            />
          </DashboardProvider>
        </Box>

        <Box
          width={{ base: '0', lg: '330px' }}
          minWidth={{ base: '0', lg: '330px' }}
          display={{ base: 'none', lg: 'flex' }}
          flexDirection="column"
          flexShrink={0}
        >
          <DashboardProvider
            hoveredCardId={hoveredCardId}
            setHoveredCardId={setHoveredCardId}
            showCardRefs={showCardRefs}
            saveCurrentNavigationState={saveCurrentNavigationState}
          >
            <QuickAccessPanel 
              activeView={currentView} 
              setActiveView={hookHandleViewChange} 
              onSaveNavigationState={saveCurrentNavigationState}
            />
          </DashboardProvider>
        </Box>
      </Flex>

      {/* Single modal renderer */}
      <ModalRenderer
        activeModal={activeModal}
        isOpen={isOpen}
        modalData={modalData}
        onClose={closeModal}
        onDataRefresh={handleDataRefresh}
        openModal={openModal}
      />

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
            <DashboardProvider
              hoveredCardId={hoveredCardId}
              setHoveredCardId={setHoveredCardId}
              showCardRefs={showCardRefs}
              saveCurrentNavigationState={saveCurrentNavigationState}
            >
              <QuickAccessPanel 
                activeView={currentView} 
                setActiveView={hookHandleViewChange} 
                onSaveNavigationState={saveCurrentNavigationState}
              />
            </DashboardProvider>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </ErrorBoundary>
  );
});

export default DashboardPage;