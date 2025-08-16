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
  show_id: string;
  show_name: string;
  show_date?: string;
  date_created: string;
  date_updated: string;
  venue?: {
    venue_id: string;
    venue_name: string;
  };
  scripts: Array<{
    script_id: string;
    script_name: string;
    script_status: string;
    show_id: string;
    start_time: string;
    date_created: string;
    date_updated: string;
    lastUsed?: string;
  }>;
}

interface SortState {
  shows: {
    sortBy: "show_name" | "show_date" | "date_updated" | "date_created";
    sortDirection: "asc" | "desc";
  };
  venues: {
    sortBy:
      | "venue_name"
      | "capacity"
      | "venue_type"
      | "date_created"
      | "date_updated";
    sortDirection: "asc" | "desc";
  };
  crew: {
    sortBy:
      | "fullname_first"
      | "fullname_last"
      | "user_role"
      | "email_address"
      | "date_created"
      | "date_updated";
    sortDirection: "asc" | "desc";
  };
  departments: {
    sortBy:
      | "department_name"
      | "department_color"
      | "date_created"
      | "date_updated";
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
const SCROLL_PADDING = 15; // Padding around scrolled elements for better visual spacing

// Helper function to scroll element into view with proper padding
const scrollElementIntoView = (targetRef: HTMLElement) => {
  // Find the scroll container more reliably
  let container = targetRef.parentElement;
  while (container && container !== document.body) {
    const overflowY = window.getComputedStyle(container).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      break;
    }
    container = container.parentElement;
  }
  
  if (container && container !== document.body) {
    console.log('Found scroll container:', container.className || container.tagName, 'with overflow:', window.getComputedStyle(container).overflowY);
    const containerRect = container.getBoundingClientRect();
    const targetRect = targetRef.getBoundingClientRect();
    const scrollTop = container.scrollTop;
    const containerHeight = containerRect.height;
    
    // Calculate target position relative to scroll container
    const targetRelativeTop = targetRect.top - containerRect.top;
    const targetHeight = targetRect.height;
    
    let targetScrollPosition;
    
    if (targetRelativeTop < SCROLL_PADDING) {
      // Element is too close to top or above visible area - scroll up to show it with padding
      targetScrollPosition = scrollTop + targetRelativeTop - SCROLL_PADDING;
    } else if (targetRelativeTop + targetHeight > containerHeight - SCROLL_PADDING) {
      // Element is too close to bottom or below visible area - scroll down to show it with padding
      targetScrollPosition = scrollTop + targetRelativeTop + targetHeight - containerHeight + SCROLL_PADDING;
    } else {
      // Element is already visible with adequate padding - don't scroll
      console.log('Element already visible with adequate padding, no scroll needed');
      return;
    }
    
    // Ensure we don't scroll past the top
    const finalScrollPosition = Math.max(0, targetScrollPosition);
    
    console.log('Container height:', containerHeight, 'Target relative:', targetRelativeTop, 'Target height:', targetHeight, 'Final position:', finalScrollPosition);
    container.scrollTo({
      top: finalScrollPosition,
      behavior: "smooth"
    });
  } else {
    console.log('Using window scroll fallback');
    // Fallback with custom padding by calculating offset
    const targetRect = targetRef.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const targetCenter = targetRect.top + targetRect.height / 2;
    const viewportCenter = windowHeight / 2;
    const offset = targetCenter - viewportCenter;
    
    window.scrollBy({
      top: offset,
      behavior: "smooth"
    });
  }
};

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
    shows: { sortBy: "date_updated", sortDirection: "desc" },
    venues: { sortBy: "date_created", sortDirection: "desc" },
    crew: { sortBy: "date_created", sortDirection: "desc" },
    departments: { sortBy: "date_created", sortDirection: "desc" },
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
              scrollElementIntoView(targetRef);
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

    // Scroll logic with 10px offset
    setTimeout(() => {
      const targetRef = showCardRefs.current[showId];
      if (targetRef) {
        scrollElementIntoView(targetRef);
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

    // Scroll logic with 10px offset
    setTimeout(() => {
      const targetRef = showCardRefs.current[venueId];
      if (targetRef) {
        scrollElementIntoView(targetRef);
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

    // Scroll logic with 10px offset
    setTimeout(() => {
      const targetRef = showCardRefs.current[departmentId];
      if (targetRef) {
        scrollElementIntoView(targetRef);
      }
    }, SCROLL_DELAY);
  };

  const handleCrewClick = (crewId: string) => {
    const newSelectedCrewId = selectedCrewId === crewId ? null : crewId;
    updateSelectedState("crew", "selectedCrewId", newSelectedCrewId);

    // Scroll logic with 10px offset
    setTimeout(() => {
      const targetRef = showCardRefs.current[crewId];
      if (targetRef) {
        scrollElementIntoView(targetRef);
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
