// frontend/src/components/base/SelectionModal.tsx

import React, { useState, useMemo } from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Flex,
  Spinner,
  Badge
} from '@chakra-ui/react';
import { BaseModal } from './BaseModal';
import { AppIcon } from '../AppIcon';

export interface SelectionItem {
  id: string;
  primaryText: string;
  secondaryText?: string;
  badge?: string;
  badgeColor?: string;
  isDisabled?: boolean;
}

export interface SelectionModalProps<T extends SelectionItem> {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: T) => void;
  title?: string;
  items: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  excludeIds?: string[];
  maxItems?: number;
  renderCustomItem?: (item: T, onSelect: (item: T) => void) => React.ReactNode;
}

/**
 * SelectionModal - A reusable modal for list-based item selection
 * 
 * Consolidates patterns from DepartmentSelectionModal, CrewMemberSelectionModal, etc.
 * 
 * Usage:
 * <SelectionModal
 *   title="Select Department"
 *   items={departments.map(d => ({
 *     id: d.department_id,
 *     primaryText: d.department_name,
 *     secondaryText: d.department_description,
 *     badge: d.department_initials,
 *     badgeColor: d.department_color
 *   }))}
 *   onSelect={handleSelect}
 *   isOpen={isOpen}
 *   onClose={onClose}
 * />
 */
export function SelectionModal<T extends SelectionItem>({
  isOpen,
  onClose,
  onSelect,
  title = "Select Item",
  items,
  isLoading = false,
  emptyMessage = "No items available.",
  searchable = false,
  searchPlaceholder = "Search...",
  excludeIds = [],
  maxItems = 5,
  renderCustomItem
}: SelectionModalProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter items based on search and exclusions
  const filteredItems = useMemo(() => {
    let filtered = items.filter(item => !excludeIds.includes(item.id));

    if (searchable && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item => {
        const primaryMatch = item.primaryText.toLowerCase().includes(searchLower);
        const secondaryMatch = item.secondaryText?.toLowerCase().includes(searchLower);
        const badgeMatch = item.badge?.toLowerCase().includes(searchLower);
        
        return primaryMatch || secondaryMatch || badgeMatch;
      });
    }

    return filtered.slice(0, maxItems);
  }, [items, excludeIds, searchTerm, searchable, maxItems]);

  const handleItemSelect = (item: T) => {
    onSelect(item);
    onClose();
    setSearchTerm(''); // Reset search when closing
  };

  const handleClose = () => {
    setSearchTerm(''); // Reset search when closing
    onClose();
  };

  const renderDefaultItem = (item: T) => (
    <Button
      key={item.id}
      variant="ghost"
      justifyContent="flex-start"
      width="100%"
      height="auto"
      py={3}
      px={4}
      onClick={() => handleItemSelect(item)}
      isDisabled={item.isDisabled}
      _hover={{
        bg: item.isDisabled ? 'transparent' : 'gray.100',
        _dark: { bg: item.isDisabled ? 'transparent' : 'gray.700' }
      }}
    >
      <HStack spacing={3} width="100%" align="center">
        <VStack spacing={1} align="start" flex={1}>
          <Text fontSize="sm" fontWeight="medium" textAlign="left">
            {item.primaryText}
          </Text>
          {item.secondaryText && (
            <Text fontSize="xs" color="gray.500" textAlign="left">
              {item.secondaryText}
            </Text>
          )}
        </VStack>
        {item.badge && (
          <Badge
            size="sm"
            colorScheme={item.badgeColor || 'gray'}
            variant="subtle"
          >
            {item.badge}
          </Badge>
        )}
      </HStack>
    </Button>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <Flex justify="center" align="center" height="200px">
          <Spinner />
        </Flex>
      );
    }

    if (filteredItems.length === 0) {
      return (
        <Text color="gray.500" textAlign="center" py={8}>
          {searchTerm.trim() ? `No results found for "${searchTerm}"` : emptyMessage}
        </Text>
      );
    }

    return (
      <VStack spacing={2} align="stretch">
        {filteredItems.map(item => 
          renderCustomItem ? renderCustomItem(item, handleItemSelect) : renderDefaultItem(item)
        )}
      </VStack>
    );
  };

  return (
    <BaseModal
      title={title}
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      secondaryAction={{
        label: "Cancel",
        onClick: handleClose,
        variant: 'secondary'
      }}
    >
      <VStack spacing={4} align="stretch">
        {searchable && (
          <InputGroup>
            <InputLeftElement>
              <AppIcon name="search" boxSize="16px" color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </InputGroup>
        )}

        <Box>
          {renderContent()}
        </Box>
      </VStack>
    </BaseModal>
  );
}