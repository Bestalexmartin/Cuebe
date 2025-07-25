// frontend/src/hooks/useDashboardState.ts

import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  MutableRefObject,
} from "react";

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

interface SortState {
  shows: {
    sortBy: "showName" | "showDate" | "dateUpdated" | "dateCreated";
    sortDirection: "asc" | "desc";
  };
  venues: {
    sortBy:
      | "venueName"
      | "capacity"
      | "venueType"
      | "dateCreated"
      | "dateUpdated";
    sortDirection: "asc" | "desc";
  };
  crew: {
    sortBy:
      | "fullnameFirst"
      | "fullnameLast"
      | "userRole"
      | "emailAddress"
      | "dateCreated"
      | "dateUpdated";
    sortDirection: "asc" | "desc";
  };
  departments: {
    sortBy:
      | "departmentName"
      | "departmentColor"
      | "dateCreated"
      | "dateUpdated";
    sortDirection: "asc" | "desc";
  };
}

interface SelectedState {
  shows: { selectedShowId: string | null; selectedScriptId: string | null };
  venues: { selectedVenueId: string | null };
  departments: { selectedDepartmentId: string | null };
  crew: { selectedCrewId: string | null };
}

interface NavigationState {
  view: string;
  selectedState: SelectedState;
  sortState: SortState;
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
  shows: Show[];
  currentView: string;

  // Selected state
  selectedState: SelectedState;
  updateSelectedState: (
    view: keyof SelectedState,
    field: string,
    value: string | null,
  ) => void;

  // Sort state
  sortState: SortState;
  updateSortState: (
    view: keyof SortState,
    sortBy: string,
    sortDirection: "asc" | "desc",
  ) => void;

  // Handlers
  handleShowClick: (showId: string) => void;
  handleScriptClick: (scriptId: string) => void;
  handleVenueClick: (venueId: string) => void;
  handleDepartmentClick: (departmentId: string) => void;
  handleCrewClick: (crewId: string) => void;
  handleViewChange: (newView: string) => void;

  // Navigation state management
  saveCurrentNavigationState: () => void;
}

const SCROLL_DELAY = 100; // Configurable scroll delay

