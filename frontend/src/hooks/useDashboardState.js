// frontend/src/hooks/useDashboardState.js

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';

const SCROLL_DELAY = 100; // Configurable scroll delay

export const useDashboardState = (shows) => {
  const [currentView, setCurrentView] = useState('shows');
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [selectedShowId, setSelectedShowId] = useState(null);
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [selectedVenueId, setSelectedVenueId] = useState(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [selectedCrewId, setSelectedCrewId] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false); // NEW: Track if we've completed initial restore
  const showCardRefs = useRef({});

  // Enhanced navigation memory functions
  const saveNavigationState = useCallback((view) => {
    if (isRestoring || !hasInitialized) return; // Don't save during restoration OR before initialization

    const navigationState = {
      view,
      selectedShowId,
      selectedScriptId,
      selectedVenueId,
      selectedDepartmentId,
      selectedCrewId,
      timestamp: Date.now()
    };

    sessionStorage.setItem('dashboardNavigationState', JSON.stringify(navigationState));
    setCurrentView(view);
  }, [isRestoring, hasInitialized, selectedShowId, selectedScriptId, selectedVenueId, selectedDepartmentId, selectedCrewId]);

  // Function to save current state immediately (for navigation)
  const saveCurrentNavigationState = useCallback(() => {
    if (!hasInitialized) return; // Don't save if we haven't initialized yet

    const navigationState = {
      view: currentView,
      selectedShowId,
      selectedScriptId,
      selectedVenueId,
      selectedDepartmentId,
      selectedCrewId,
      timestamp: Date.now()
    };

    sessionStorage.setItem('dashboardNavigationState', JSON.stringify(navigationState));
  }, [currentView, selectedShowId, selectedScriptId, selectedVenueId, selectedDepartmentId, selectedCrewId, hasInitialized]);

  const restoreNavigationState = useCallback(() => {
    try {
      const savedState = sessionStorage.getItem('dashboardNavigationState');
      if (savedState) {
        setIsRestoring(true);
        const state = JSON.parse(savedState);

        // Restore ALL selections
        setCurrentView(state.view);
        setSelectedShowId(state.selectedShowId || null);
        setSelectedScriptId(state.selectedScriptId || null);
        setSelectedVenueId(state.selectedVenueId || null);
        setSelectedDepartmentId(state.selectedDepartmentId || null);
        setSelectedCrewId(state.selectedCrewId || null);

        // Scroll to the selected item in the current view after a delay
        setTimeout(() => {
          const currentSelection =
            state.view === 'shows' ? state.selectedShowId :
              state.view === 'venues' ? state.selectedVenueId :
                state.view === 'departments' ? state.selectedDepartmentId :
                  state.view === 'crew' ? state.selectedCrewId : null;

          if (currentSelection) {
            const targetRef = showCardRefs.current[currentSelection];
            if (targetRef) {
              targetRef.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
              });
            }
          }

          // Mark restoration as complete and initialization as done
          setIsRestoring(false);
          setHasInitialized(true);
        }, SCROLL_DELAY * 2);
      } else {
        // No saved state, just mark as initialized
        setHasInitialized(true);
      }
    } catch (error) {
      setIsRestoring(false);
      setHasInitialized(true);
    }
  }, []);

  const clearNavigationState = useCallback(() => {
    sessionStorage.removeItem('dashboardNavigationState');
    // Also clear all current selections
    setSelectedShowId(null);
    setSelectedScriptId(null);
    setSelectedVenueId(null);
    setSelectedDepartmentId(null);
    setSelectedCrewId(null);
    setHasInitialized(true); // Mark as initialized even after clearing
  }, []);

  // Restore navigation state on mount - ONLY ONCE
  useEffect(() => {
    if (!hasInitialized) {
      restoreNavigationState();
    }
  }, [restoreNavigationState, hasInitialized]);

  // Save state whenever any selection changes - BUT NOT during restoration OR before initialization
  useEffect(() => {
    if (hasInitialized && !isRestoring) {
      saveNavigationState(currentView);
    }
  }, [selectedShowId, selectedScriptId, selectedVenueId, selectedDepartmentId, selectedCrewId, currentView, saveNavigationState, hasInitialized, isRestoring]);

  // Save state when component unmounts (dashboard navigation away)
  useEffect(() => {
    return () => {
      if (hasInitialized && !isRestoring) {
        saveCurrentNavigationState();
      }
    };
  }, [saveCurrentNavigationState, hasInitialized, isRestoring]);

  const handleShowClick = (showId) => {
    const newSelectedShowId = selectedShowId === showId ? null : showId;
    setSelectedShowId(newSelectedShowId);
    setSelectedScriptId(null);

    // Scroll logic
    setTimeout(() => {
      const targetRef = showCardRefs.current[showId];
      if (targetRef) {
        targetRef.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }, SCROLL_DELAY);
  };

  const handleScriptClick = (scriptId) => {
    const newSelectedScriptId = selectedScriptId === scriptId ? null : scriptId;
    setSelectedScriptId(newSelectedScriptId);
  };

  const handleVenueClick = (venueId) => {
    const newSelectedVenueId = selectedVenueId === venueId ? null : venueId;
    setSelectedVenueId(newSelectedVenueId);
  };

  const handleDepartmentClick = (departmentId) => {
    const newSelectedDepartmentId = selectedDepartmentId === departmentId ? null : departmentId;
    setSelectedDepartmentId(newSelectedDepartmentId);
  };

  const handleCrewClick = (crewId) => {
    const newSelectedCrewId = selectedCrewId === crewId ? null : crewId;
    setSelectedCrewId(newSelectedCrewId);
  };

  // View change handler
  const handleViewChange = (newView) => {
    setCurrentView(newView);
  };

  // Pass through shows data with null safety
  const safeShows = useMemo(() => {
    if (!shows || shows.length === 0) return [];
    return shows;
  }, [shows]);

  return {
    // Existing state
    selectedShowId,
    selectedScriptId,
    selectedVenueId,
    selectedDepartmentId,
    selectedCrewId,
    hoveredCardId,
    setHoveredCardId,
    showCardRefs,
    currentView,
    shows: safeShows,

    // Existing handlers
    handleShowClick,
    handleScriptClick,
    handleVenueClick,
    handleDepartmentClick,
    handleCrewClick,
    handleViewChange,

    // Navigation state management
    saveNavigationState,
    saveCurrentNavigationState,
    restoreNavigationState,
    clearNavigationState,
  };
};