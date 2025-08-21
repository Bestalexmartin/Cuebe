// frontend/src/features/script/import/components/DepartmentMappingStep.tsx

import React, { useState, useCallback } from 'react';
import {
  VStack,
  HStack,
  Box,
  Text,
  Badge,
  Flex,
  Divider,
  Icon
} from '@chakra-ui/react';
import { AppIcon } from '../../../../components/AppIcon';

interface Department {
  department_id: string;
  department_name: string;
  department_color?: string;
}

interface UnmappedDepartment {
  name: string;
  count: number; // Number of elements using this department
  suggestedMatches: Department[]; // Existing departments sorted by similarity
}

interface DepartmentMapping {
  incomingName: string;
  mappedTo: Department | null; // null means create new department
}

interface DepartmentMappingStepProps {
  unmappedDepartments: UnmappedDepartment[];
  existingDepartments: Department[];
  onMappingsChange: (mappings: DepartmentMapping[]) => void;
  initialMappings?: DepartmentMapping[];
}

export const DepartmentMappingStep: React.FC<DepartmentMappingStepProps> = ({
  unmappedDepartments,
  existingDepartments,
  onMappingsChange,
  initialMappings = []
}) => {
  const [mappings, setMappings] = useState<DepartmentMapping[]>(
    initialMappings.length > 0 
      ? initialMappings 
      : unmappedDepartments.map(dept => ({ incomingName: dept.name, mappedTo: null }))
  );

  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<string | null>(null);

  const updateMapping = useCallback((incomingName: string, mappedTo: Department | null) => {
    const newMappings = mappings.map(mapping => 
      mapping.incomingName === incomingName 
        ? { ...mapping, mappedTo }
        : mapping
    );
    setMappings(newMappings);
    onMappingsChange(newMappings);
  }, [mappings, onMappingsChange]);

  const handleDragStart = (e: React.DragEvent, incomingName: string) => {
    setDraggedItem(incomingName);
    e.dataTransfer.setData('text/plain', incomingName);
    
    // Create a custom drag image with orange styling
    const dragElement = e.currentTarget.cloneNode(true) as HTMLElement;
    dragElement.style.backgroundColor = 'rgba(255, 178, 72, 0.1)'; // orange.50 with transparency
    dragElement.style.borderColor = '#ed8936'; // orange.400
    dragElement.style.position = 'absolute';
    dragElement.style.top = '-1000px';
    dragElement.style.left = '-1000px';
    dragElement.style.pointerEvents = 'none';
    document.body.appendChild(dragElement);
    
    e.dataTransfer.setDragImage(dragElement, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    
    // Clean up the temporary element after a short delay
    setTimeout(() => {
      document.body.removeChild(dragElement);
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropZone(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, zone: string) => {
    e.preventDefault();
    setDropZone(zone);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drop zone if leaving the actual drop area
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropZone(null);
    }
  };

  const handleDrop = (e: React.DragEvent, department: Department | null) => {
    e.preventDefault();
    const incomingName = e.dataTransfer.getData('text/plain');
    updateMapping(incomingName, department);
    setDropZone(null);
  };

  const handleDropOnLeft = (e: React.DragEvent) => {
    e.preventDefault();
    const incomingName = e.dataTransfer.getData('text/plain');
    updateMapping(incomingName, null);
    setDropZone(null);
  };

  const getMappingForDepartment = (incomingName: string) => {
    return mappings.find(m => m.incomingName === incomingName);
  };

  const getUnmappedDepartments = () => {
    return unmappedDepartments.filter(dept => {
      const mapping = getMappingForDepartment(dept.name);
      return !mapping?.mappedTo;
    });
  };

  return (
    <VStack spacing={6} align="stretch">
      <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }}>
        Some departments in your import don't match existing ones. Drag departments from the left to map them to existing departments, or leave them to create new departments for the incoming cues.
      </Text>

      <HStack spacing={3} align="stretch" minHeight="400px">
        {/* Left Column: Unmapped Departments */}
        <Box flex={1}>
          <Text fontSize="sm" fontWeight="medium" mb={3} color="orange.600" _dark={{ color: "orange.400" }} textAlign="center">
            Unmapped Departments ({getUnmappedDepartments().length})
          </Text>
          
          <Box
            border="2px dashed"
            borderColor={dropZone === 'left' ? 'orange.400' : 'red.400'}
            _dark={{ borderColor: dropZone === 'left' ? 'orange.400' : 'red.400' }}
            borderRadius="md"
            p={4}
            height="400px"
            overflowY="auto"
            className="hide-scrollbar"
            bg={undefined}
            _dark={{ bg: undefined }}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, 'left')}
            onDragLeave={handleDragLeave}
            onDrop={handleDropOnLeft}
            transition="all 0.2s"
          >
            <VStack spacing={2} align="stretch">
              {getUnmappedDepartments().length === 0 ? (
                <Flex justify="center" align="center" height="200px" direction="column">
                  <AppIcon name="check" boxSize="32px" color="green.500" mb={2} />
                  <Text color="green.600" _dark={{ color: "green.400" }} fontSize="sm">
                    All departments mapped!
                  </Text>
                </Flex>
              ) : (
                getUnmappedDepartments().map((dept) => (
                  <Box
                    key={dept.name}
                    p={3}
                    bg={draggedItem === dept.name ? "transparent" : "page.background"}
                    border="2px solid"
                    borderColor={draggedItem === dept.name ? "orange.400" : "container.border"}
                    borderRadius="md"
                    cursor="grab"
                    _active={{ cursor: "grabbing" }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, dept.name)}
                    onDragEnd={handleDragEnd}
                    opacity={draggedItem === dept.name ? 0.5 : 1}
                    _hover={{ borderColor: "orange.400" }}
                    transition="all 0.2s"
                  >
                    <HStack justify="space-between">
                      <Text fontWeight="medium" fontSize="sm">
                        {dept.name}
                      </Text>
                      <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.400" }}>
                        {dept.count} element{dept.count !== 1 ? 's' : ''}
                      </Text>
                    </HStack>
                  </Box>
                ))
              )}
            </VStack>
          </Box>
        </Box>

        {/* Center Divider */}
        <Divider orientation="vertical" />

        {/* Right Column: Existing Departments */}
        <Box flex={1}>
          <Text fontSize="sm" fontWeight="medium" mb={3} color="blue.600" _dark={{ color: "blue.400" }} textAlign="center">
            Your Departments ({existingDepartments.length})
          </Text>
          
          <Box
            border="2px solid"
            borderColor="blue.400"
            borderRadius="md"
            height="400px"
            overflowY="auto"
            className="hide-scrollbar"
          >
            <VStack spacing={2} align="stretch" p={4}>
              {existingDepartments.map((dept) => {
              const isDropTarget = dropZone === dept.department_id;
              const mappedCount = mappings.filter(m => m.mappedTo?.department_id === dept.department_id).length;
              
              return (
                <Box
                  key={dept.department_id}
                  p={3}
                  bg={isDropTarget ? 'orange.50' : 'page.background'}
                  _dark={{ bg: isDropTarget ? 'orange.900' : 'page.background' }}
                  border="2px solid"
                  borderColor={isDropTarget ? 'orange.400' : 'container.border'}
                  borderRadius="md"
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, dept.department_id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dept)}
                  transition="all 0.2s"
                  _hover={{ borderColor: "orange.400" }}
                >
                  <HStack justify="space-between">
                    <HStack align="center" spacing={2}>
                      {dept.department_color && (
                        <Box
                          width="12px"
                          height="12px"
                          borderRadius="full"
                          bg={dept.department_color}
                        />
                      )}
                      <Text fontWeight="medium" fontSize="sm">
                        {dept.department_name}
                      </Text>
                    </HStack>
                    <HStack spacing={2}>
                      {mappedCount > 0 && (
                        <Badge size="sm" colorScheme="blue">
                          {mappedCount} mapped
                        </Badge>
                      )}
                      {isDropTarget && (
                        <AppIcon name="arrow-down" boxSize="16px" color="blue.500" />
                      )}
                    </HStack>
                  </HStack>
                </Box>
              );
              })}
            </VStack>
          </Box>
        </Box>
      </HStack>

    </VStack>
  );
};