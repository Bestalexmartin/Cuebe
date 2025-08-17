// frontend/src/components/shared/EntityViewHeader.tsx

import React from 'react';
import { Flex, HStack, Heading, Button, Divider } from '@chakra-ui/react';
import { AppIcon, IconName } from '../AppIcon';
import { SortMenu, SortOption } from './SortMenu';

interface EntityViewHeaderProps {
  entityName: string;
  entityIcon: IconName;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  sortOptions: SortOption[];
  onSortClick: (sortBy: string) => void;
  createButtonText: string;
  onCreateClick: () => void;
}

export const EntityViewHeader: React.FC<EntityViewHeaderProps> = ({
  entityName,
  entityIcon,
  sortBy,
  sortDirection,
  sortOptions,
  onSortClick,
  createButtonText,
  onCreateClick
}) => {
  return (
    <Flex justify="space-between" align="center" flexShrink={0}>
      <HStack spacing="2" align="center">
        <AppIcon name={entityIcon} boxSize="25px" />
        <Heading as="h2" size="md">{entityName}</Heading>
      </HStack>
      <HStack spacing="2">
        <SortMenu
          sortBy={sortBy}
          sortDirection={sortDirection}
          sortOptions={sortOptions}
          onSortClick={onSortClick}
        />
        <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />
        <Button
          bg="blue.400"
          color="white"
          size="xs"
          onClick={onCreateClick}
          _hover={{ bg: 'orange.400' }}
        >
          {createButtonText}
        </Button>
      </HStack>
    </Flex>
  );
};