import React from 'react';
import {
  HStack,
  Input,
  Button,
  VStack,
  Box,
  Text
} from '@chakra-ui/react';
import { AppIcon } from '../AppIcon';

interface SearchResult {
  file_path: string;
  title: string;
  category: string;
  url: string;
  snippet: string;
  relevance_score: number;
  content_type: string;
}

interface DocumentSearchUIProps {
  searchResults: SearchResult[];
  onResultClick: (result: SearchResult) => void;
  files: any[];
}

export const DocumentSearchUI: React.FC<DocumentSearchUIProps> = ({
  searchResults,
  onResultClick,
  files
}) => {
  if (searchResults.length === 0) {
    return (
      <VStack spacing={4} align="center" py={8}>
        <AppIcon name="warning" boxSize="48px" color="gray.400" />
        <VStack spacing={2} align="center">
          <Text fontSize="lg" fontWeight="medium" color="cardText">
            No results found
          </Text>
          <Text fontSize="sm" color="gray.400" textAlign="center" maxW="400px">
            Try different search terms or check the spelling. You can also browse by category using the menu to the right.
          </Text>
        </VStack>
      </VStack>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {searchResults.map((result, index) => (
        <Box
          key={index}
          p={3}
          rounded="md"
          shadow="sm"
          bg="card.background"
          borderWidth="2px"
          borderColor="gray.600"
          cursor="pointer"
          _hover={{ borderColor: "orange.400" }}
          onClick={() => onResultClick(result)}
        >
          <VStack align="start" spacing={1}>
            <HStack justify="space-between" width="100%">
              <HStack spacing={2} align="center">
                <Box px={1} pt="2px">
                  <AppIcon 
                    name={files.find(f => f.name === result.title || f.title === result.title)?.icon || 'docs'} 
                    boxSize="14px" 
                  />
                </Box>
                <Text fontSize="sm" color="white" textTransform="uppercase" fontWeight="bold">
                  {result.category}
                </Text>
                <Text fontSize="sm" color="cardText" fontWeight="bold">
                  •
                </Text>
                <Text fontWeight="medium" fontSize="sm" color="cardText">
                  {result.title}
                </Text>
              </HStack>
              <Text fontSize="xs" color="gray.400">
                {result.relevance_score.toFixed(1)}
              </Text>
            </HStack>
            {result.snippet && (
              <Text fontSize="xs" color="cardText" opacity={0.8} noOfLines={2} ml={6}>
                {result.snippet}
              </Text>
            )}
          </VStack>
        </Box>
      ))}
    </VStack>
  );
};