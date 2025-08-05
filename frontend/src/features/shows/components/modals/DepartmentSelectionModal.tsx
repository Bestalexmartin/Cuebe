// frontend/src/features/shows/components/modals/DepartmentSelectionModal.tsx

import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Box,
  Button,
  Flex,
  Spinner
} from '@chakra-ui/react';
import { useDepartments } from '../../../departments/hooks/useDepartments';
import { Department } from '../../types/crewAssignments';

interface DepartmentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (department: Department) => void;
  excludeDepartmentIds?: string[];
}

export const DepartmentSelectionModal: React.FC<DepartmentSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  excludeDepartmentIds = []
}) => {
  const { departments, isLoading } = useDepartments();

  const availableDepartments = departments.filter(dept => 
    !excludeDepartmentIds.includes(dept.department_id)
  );

  const handleDepartmentSelect = (department: Department) => {
    onSelect(department);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Select Department</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {isLoading ? (
            <Flex justify="center" align="center" height="200px">
              <Spinner />
            </Flex>
          ) : availableDepartments.length === 0 ? (
            <Text color="gray.500" textAlign="center" py={8}>
              No available departments to assign.
            </Text>
          ) : (
            <VStack spacing={2} align="stretch">
              {availableDepartments.map((department) => (
                <Button
                  key={department.department_id}
                  variant="ghost"
                  justifyContent="flex-start"
                  height="auto"
                  py={3}
                  px={4}
                  onClick={() => handleDepartmentSelect(department)}
                  _hover={{
                    bg: "row.hover"
                  }}
                >
                  <HStack spacing={3} width="100%">
                    <Box
                      width="14px"
                      height="14px"
                      borderRadius="50%"
                      bg={department.department_color || 'gray.400'}
                      flexShrink={0}
                    />
                    <VStack spacing={0} align="flex-start" flex={1}>
                      <Text fontWeight="medium" fontSize="md">
                        {department.department_name}
                      </Text>
                      {department.department_description && (
                        <Text fontSize="sm" color="gray.600" noOfLines={1}>
                          {department.department_description}
                        </Text>
                      )}
                    </VStack>
                  </HStack>
                </Button>
              ))}
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};