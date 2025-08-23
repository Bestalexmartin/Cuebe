import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

interface SearchResult {
  file_path: string;
  title: string;
  category: string;
  url: string;
  snippet: string;
  relevance_score: number;
  content_type: string;
}

interface UseDocumentSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  hasSearched: boolean;
  handleSearch: (query: string, onClearState?: () => void) => Promise<void>;
  clearSearch: () => void;
  handleSearchResultClick: (result: SearchResult, files: any[], onSelect: (fileName: string) => void) => void;
}

export const useDocumentSearch = (contentType?: 'tutorial' | 'documentation'): UseDocumentSearchReturn => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { getToken } = useAuth();

  const handleSearch = async (query: string, onClearState?: () => void) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    // Clear any selected documents/categories to show search results
    if (onClearState) {
      onClearState();
    }

    setIsSearching(true);
    
    try {
      const headers: Record<string, string> = {};
      const authToken = await getToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // Build API URL with content_type parameter if specified
      let apiUrl = `/api/docs/search?q=${encodeURIComponent(query)}`;
      if (contentType) {
        apiUrl += `&content_type=${contentType}`;
      }
      
      const response = await fetch(apiUrl, { headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Use results directly - backend has already filtered by content type
      setSearchResults(data.results || []);
      setHasSearched(true);
    } catch (error) {
      setSearchResults([]);
      setHasSearched(true); // Still mark as searched even on error to show the no results state
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const handleSearchResultClick = (result: SearchResult, files: any[], onSelect: (fileName: string) => void) => {
    // Find the file by title or path
    const file = files.find(f => f.name === result.title || f.path === result.file_path || f.title === result.title);
    if (file) {
      clearSearch();
      onSelect(file.name);
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    hasSearched,
    handleSearch,
    clearSearch,
    handleSearchResultClick
  };
};