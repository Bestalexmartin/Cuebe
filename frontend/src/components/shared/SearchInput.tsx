import React from 'react';
import {
  HStack,
  Input,
  Button
} from '@chakra-ui/react';

interface SearchInputProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  isSearching: boolean;
  onSearch: (query: string) => void;
  onClearSearch: () => void;
  placeholder?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  searchQuery,
  onSearchQueryChange,
  isSearching,
  onSearch,
  onClearSearch,
  placeholder = "Search..."
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch(searchQuery);
    } else if (e.key === 'Escape') {
      onClearSearch();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onSearchQueryChange(value);
    if (!value.trim()) {
      onClearSearch();
    }
  };

  return (
    <HStack spacing={2}>
      <Input
        value={searchQuery}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        size="xs"
        width={{ base: "125px", md: "150px", lg: "200px" }}
        borderRadius="md"
        borderColor="gray.700"
        _hover={{ borderColor: "container.border" }}
      />
      <Button
        size="xs"
        bg="blue.400"
        color="white"
        _hover={{ bg: 'orange.400' }}
        _active={{ bg: 'orange.400' }}
        onClick={() => onSearch(searchQuery)}
        isDisabled={!searchQuery.trim()}
        isLoading={isSearching}
      >
        Search
      </Button>
    </HStack>
  );
};