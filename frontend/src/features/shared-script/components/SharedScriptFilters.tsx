// frontend/src/features/shared-script/components/SharedScriptFilters.tsx

import React from 'react';
import {
    Box,
    HStack,
    VStack,
    Text,
    Input,
    InputGroup,
    InputLeftElement,
    Select,
    Checkbox,
    Badge,
    useColorModeValue,
    Flex,
    Button,
    IconButton,
    Collapse,
    useDisclosure
} from "@chakra-ui/react";
import { Department } from '../types/sharedScript';
import { AppIcon } from '../../../components/AppIcon';

interface SharedScriptFiltersProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedDepartment: string;
    onDepartmentChange: (departmentId: string) => void;
    departments: Department[];
    showAdvancedFilters?: boolean;
    elementTypeFilter?: string;
    onElementTypeChange?: (type: string) => void;
    priorityFilter?: string;
    onPriorityChange?: (priority: string) => void;
    triggerTypeFilter?: string;
    onTriggerTypeChange?: (trigger: string) => void;
}

export const SharedScriptFilters: React.FC<SharedScriptFiltersProps> = ({
    searchQuery,
    onSearchChange,
    selectedDepartment,
    onDepartmentChange,
    departments,
    showAdvancedFilters = false,
    elementTypeFilter = 'all',
    onElementTypeChange,
    priorityFilter = 'all',
    onPriorityChange,
    triggerTypeFilter = 'all',
    onTriggerTypeChange
}) => {
    const { isOpen, onToggle } = useDisclosure();
    const containerBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    // Department options for select
    const departmentOptions = [
        { value: 'all', label: 'All Departments' },
        ...departments.map(dept => ({
            value: dept.department_id,
            label: dept.department_name
        }))
    ];

    // Element type options
    const elementTypeOptions = [
        { value: 'all', label: 'All Types' },
        { value: 'CUE', label: 'Cues' },
        { value: 'NOTE', label: 'Notes' },
        { value: 'GROUP', label: 'Groups' }
    ];

    // Priority options
    const priorityOptions = [
        { value: 'all', label: 'All Priorities' },
        { value: 'SAFETY', label: 'Safety' },
        { value: 'CRITICAL', label: 'Critical' },
        { value: 'HIGH', label: 'High' },
        { value: 'NORMAL', label: 'Normal' },
        { value: 'LOW', label: 'Low' },
        { value: 'OPTIONAL', label: 'Optional' }
    ];

    // Trigger type options
    const triggerTypeOptions = [
        { value: 'all', label: 'All Triggers' },
        { value: 'MANUAL', label: 'Manual' },
        { value: 'TIME', label: 'Timed' },
        { value: 'AUTO', label: 'Auto' },
        { value: 'FOLLOW', label: 'Follow' },
        { value: 'GO', label: 'Go' },
        { value: 'STANDBY', label: 'Standby' }
    ];

    return (
        <Box
            bg={containerBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="lg"
            p={4}
            mb={4}
        >
            {/* Basic Filters */}
            <VStack spacing={4} align="stretch">
                <HStack spacing={4} flexWrap="wrap">
                    {/* Search */}
                    <InputGroup flex={1} minW="250px">
                        <InputLeftElement pointerEvents="none">
                            <AppIcon name="search" color="gray.400" />
                        </InputLeftElement>
                        <Input
                            placeholder="Search cues, descriptions, notes..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </InputGroup>

                    {/* Department Filter */}
                    {departmentOptions.length > 1 && (
                        <Select
                            value={selectedDepartment}
                            onChange={(e) => onDepartmentChange(e.target.value)}
                            width="200px"
                        >
                            {departmentOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                    )}

                    {/* Advanced Filters Toggle */}
                    {showAdvancedFilters && (
                        <Button
                            variant="outline"
                            size="md"
                            onClick={onToggle}
                            rightIcon={isOpen ? <AppIcon name="closemenu" /> : <AppIcon name="openmenu" />}
                        >
                            Filters
                        </Button>
                    )}
                </HStack>

                {/* Department Badges (when filtering) */}
                {selectedDepartment !== 'all' && departments.length > 0 && (
                    <Box>
                        <Text fontSize="sm" color="gray.600" mb={2}>
                            Showing elements for:
                        </Text>
                        <HStack spacing={2} flexWrap="wrap">
                            {departments
                                .filter(dept => selectedDepartment === 'all' || dept.department_id === selectedDepartment)
                                .map(dept => (
                                    <Badge
                                        key={dept.department_id}
                                        colorScheme="blue"
                                        variant="solid"
                                        borderRadius="full"
                                        px={3}
                                        py={1}
                                        fontSize="xs"
                                        style={{
                                            backgroundColor: dept.department_color || undefined,
                                            color: 'white'
                                        }}
                                    >
                                        {dept.department_initials || dept.department_name}
                                    </Badge>
                                ))
                            }
                        </HStack>
                    </Box>
                )}

                {/* Advanced Filters */}
                {showAdvancedFilters && (
                    <Collapse in={isOpen} animateOpacity>
                        <VStack spacing={4} align="stretch" pt={4} borderTop="1px solid" borderColor={borderColor}>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.600">
                                Advanced Filters
                            </Text>

                            <HStack spacing={4} flexWrap="wrap">
                                {/* Element Type Filter */}
                                {onElementTypeChange && (
                                    <Box>
                                        <Text fontSize="xs" color="gray.500" mb={1}>
                                            Element Type
                                        </Text>
                                        <Select
                                            value={elementTypeFilter}
                                            onChange={(e) => onElementTypeChange(e.target.value)}
                                            size="sm"
                                            width="150px"
                                        >
                                            {elementTypeOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </Select>
                                    </Box>
                                )}

                                {/* Priority Filter */}
                                {onPriorityChange && (
                                    <Box>
                                        <Text fontSize="xs" color="gray.500" mb={1}>
                                            Priority
                                        </Text>
                                        <Select
                                            value={priorityFilter}
                                            onChange={(e) => onPriorityChange(e.target.value)}
                                            size="sm"
                                            width="150px"
                                        >
                                            {priorityOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </Select>
                                    </Box>
                                )}

                                {/* Trigger Type Filter */}
                                {onTriggerTypeChange && (
                                    <Box>
                                        <Text fontSize="xs" color="gray.500" mb={1}>
                                            Trigger Type
                                        </Text>
                                        <Select
                                            value={triggerTypeFilter}
                                            onChange={(e) => onTriggerTypeChange(e.target.value)}
                                            size="sm"
                                            width="150px"
                                        >
                                            {triggerTypeOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </Select>
                                    </Box>
                                )}
                            </HStack>

                            {/* Clear Filters Button */}
                            <Box>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        onSearchChange('');
                                        onDepartmentChange('all');
                                        onElementTypeChange?.('all');
                                        onPriorityChange?.('all');
                                        onTriggerTypeChange?.('all');
                                    }}
                                >
                                    Clear All Filters
                                </Button>
                            </Box>
                        </VStack>
                    </Collapse>
                )}
            </VStack>
        </Box>
    );
};