export const useDashboardState = (
  shows: Show[] | undefined,
  skipSessionRestore: boolean = false,
): UseDashboardStateReturn => {
  const [currentView, setCurrentView] = useState<string>("shows");
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);
  const showCardRefs = useRef<Record<string, HTMLElement | null>>({});

  // Selected state - organized by view
  const [selectedState, setSelectedState] = useState<SelectedState>({
    shows: { selectedShowId: null, selectedScriptId: null },
    venues: { selectedVenueId: null },
    departments: { selectedDepartmentId: null },
    crew: { selectedCrewId: null },
  });

  // Sort state - default all to most recently updated/created first
  const [sortState, setSortState] = useState<SortState>({
    shows: { sortBy: "dateUpdated", sortDirection: "desc" },
    venues: { sortBy: "dateCreated", sortDirection: "desc" },
    crew: { sortBy: "dateCreated", sortDirection: "desc" },
    departments: { sortBy: "dateCreated", sortDirection: "desc" },
  });

  // Selected state management
  const updateSelectedState = useCallback(
    (view: keyof SelectedState, field: string, value: string | null) => {
      setSelectedState((prev) => ({
        ...prev,
        [view]: { ...prev[view], [field]: value },
      }));
    },
    [],
  );

  // Sort state management
  const updateSortState = useCallback(
    (view: keyof SortState, sortBy: string, sortDirection: "asc" | "desc") => {
      setSortState((prev) => ({
        ...prev,
        [view]: { sortBy, sortDirection },
      }));
    },
    [],
  );

  // Enhanced navigation memory functions
  const saveNavigationState = useCallback(
    (view: string) => {
      if (isRestoring || !hasInitialized) return;

      const navigationState: NavigationState = {
        view,
        selectedState,
        sortState,
        timestamp: Date.now(),
      };

      sessionStorage.setItem(
        "dashboardNavigationState",
        JSON.stringify(navigationState),
      );
      setCurrentView(view);
    },
    [isRestoring, hasInitialized, selectedState, sortState],
  );

  // Function to save current state immediately (for navigation)
  const saveCurrentNavigationState = useCallback(() => {
    if (!hasInitialized) return; // Don't save if we haven't initialized yet

    const navigationState: NavigationState = {
      view: currentView,
      selectedState,
      sortState,
      timestamp: Date.now(),
    };

    sessionStorage.setItem(
      "dashboardNavigationState",
      JSON.stringify(navigationState),
    );
  }, [currentView, selectedState, sortState, hasInitialized]);

  // Computed values for backward compatibility
  const selectedShowId = selectedState.shows.selectedShowId;
  const selectedScriptId = selectedState.shows.selectedScriptId;
  const selectedVenueId = selectedState.venues.selectedVenueId;
  const selectedDepartmentId = selectedState.departments.selectedDepartmentId;
  const selectedCrewId = selectedState.crew.selectedCrewId;

  const restoreNavigationState = useCallback(() => {
    try {
      const savedState = sessionStorage.getItem("dashboardNavigationState");
      if (savedState) {
        setIsRestoring(true);
        const state: NavigationState = JSON.parse(savedState);

        // Restore ALL selections and sort state
        setCurrentView(state.view);

        // Restore selected state if available
        if (state.selectedState) {
          setSelectedState(state.selectedState);
        }

        // Restore sort state if available
        if (state.sortState) {
          setSortState(state.sortState);
        }

        // Scroll to the selected item in the current view after a delay
        setTimeout(() => {
          const currentSelection =
            state.view === "shows"
              ? state.selectedState?.shows.selectedShowId
              : state.view === "venues"
                ? state.selectedState?.venues.selectedVenueId
                : state.view === "departments"
                  ? state.selectedState?.departments.selectedDepartmentId
                  : state.view === "crew"
                    ? state.selectedState?.crew.selectedCrewId
                    : null;

          if (currentSelection) {
            const targetRef = showCardRefs.current[currentSelection];
            if (targetRef) {
              targetRef.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
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
      console.error("Error restoring navigation state:", error);
      setIsRestoring(false);
      setHasInitialized(true);
    }
  }, []);

  const clearNavigationState = useCallback(() => {
    sessionStorage.removeItem("dashboardNavigationState");
    // Also clear all current selections
    setSelectedState({
      shows: { selectedShowId: null, selectedScriptId: null },
      venues: { selectedVenueId: null },
      departments: { selectedDepartmentId: null },
      crew: { selectedCrewId: null },
    });
    setHasInitialized(true);
  }, []);

  // Function to restore only selections without scrolling side effects
  const restoreSelectionsOnly = useCallback(() => {
    try {
      const savedState = sessionStorage.getItem("dashboardNavigationState");
      if (savedState) {
        const state: NavigationState = JSON.parse(savedState);

        // Restore view and selections without side effects
        setCurrentView(state.view);

        if (state.selectedState) {
          setSelectedState(state.selectedState);
        }

        if (state.sortState) {
          setSortState(state.sortState);
        }

        setHasInitialized(true);
      } else {
        setHasInitialized(true);
      }
    } catch (error) {
      console.error("Error restoring selections only:", error);
      setHasInitialized(true);
    }
  }, []);

  // Restore navigation state on mount - ONLY ONCE, unless we're returning from edit
  useEffect(() => {
    if (!hasInitialized) {
      if (skipSessionRestore) {
        // If we're returning from edit, restore selections but skip scrolling
        restoreSelectionsOnly();
      } else {
        restoreNavigationState();
      }
    }
  }, [
    restoreNavigationState,
    restoreSelectionsOnly,
    hasInitialized,
    skipSessionRestore,
  ]);

  // Save state whenever any selection changes - BUT NOT during restoration OR before initialization
  useEffect(() => {
    if (hasInitialized && !isRestoring) {
      saveCurrentNavigationState(); // Use the save-only function, not the save+restore function
    }
  }, [
    selectedState,
    currentView,
    saveCurrentNavigationState,
    hasInitialized,
    isRestoring,
  ]);

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
    updateSelectedState("shows", "selectedShowId", newSelectedShowId);
    updateSelectedState("shows", "selectedScriptId", null);

    // Scroll logic
    setTimeout(() => {
      const targetRef = showCardRefs.current[showId];
      if (targetRef) {
        targetRef.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }, SCROLL_DELAY);
  };

  const handleScriptClick = (scriptId: string) => {
    const newSelectedScriptId = selectedScriptId === scriptId ? null : scriptId;
    updateSelectedState("shows", "selectedScriptId", newSelectedScriptId);
  };

  const handleVenueClick = (venueId: string) => {
    const newSelectedVenueId = selectedVenueId === venueId ? null : venueId;
    updateSelectedState("venues", "selectedVenueId", newSelectedVenueId);

    // Scroll logic
    setTimeout(() => {
      const targetRef = showCardRefs.current[venueId];
      if (targetRef) {
        targetRef.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }, SCROLL_DELAY);
  };

  const handleDepartmentClick = (departmentId: string) => {
    const newSelectedDepartmentId =
      selectedDepartmentId === departmentId ? null : departmentId;
    updateSelectedState(
      "departments",
      "selectedDepartmentId",
      newSelectedDepartmentId,
    );

    // Scroll logic
    setTimeout(() => {
      const targetRef = showCardRefs.current[departmentId];
      if (targetRef) {
        targetRef.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }, SCROLL_DELAY);
  };

  const handleCrewClick = (crewId: string) => {
    const newSelectedCrewId = selectedCrewId === crewId ? null : crewId;
    updateSelectedState("crew", "selectedCrewId", newSelectedCrewId);

    // Scroll logic
    setTimeout(() => {
      const targetRef = showCardRefs.current[crewId];
      if (targetRef) {
        targetRef.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }, SCROLL_DELAY);
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
    // State
    selectedShowId,
    selectedScriptId,
    selectedVenueId,
    selectedDepartmentId,
    selectedCrewId,
    hoveredCardId,
    setHoveredCardId,
    showCardRefs,
    shows: safeShows,
    currentView,

    // Selected state
    selectedState,
    updateSelectedState,

    // Sort state
    sortState,
    updateSortState,

    // Handlers
    handleShowClick,
    handleScriptClick,
    handleVenueClick,
    handleDepartmentClick,
    handleCrewClick,
    handleViewChange,

    // Navigation state management
    saveCurrentNavigationState,
  };
};
