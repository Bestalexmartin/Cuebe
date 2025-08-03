// frontend/src/features/departments/components/DepartmentsView.tsx

import React, { useState, useMemo } from 'react';
import { Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Spinner, Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/react";
import { useNavigate } from 'react-router-dom';
import { AppIcon } from '../../../components/AppIcon';
import { DepartmentCard } from './DepartmentCard';
import { useDepartments } from '../hooks/useDepartments';


// TypeScript interfaces
interface DepartmentsViewProps {
    onCreateDepartment: () => void;
    selectedDepartmentId?: string | null;
    onDepartmentClick: (departmentId: string) => void;
    hoveredCardId?: string | null;
    setHoveredCardId: (id: string | null) => void;
    onSaveNavigationState?: () => void;
    sortBy: 'department_name' | 'department_color' | 'date_created' | 'date_updated';
    sortDirection: 'asc' | 'desc';
    onSortChange: (sortBy: 'department_name' | 'department_color' | 'date_created' | 'date_updated', sortDirection: 'asc' | 'desc') => void;
    showCardRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
}

export const DepartmentsView: React.FC<DepartmentsViewProps> = ({
    onCreateDepartment,
    selectedDepartmentId,
    onDepartmentClick,
    hoveredCardId,
    setHoveredCardId,
    onSaveNavigationState,
    sortBy,
    sortDirection,
    onSortChange,
    showCardRefs
}) => {
    const navigate = useNavigate();
    const { departments, isLoading, error } = useDepartments();

    // Department-specific sorting logic
    const handleSortClick = (newSortBy: typeof sortBy) => {
        if (sortBy === newSortBy) {
            const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            onSortChange(newSortBy, newDirection);
        } else {
            const newDirection = newSortBy === 'department_name' ? 'asc' : 'desc';
            onSortChange(newSortBy, newDirection);
        }
    };

    const sortedDepartments = useMemo(() => {
        if (!departments || departments.length === 0) return [];

        const departmentsToSort = [...departments];
        departmentsToSort.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'department_name') {
                comparison = a.department_name.localeCompare(b.department_name);
            } else if (sortBy === 'department_color') {
                const getHue = (hex?: string) => {
                    if (!hex) return 999;
                    // Simple hex to hue conversion (approximate)
                    const r = parseInt(hex.slice(1, 3), 16) / 255;
                    const g = parseInt(hex.slice(3, 5), 16) / 255;
                    const b = parseInt(hex.slice(5, 7), 16) / 255;
                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);
                    let hue = 0;
                    if (max !== min) {
                        const delta = max - min;
                        switch (max) {
                            case r: hue = ((g - b) / delta) % 6; break;
                            case g: hue = (b - r) / delta + 2; break;
                            case b: hue = (r - g) / delta + 4; break;
                        }
                        hue *= 60;
                    }
                    return hue < 0 ? hue + 360 : hue;
                };
                comparison = getHue(a.department_color) - getHue(b.department_color);
            } else if (sortBy === 'date_created') {
                comparison = new Date(b.date_created || b.date_updated).getTime() - new Date(a.date_created || a.date_updated).getTime();
            } else {
                comparison = new Date(b.date_updated || b.date_created).getTime() - new Date(a.date_updated || a.date_created).getTime();
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        return departmentsToSort;
    }, [departments, sortBy, sortDirection]);

    const handleEdit = (departmentId: string) => {
        if (onSaveNavigationState) {
            onSaveNavigationState();
        }
        navigate(`/departments/${departmentId}/edit`);
    };

    // Use the modal handler from props if provided, otherwise use local modal
    const handleCreateDepartment = onCreateDepartment;

    return (
        <>
            <Flex direction="column" height="100%">
                {/* Header Section */}
                <Flex justify="space-between" align="center" flexShrink={0}>
                    <HStack spacing="2" align="center">
                        <AppIcon name="department" boxSize="25px" />
                        <Heading as="h2" size="md">Departments</Heading>
                    </HStack>
                    <HStack spacing="2">
                        <Menu>
                            <MenuButton as={Button} size="xs" rightIcon={<AppIcon name={sortDirection} boxSize={4} />}>Sort</MenuButton>
                            <MenuList zIndex={9999}>
                                <MenuItem
                                    onClick={() => handleSortClick('department_name')}
                                    color={sortBy === 'department_name' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'department_name' ? 'bold' : 'normal'}
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    Name
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleSortClick('department_color')}
                                    color={sortBy === 'department_color' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'department_color' ? 'bold' : 'normal'}
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    Color
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleSortClick('date_created')}
                                    color={sortBy === 'date_created' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'date_created' ? 'bold' : 'normal'}
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    Date Added
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleSortClick('date_updated')}
                                    color={sortBy === 'date_updated' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'date_updated' ? 'bold' : 'normal'}
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    Updated
                                </MenuItem>
                            </MenuList>
                        </Menu>
                        <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />
                        <Button
                            bg="blue.400"
                            color="white"
                            size="xs"
                            onClick={handleCreateDepartment}
                            _hover={{ bg: 'orange.400' }}
                        >
                            Add Department
                        </Button>
                    </HStack>
                </Flex>

                <Box
                    mt="4"
                    border="1px solid"
                    borderColor="container.border"
                    p="4"
                    borderRadius="md"
                    flexGrow={1}
                    overflowY="auto"
                    className="hide-scrollbar"
                >
                    {isLoading && (
                        <Flex justify="center" align="center" height="200px">
                            <Spinner />
                        </Flex>
                    )}
                    {error && (
                        <Text color="red.500" textAlign="center" p="4">
                            {error}
                        </Text>
                    )}
                    {!isLoading && !error && (
                        sortedDepartments.length > 0 ? (
                            <VStack spacing={4} align="stretch">
                                {sortedDepartments.map(department => (
                                    <div key={department.department_id} ref={el => { showCardRefs.current[department.department_id] = el; }}>
                                        <DepartmentCard
                                            department={department}
                                            onEdit={handleEdit}
                                            onDepartmentClick={onDepartmentClick}
                                            isHovered={hoveredCardId === department.department_id}
                                            isSelected={selectedDepartmentId === department.department_id}
                                            onHover={setHoveredCardId}
                                            onSaveNavigationState={onSaveNavigationState}
                                        />
                                    </div>
                                ))}
                            </VStack>
                        ) : (
                            <Flex direction="column" align="center" justify="center" height="200px" gap="4">
                                <AppIcon name="department" boxSize="40px" color="gray.400" />
                                <Text color="gray.500" textAlign="center">
                                    You haven't added any departments yet.
                                </Text>
                                <Button
                                    bg="blue.400"
                                    color="white"
                                    size="sm"
                                    onClick={handleCreateDepartment}
                                    _hover={{ bg: 'orange.400' }}
                                >
                                    Add Your First Department
                                </Button>
                            </Flex>
                        )
                    )}
                </Box>
            </Flex>

        </>
    );
};
