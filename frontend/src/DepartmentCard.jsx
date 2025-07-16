// frontend/src/DepartmentCard.jsx

import React from 'react';
import {
    Box,
    Flex,
    HStack,
    VStack,
    Text,
    Collapse,
    Button,
    Tooltip,
    Heading
} from "@chakra-ui/react";
import { EditIcon } from '@chakra-ui/icons';

export const DepartmentCard = ({
    department,
    onEdit,
    onDepartmentClick,
    isHovered,
    isSelected,
    onHover
}) => {
    const borderColor = isHovered ? 'orange.400' : isSelected ? 'blue.400' : 'gray.600';

    const handleEditClick = (e) => {
        e.stopPropagation();
        onEdit(department.departmentID);
    };

    return (
        <Box
            p="4"
            borderWidth="2px"
            borderRadius="md"
            shadow="sm"
            cursor="pointer"
            borderColor={borderColor}
            _hover={{ borderColor: 'orange.400' }}
            onMouseEnter={() => onHover?.(department.departmentID)}
            onMouseLeave={() => onHover?.(null)}
            onClick={() => onDepartmentClick(department.departmentID)}
        >
            {/* Header Row */}
            <Flex justify="space-between" align="center" mb="2">
                <Flex align="center" gap="3">
                    <Heading size="sm">{department.departmentName}</Heading>
                    {department.departmentColor && (
                        <Box
                            w="24px"
                            h="24px"
                            borderRadius="full"
                            bg={department.departmentColor}
                            border="2px solid"
                            borderColor="gray.300"
                            _dark={{ borderColor: "gray.600" }}
                        />
                    )}
                </Flex>

                {isSelected && (
                    <HStack spacing="1">
                        <Button
                            aria-label="Edit Department"
                            leftIcon={<EditIcon />}
                            size="xs"
                            onClick={handleEditClick}
                        >
                            Edit
                        </Button>
                    </HStack>
                )}
            </Flex>

            {/* Quick Info Row */}
            {department.departmentDescription && (
                <Text fontSize="sm" color="gray.500" mb="2" noOfLines={2}>
                    {department.departmentDescription}
                </Text>
            )}

            {/* Expandable Details - only show when selected */}
            <Collapse in={isSelected} animateOpacity>
                <VStack align="stretch" spacing="3" mt="4" pt="3" borderTop="1px solid" borderColor="ui.border">

                    {/* Full Description */}
                    {department.departmentDescription && (
                        <Box>
                            <Text fontWeight="semibold" mb="1">Description</Text>
                            <Text fontSize="sm" color="gray.600">
                                {department.departmentDescription}
                            </Text>
                        </Box>
                    )}

                    {/* Color Information */}
                    {department.departmentColor && (
                        <Box>
                            <Text fontWeight="semibold" mb="1">Department Color</Text>
                            <HStack spacing="3" align="center">
                                <Box
                                    w="40px"
                                    h="40px"
                                    borderRadius="md"
                                    bg={department.departmentColor}
                                    border="2px solid"
                                    borderColor="gray.300"
                                    _dark={{ borderColor: "gray.600" }}
                                />
                                <VStack align="start" spacing="0">
                                    <Text fontSize="sm" fontWeight="medium" color="gray.700" _dark={{ color: "gray.300" }}>
                                        {department.departmentColor.toUpperCase()}
                                    </Text>
                                    <Text fontSize="xs" color="gray.500">
                                        Hex Color Code
                                    </Text>
                                </VStack>
                            </HStack>
                        </Box>
                    )}

                    {/* Department Statistics */}
                    <Box>
                        <Text fontWeight="semibold" mb="1">Statistics</Text>
                        <HStack spacing="4" fontSize="sm" color="gray.600">
                            <Text>👥 0 crew members</Text>
                            <Text>🎭 0 shows assigned</Text>
                        </HStack>
                    </Box>

                    {/* Last Updated */}
                    <Box>
                        <Text fontSize="xs" color="gray.400">
                            Created: {new Date(department.dateCreated || department.dateUpdated).toLocaleDateString()}
                        </Text>
                    </Box>
                </VStack>
            </Collapse>
        </Box>
    );
};