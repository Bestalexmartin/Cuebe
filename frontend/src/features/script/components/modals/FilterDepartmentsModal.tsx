// frontend/src/features/script/components/modals/FilterDepartmentsModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
    VStack,
    HStack,
    Text,
    Checkbox,
    Button,
    Box
} from '@chakra-ui/react';
import { BaseModal } from '../../../../components/base/BaseModal';
import { ScriptElement } from '../../types/scriptElements';

interface Department {
    id: string;
    name: string;
    color?: string;
}

interface FilterDepartmentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    elements: ScriptElement[];
    selectedDepartmentIds: string[];
    onApplyFilter: (selectedDepartmentIds: string[]) => void;
}

export const FilterDepartmentsModal: React.FC<FilterDepartmentsModalProps> = ({
    isOpen,
    onClose,
    elements,
    selectedDepartmentIds,
    onApplyFilter
}) => {
    const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedDepartmentIds);

    // Reset local state when modal opens
    useEffect(() => {
        if (isOpen) {
            setLocalSelectedIds(selectedDepartmentIds);
        }
    }, [isOpen, selectedDepartmentIds]);

    // Extract unique departments from script elements
    const departments = useMemo(() => {
        const deptMap = new Map<string, Department>();
        
        elements.forEach(element => {
            if (element.department_id && element.department_name) {
                if (!deptMap.has(element.department_id)) {
                    deptMap.set(element.department_id, {
                        id: element.department_id,
                        name: element.department_name,
                        color: element.department_color
                    });
                }
            }
        });

        // Sort departments alphabetically by name
        return Array.from(deptMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [elements]);

    const handleDepartmentToggle = (departmentId: string) => {
        const newSelectedIds = localSelectedIds.includes(departmentId)
            ? localSelectedIds.filter(id => id !== departmentId)
            : [...localSelectedIds, departmentId];
            
        setLocalSelectedIds(newSelectedIds);
        onApplyFilter(newSelectedIds); // Apply filter immediately
    };

    const handleSelectAll = () => {
        const allDepartmentIds = departments.map(dept => dept.id);
        setLocalSelectedIds(allDepartmentIds);
        onApplyFilter(allDepartmentIds); // Apply filter immediately
    };

    const handleDeselectAll = () => {
        setLocalSelectedIds([]);
        onApplyFilter([]); // Apply filter immediately
    };

    const handleClose = () => {
        onClose();
    };

    const allSelected = localSelectedIds.length === departments.length;

    return (
        <BaseModal
            title="Filter by Department"
            headerIcon="options"
            headerIconColor="page.text"
            isOpen={isOpen}
            onClose={handleClose}
            primaryAction={{
                label: "Done",
                variant: "primary",
                onClick: handleClose
            }}
            errorBoundaryContext="FilterDepartmentsModal"
        >
            <VStack spacing={6} align="stretch">
                {/* Control buttons */}
                <HStack spacing={3}>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSelectAll}
                        isDisabled={allSelected}
                        flex={1}
                    >
                        Select All
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDeselectAll}
                        isDisabled={localSelectedIds.length === 0}
                        flex={1}
                    >
                        Deselect All
                    </Button>
                </HStack>

                {/* Department list */}
                <Box
                    border="1px solid"
                    borderColor="container.border"
                    borderRadius="md"
                    height="380px"
                    width="300px"
                    mx="auto"
                    overflowY="auto"
                    className="hide-scrollbar"
                >
                    <VStack spacing={2} align="stretch" p={4}>
                        {departments.length === 0 ? (
                            <Text color="gray.500" fontSize="sm" textAlign="center" py={4}>
                                No departments found in this script
                            </Text>
                        ) : (
                            departments.map(department => (
                                <Box
                                    key={department.id}
                                    p={3}
                                    bg="page.background"
                                    border="2px solid"
                                    borderColor="ui.border"
                                    borderRadius="md"
                                    transition="all 0.2s"
                                    _hover={{ borderColor: "orange.400" }}
                                    cursor="pointer"
                                    onClick={() => handleDepartmentToggle(department.id)}
                                >
                                    <HStack justify="space-between">
                                        <HStack align="center" spacing={2}>
                                            {department.color && (
                                                <Box
                                                    width="12px"
                                                    height="12px"
                                                    borderRadius="full"
                                                    bg={department.color}
                                                />
                                            )}
                                            <Text fontWeight="medium" fontSize="sm">
                                                {department.name}
                                            </Text>
                                        </HStack>
                                        <Checkbox
                                            isChecked={localSelectedIds.includes(department.id)}
                                            colorScheme="blue"
                                            pointerEvents="none"
                                        />
                                    </HStack>
                                </Box>
                            ))
                        )}
                    </VStack>
                </Box>
            </VStack>
        </BaseModal>
    );
};