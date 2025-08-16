// frontend/src/components/shared/SortMenu.tsx

import React from 'react';
import { Menu, MenuButton, MenuList, MenuItem, Button } from '@chakra-ui/react';
import { AppIcon } from '../AppIcon';

export interface SortOption {
  value: string;
  label: string;
}

interface SortMenuProps {
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  sortOptions: SortOption[];
  onSortClick: (sortBy: string) => void;
}

export const SortMenu: React.FC<SortMenuProps> = ({
  sortBy,
  sortDirection,
  sortOptions,
  onSortClick,
}) => {
  return (
    <Menu>
      <MenuButton as={Button} size="xs" rightIcon={<AppIcon name={sortDirection} boxSize={4} />}>
        Sort
      </MenuButton>
      <MenuList zIndex={9999}>
        {sortOptions.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => onSortClick(option.value)}
            color={sortBy === option.value ? 'blue.400' : 'inherit'}
            fontWeight={sortBy === option.value ? 'bold' : 'normal'}
            _hover={{ borderColor: 'orange.400' }}
          >
            {option.label}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
};