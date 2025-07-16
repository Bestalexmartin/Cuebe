import { useState, useMemo, useRef } from 'react';

const SCROLL_DELAY = 100; // Configurable scroll delay

export const useDashboardState = (shows) => {
  const [sortBy, setSortBy] = useState('dateUpdated');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedShowId, setSelectedShowId] = useState(null);
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [hoveredShowId, setHoveredShowId] = useState(null);
  const showCardRefs = useRef({}); // <-- Create the ref here

  const handleShowClick = (showId) => {
    // This now correctly uses the state from within the same hook
    const newSelectedShowId = selectedShowId === showId ? null : showId;
    setSelectedShowId(newSelectedShowId);
    setSelectedScriptId(null);

    // Add the scroll logic here
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
    setSelectedScriptId(selectedScriptId === scriptId ? null : scriptId);
  };

  const handleSortClick = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortDirection(newSortBy === 'dateUpdated' ? 'desc' : 'asc');
    }
  };

  const sortedShows = useMemo(() => {
    if (!shows || shows.length === 0) return [];

    const showsToSort = [...shows];
    showsToSort.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'showName') {
        comparison = a.showName.localeCompare(b.showName);
      } else if (sortBy === 'showDate') {
        if (!a.showDate) return 1;
        if (!b.showDate) return -1;
        comparison = new Date(a.showDate) - new Date(b.showDate);
      } else { // 'dateUpdated'
        comparison = new Date(b.dateUpdated) - new Date(a.dateUpdated);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return showsToSort;
  }, [shows, sortBy, sortDirection]);

  // Placeholder sorted arrays for future views
  const sortedVenues = [];
  const sortedDepartments = [];
  const sortedCrew = [];
  const sortedPins = [];

  return {
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
  };
};