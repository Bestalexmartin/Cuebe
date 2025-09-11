import { useState } from 'react';

export interface TutorialSearchResult {
  title?: string;
  file_path?: string;
  category?: string;
  snippet?: string;
  relevance_score?: number;
  // Allow server to include extra fields
  [key: string]: any;
}

export const useTutorialSearch = (shareToken?: string) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<TutorialSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (query: string, onClearState?: () => void) => {
    if (!query.trim() || !shareToken) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    if (onClearState) {
      onClearState();
    }

    setIsSearching(true);

    try {
      const response = await fetch(`/api/shared/${shareToken}/tutorials/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSearchResults(data.results || []);
      setHasSearched(true);
    } catch (error) {
      setSearchResults([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    hasSearched,
    handleSearch,
    clearSearch,
  };
};
