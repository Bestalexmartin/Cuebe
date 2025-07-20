// frontend/src/hooks/useDashboardState.ts

import { useState, useMemo, useRef, useEffect, useCallback, MutableRefObject } from 'react';

// TypeScript interfaces
interface Show {
  showID: string;
  showName: string;
  showDate?: string;
  dateCreated: string;
  dateUpdated: string;
  venue?: {
    venueID: string;
    venueName: string;
  };
  scripts: Array<{
    scriptID: string;
    scriptName: string;
    scriptStatus: string;
    showID: string;
    startTime: string;
    dateCreated: string;
    dateUpdated: string;
    lastUsed?: string;
  }>;
}

interface NavigationState {
  view: string;
  selectedShowId: string | null;
  selectedScriptId: string | null;
  selectedVenueId: string | null;
  selectedDepartmentId: string | null;
  selectedCrewId: string | null;
  timestamp: number;
}

interface UseDashboardStateReturn {
  // State
  selectedShowId: string | null;
  selectedScriptId: string | null;
  selectedVenueId: string | null;
  selectedDepartmentId: string | null;
  selectedCrewId: string | null;
  hoveredCardId: string | null;
  setHoveredCardId: (id: string | null) => void;
  showCardRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  currentView: string;
  shows: Show[];

  // Handlers
  handleShowClick: (showId: string) => void;
  handleScriptClick: (scriptId: string) => void;
  handleVenueClick: (venueId: string) => void;
  handleDepartmentClick: (departmentId: string) => void;
  handleCrewClick: (crewId: string) => void;
  handleViewChange: (newView: string) => void;

  // Navigation state management
  saveNavigationState: (view: string) => void;
  saveCurrentNavigationState: () => void;
  restoreNavigationState: () => void;
  clearNavigationState: () => void;
}

const SCROLL_DELAY = 100; // Configurable scroll delay

export const useDashboardState = (shows: Show[] | undefined): UseDashboardStateReturn => {
  const [currentView, setCurrentView] = useState<string>('shows');
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);
  const showCardRefs = useRef<Record<string, HTMLElement | null>>({});

  // Enhanced navigation memory functions
  const saveNavigationState = useCallback((view: string) => {
    if (isRestoring || !hasInitialized) return;

    const navigationState: NavigationState = {
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

    const navigationState: NavigationState = {
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
        const state: NavigationState = JSON.parse(savedState);

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
      console.error('Error restoring navigation state:', error);
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
    setHasInitialized(true);
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

  const handleShowClick = (showId: string) => {
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

  const handleScriptClick = (scriptId: string) => {
    const newSelectedScriptId = selectedScriptId === scriptId ? null : scriptId;
    setSelectedScriptId(newSelectedScriptId);
  };

  const handleVenueClick = (venueId: string) => {
    const newSelectedVenueId = selectedVenueId === venueId ? null : venueId;
    setSelectedVenueId(newSelectedVenueId);
  };

  const handleDepartmentClick = (departmentId: string) => {
    const newSelectedDepartmentId = selectedDepartmentId === departmentId ? null : departmentId;
    setSelectedDepartmentId(newSelectedDepartmentId);
  };

  const handleCrewClick = (crewId: string) => {
    const newSelectedCrewId = selectedCrewId === crewId ? null : crewId;
    setSelectedCrewId(newSelectedCrewId);
  };

  // View change handler
  const handleViewChange = (newView: string) => {
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