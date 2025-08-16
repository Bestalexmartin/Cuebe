import { useState, useCallback, useMemo } from 'react';
import { Show } from '../features/shows/types';

type SortBy = 'show_name' | 'show_date' | 'date_updated' | 'date_created';
type SortDirection = 'asc' | 'desc';

interface SharedData {
  shows?: Show[];
}

export const useSorting = (sharedData: SharedData | null) => {
  const [sortBy, setSortBy] = useState<SortBy>('date_updated');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSortClick = useCallback((newSortBy: string) => {
    const typedSortBy = newSortBy as SortBy;
    if (sortBy === typedSortBy) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
    } else {
      setSortBy(typedSortBy);
      const newDirection = typedSortBy === 'date_updated' ? 'desc' : 'asc';
      setSortDirection(newDirection);
    }
  }, [sortBy, sortDirection]);

  const sortedShows = useMemo(() => {
    if (!sharedData?.shows || sharedData.shows.length === 0) return [];

    const showsWithSharedScripts = sharedData.shows.filter(
      show => show.scripts && show.scripts.length > 0
    );

    if (showsWithSharedScripts.length === 0) return [];

    const showsToSort = [...showsWithSharedScripts];
    showsToSort.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'show_name') {
        comparison = a.show_name.localeCompare(b.show_name);
      } else if (sortBy === 'show_date') {
        if (!a.show_date) return 1;
        if (!b.show_date) return -1;
        comparison = new Date(a.show_date).getTime() - new Date(b.show_date).getTime();
      } else if (sortBy === 'date_created') {
        comparison = new Date(b.date_created).getTime() - new Date(a.date_created).getTime();
      } else {
        comparison = new Date(b.date_updated).getTime() - new Date(a.date_updated).getTime();
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return showsToSort;
  }, [sharedData?.shows, sortBy, sortDirection]);

  return {
    sortBy,
    sortDirection,
    sortedShows,
    handleSortClick,
  };
};