// frontend/src/features/shows/components/modals/DepartmentSelectionModal.tsx

import React from 'react';
import { Button, HStack, VStack, Text, Box } from '@chakra-ui/react';
import { SelectionModal, SelectionItem } from '../../../../components/base/SelectionModal';
import { useDepartments } from '../../../departments/hooks/useDepartments';
import { Department } from '../../types/crewAssignments';

interface DepartmentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (department: Department) => void;
  excludeDepartmentIds?: string[];
}

interface DepartmentSelectionItem extends SelectionItem {
  color?: string;
  originalDepartment: Department;
}

export const DepartmentSelectionModal: React.FC<DepartmentSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  excludeDepartmentIds = []
}) => {
  const { departments, isLoading } = useDepartments();

  // Transform departments to SelectionItem format
  const selectionItems: DepartmentSelectionItem[] = departments.map(dept => ({
    id: dept.department_id,
    primaryText: dept.department_name,
    secondaryText: dept.department_description || undefined,
    color: dept.department_color,
    originalDepartment: dept
  }));

  const handleDepartmentSelect = (item: DepartmentSelectionItem) => {
    onSelect(item.originalDepartment);
  };

  const renderDepartmentItem = (item: DepartmentSelectionItem, onItemSelect: (item: DepartmentSelectionItem) => void) => (
    <Button
      key={item.id}
      variant="ghost"
      justifyContent="flex-start"
      width="100%"
      height="auto"
      py={3}
      px={4}
      onClick={() => onItemSelect(item)}
      _hover={{
        bg: "row.hover"
      }}
    >
      <HStack spacing={3} width="100%">
        <Box
          width="14px"
          height="14px"
          borderRadius="50%"
          bg={item.color || 'gray.400'}
          flexShrink={0}
        />
        <VStack spacing={0} align="flex-start" flex={1}>
          <Text fontWeight="medium" fontSize="md">
            {item.primaryText}
          </Text>
          {item.secondaryText && (
            <Text fontSize="sm" color="gray.600" noOfLines={1}>
              {item.secondaryText}
            </Text>
          )}
        </VStack>
      </HStack>
    </Button>
  );

  return (
    <SelectionModal
      title="Select Department"
      isOpen={isOpen}
      onClose={onClose}
      onSelect={handleDepartmentSelect}
      items={selectionItems}
      isLoading={isLoading}
      emptyMessage="No available departments to assign."
      excludeIds={excludeDepartmentIds}
      renderCustomItem={renderDepartmentItem}
    />
  );
};