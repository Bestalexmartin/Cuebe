import { useState, useMemo, useRef } from 'react';

const SCROLL_DELAY = 100; // Configurable scroll delay

export const useDashboardState = (shows) => {
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

  // Pass through shows data with null safety
  const safeShows = useMemo(() => {
    if (!shows || shows.length === 0) return [];
    return shows;
  }, [shows]);

  return {
    selectedShowId,
    selectedScriptId,
    hoveredShowId,
    setHoveredShowId,
    handleScriptClick,
    handleShowClick,
    showCardRefs,
    shows: safeShows, // Just pass through the shows data
  };
};