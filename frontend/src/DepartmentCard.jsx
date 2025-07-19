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
    Heading
} from "@chakra-ui/react";
import { AppIcon } from './components/AppIcon';

export const DepartmentCard = ({
    department,
    onEdit,
    onDepartmentClick,
    isHovered,
    isSelected,
    onHover,
    onSaveNavigationState
}) => {
    const borderColor = isHovered ? 'orange.400' : isSelected ? 'blue.400' : 'gray.600';

    const handleEditClick = (e) => {
        e.stopPropagation();

        if (onSaveNavigationState) {
            onSaveNavigationState();
        }

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
                    {/* Color chip on the left */}
                    {department.departmentColor && (
                        <Box
                            w="32px"
                            h="32px"
                            borderRadius="full"
                            bg={department.departmentColor}
                            border="2px solid"
                            borderColor="gray.300"
                            _dark={{ borderColor: "gray.600" }}
                            flexShrink="0"
                        />
                    )}

                    {/* Department name */}
                    <Heading size="sm">{department.departmentName}</Heading>
                </Flex>

                {isSelected && (
                    <HStack spacing="1" flexShrink="0">
                        <Button
                            aria-label="Edit Department"
                            leftIcon={<AppIcon name="edit" boxSize="12px" />}
                            size="xs"
                            onClick={handleEditClick}
                        >
                            Edit
                        </Button>
                    </HStack>
                )}
            </Flex>

            {/* Quick Info Row */}
            <HStack spacing="4" fontSize="sm" color="detail.text" justify="space-between">
                <HStack spacing="4">
                    <Text>0 crew members</Text>
                    <Text>0 shows assigned</Text>
                </HStack>
                <Text fontSize="xs">
                    Updated: {new Date(department.dateUpdated || department.dateCreated).toLocaleDateString()}
                </Text>
            </HStack>

            {/* Expandable Details - only show when selected */}
            <Collapse in={isSelected} animateOpacity>
                <VStack align="stretch" spacing="3" mt="4" pt="3" borderTop="1px solid" borderColor="ui.border">

                    {/* Full Description */}
                    {department.departmentDescription && (
                        <Box>
                            <Text fontWeight="semibold" mb="2">Description</Text>
                            <Text fontSize="sm" color="detail.text">
                                {department.departmentDescription}
                            </Text>
                        </Box>
                    )}

                    {/* Color Information */}
                    {department.departmentColor && (
                        <Box>
                            <Text fontWeight="semibold" mb="2">Department Color</Text>
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
                                    <Text fontSize="sm" fontWeight="medium">
                                        {department.departmentColor.toUpperCase()}
                                    </Text>
                                    <Text fontSize="xs" color="detail.text">
                                        Hex Color Code
                                    </Text>
                                </VStack>
                            </HStack>
                        </Box>
                    )}

                    {/* Department Statistics */}
                    <Box>
                        <Text fontWeight="semibold" mb="2">Statistics</Text>
                        <HStack spacing="4" fontSize="sm" color="detail.text">
                            <Text>0 crew members</Text>
                            <Text>0 shows assigned</Text>
                        </HStack>
                    </Box>

                    {/* Created Date */}
                    <Flex justify="flex-end">
                        <Text fontSize="xs" color="detail.text">
                            Created: {new Date(department.dateCreated || department.dateUpdated).toLocaleDateString()}
                        </Text>
                    </Flex>
                </VStack>
            </Collapse>
        </Box>
    );
};