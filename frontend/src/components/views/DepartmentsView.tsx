// frontend/src/DepartmentsView.tsx

import React, { useState, useMemo } from 'react';
import { Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Spinner, Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/react";
import { useNavigate } from 'react-router-dom';
import { AppIcon } from '../AppIcon';
import { DepartmentCard } from '../cards/DepartmentCard';
import { useDepartments } from '../../hooks/useDepartments';


// TypeScript interfaces
interface DepartmentsViewProps {
    onCreateDepartment: () => void;
    selectedDepartmentId?: string | null;
    onDepartmentClick: (departmentId: string) => void;
    hoveredCardId?: string | null;
    setHoveredCardId: (id: string | null) => void;
    onSaveNavigationState?: () => void;
    sortBy: 'departmentName' | 'departmentColor' | 'dateCreated' | 'dateUpdated';
    sortDirection: 'asc' | 'desc';
    onSortChange: (sortBy: 'departmentName' | 'departmentColor' | 'dateCreated' | 'dateUpdated', sortDirection: 'asc' | 'desc') => void;
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
            const newDirection = newSortBy === 'departmentName' ? 'asc' : 'desc';
            onSortChange(newSortBy, newDirection);
        }
    };

    const sortedDepartments = useMemo(() => {
        if (!departments || departments.length === 0) return [];

        const departmentsToSort = [...departments];
        departmentsToSort.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'departmentName') {
                comparison = a.departmentName.localeCompare(b.departmentName);
            } else if (sortBy === 'departmentColor') {
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
                comparison = getHue(a.departmentColor) - getHue(b.departmentColor);
            } else if (sortBy === 'dateCreated') {
                comparison = new Date(b.dateCreated || b.dateUpdated).getTime() - new Date(a.dateCreated || a.dateUpdated).getTime();
            } else {
                comparison = new Date(b.dateUpdated || b.dateCreated).getTime() - new Date(a.dateUpdated || a.dateCreated).getTime();
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
                                    onClick={() => handleSortClick('departmentName')}
                                    color={sortBy === 'departmentName' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'departmentName' ? 'bold' : 'normal'}
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    Name
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleSortClick('departmentColor')}
                                    color={sortBy === 'departmentColor' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'departmentColor' ? 'bold' : 'normal'}
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    Color
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleSortClick('dateCreated')}
                                    color={sortBy === 'dateCreated' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'dateCreated' ? 'bold' : 'normal'}
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    Date Added
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleSortClick('dateUpdated')}
                                    color={sortBy === 'dateUpdated' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'dateUpdated' ? 'bold' : 'normal'}
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
                                    <div key={department.departmentID} ref={el => { showCardRefs.current[department.departmentID] = el; }}>
                                        <DepartmentCard
                                            department={department}
                                            onEdit={handleEdit}
                                            onDepartmentClick={onDepartmentClick}
                                            isHovered={hoveredCardId === department.departmentID}
                                            isSelected={selectedDepartmentId === department.departmentID}
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