// frontend/src/DepartmentsView.jsx

import { useState, useMemo } from 'react';
import { Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Spinner, Menu, MenuButton, MenuList, MenuItem, useDisclosure } from "@chakra-ui/react";
import { useNavigate } from 'react-router-dom';
import { AppIcon } from './components/AppIcon';
import { DepartmentCard } from './DepartmentCard';
import { useDepartments } from './hooks/useDepartments';
import { CreateDepartmentModal } from './components/modals/CreateDepartmentModal';

export const DepartmentsView = ({
    onCreateDepartment,
    selectedDepartmentId,
    onDepartmentClick,
    hoveredCardId,
    setHoveredCardId,
    onSaveNavigationState // NEW: Add prop for saving navigation state
}) => {
    const navigate = useNavigate();
    const { departments, isLoading, error, refetchDepartments } = useDepartments();
    const { isOpen, onOpen, onClose } = useDisclosure();

    // Department-specific sorting state  
    const [sortBy, setSortBy] = useState('departmentName');
    const [sortDirection, setSortDirection] = useState('asc');

    // Department-specific sorting logic
    const handleSortClick = (newSortBy) => {
        if (sortBy === newSortBy) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(newSortBy);
            setSortDirection(newSortBy === 'departmentName' ? 'asc' : 'desc');
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
                const getHue = (hex) => {
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
            } else { // 'dateCreated'
                comparison = new Date(b.dateCreated || b.dateUpdated) - new Date(a.dateCreated || a.dateUpdated);
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        return departmentsToSort;
    }, [departments, sortBy, sortDirection]);

    const handleEdit = (departmentId) => {
        if (onSaveNavigationState) {
            onSaveNavigationState();
        }
        navigate(`/departments/${departmentId}/edit`);
    };

    // Use the modal handler from props if provided, otherwise use local modal
    const handleCreateDepartment = onCreateDepartment || onOpen;

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
                            <MenuButton as={Button} size="xs" rightIcon={<AppIcon name="openmenu" />}>
                                Sort by: {sortBy === 'departmentName' ? 'Name' : sortBy === 'departmentColor' ? 'Color' : 'Date Added'}
                            </MenuButton>
                            <MenuList>
                                <MenuItem onClick={() => handleSortClick('departmentName')}>Name</MenuItem>
                                <MenuItem onClick={() => handleSortClick('departmentColor')}>Color</MenuItem>
                                <MenuItem onClick={() => handleSortClick('dateCreated')}>Date Added</MenuItem>
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
                                    <DepartmentCard
                                        key={department.departmentID}
                                        department={department}
                                        onEdit={handleEdit}
                                        onDepartmentClick={onDepartmentClick}
                                        isHovered={hoveredCardId === department.departmentID}
                                        isSelected={selectedDepartmentId === department.departmentID}
                                        onHover={setHoveredCardId}
                                        onSaveNavigationState={onSaveNavigationState} // NEW: Pass down the save function
                                    />
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

            <CreateDepartmentModal
                isOpen={isOpen}
                onClose={onClose}
                onDepartmentCreated={refetchDepartments}
            />
        </>
    );
};