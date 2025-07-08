import { useState, useMemo } from 'react';

export const useDashboardState = (shows) => {
  const [sortBy, setSortBy] = useState('dateUpdated');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedShowId, setSelectedShowId] = useState(null);
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [hoveredShowId, setHoveredShowId] = useState(null);

  const handleShowClick = (showId) => {
    setSelectedShowId(selectedShowId === showId ? null : showId);
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

  return {
    sortBy,
    sortDirection,
    selectedShowId,
    selectedScriptId,
    hoveredShowId,
    setHoveredShowId,
    handleShowClick,
    handleScriptClick,
    handleSortClick,
    sortedShows,
  };
};