// frontend/src/EditDepartmentPage.tsx

import React, { useEffect } from 'react';
import {
    Flex, Box, Heading, HStack, VStack, Button, Text, Spinner,
    FormControl, FormLabel, Input, Textarea
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useDepartment } from "./hooks/useDepartment";
import { useFormManager } from './hooks/useFormManager';
import { AppIcon } from './components/AppIcon';

// TypeScript interfaces
interface DepartmentFormData {
    departmentName: string;
    departmentDescription: string;
    departmentColor: string;
}

interface PresetColor {
    name: string;
    value: string;
}

const INITIAL_FORM_STATE: DepartmentFormData = {
    departmentName: '',
    departmentDescription: '',
    departmentColor: '#3182CE'
};

// Predefined color options for quick selection (same as CreateDepartmentModal)
const PRESET_COLORS: PresetColor[] = [
    { name: 'Blue', value: '#6495ED' },
    { name: 'Orange', value: '#e79e40' },
    { name: 'Green', value: '#48BB78' },
    { name: 'Red', value: '#F56565' },
    { name: 'Purple', value: '#9F7AEA' },
    { name: 'Teal', value: '#38B2AC' },
    { name: 'Pink', value: '#ED64A6' },
    { name: 'Yellow', value: '#ECC94B' },
];

export const EditDepartmentPage: React.FC = () => {
    const { departmentId } = useParams<{ departmentId: string }>();
    const navigate = useNavigate();

    // Fetch the initial department data
    const { department, isLoading: isLoadingDepartment, error: departmentError } = useDepartment(departmentId);

    // Form management
    const {
        formData,
        isSubmitting,
        updateField,
        setFormData,
        submitForm,
    } = useFormManager<DepartmentFormData>(INITIAL_FORM_STATE);

    // Populate form when department data loads
    useEffect(() => {
        if (department) {
            setFormData({
                departmentName: department.departmentName || '',
                departmentDescription: department.departmentDescription || '',
                departmentColor: department.departmentColor || '#3182CE'
            });
        }
    }, [department, setFormData]);

    // Handle form field changes
    const handleChange = (field: keyof DepartmentFormData, value: string) => {
        updateField(field, value);
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!departmentId) return;

        try {
            // Prepare data for API
            const updateData = {
                departmentName: formData.departmentName,
                departmentDescription: formData.departmentDescription || null,
                departmentColor: formData.departmentColor,
            };

            await submitForm(
                `/api/departments/${departmentId}`,
                'PATCH',
                `"${formData.departmentName}" has been updated successfully`,
                updateData
            );

            // Navigate back to dashboard on success
            navigate('/dashboard', {
                state: {
                    view: 'departments',
                    selectedDepartmentId: departmentId,
                    returnFromEdit: true
                }
            });

        } catch (error) {
            // Error handled by submitForm
        }
    };

    const handleClose = () => {
        navigate('/dashboard', {
            state: {
                view: 'departments',
                selectedDepartmentId: departmentId,
                returnFromEdit: true
            }
        });
    };

    const isFormValid = (): boolean => {
        return formData.departmentName.trim().length > 0 && formData.departmentColor.trim().length > 0;
    };

    return (
        <Flex
            as="form"
            onSubmit={handleSubmit}
            width="100%"
            height="100%"
            p="2rem"
            flexDirection="column"
            boxSizing="border-box"
        >
            {/* Header Section */}
            <Flex justify="space-between" align="center" flexShrink={0}>
                <HStack spacing="2" align="center">
                    <AppIcon name="edit" boxSize="20px" />
                    <Heading as="h2" size="md">
                        {isLoadingDepartment ? 'Loading...' : `${department?.departmentName}`}
                    </Heading>
                </HStack>
                <HStack spacing="2">
                    <Button
                        onClick={handleClose}
                        size="xs"
                        _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
                    >
                        Cancel
                    </Button>
                    <Button
                        bg="blue.400"
                        color="white"
                        size="xs"
                        _hover={{ bg: 'orange.400' }}
                        type="submit"
                        isLoading={isSubmitting}
                        isDisabled={!isFormValid()}
                    >
                        Save Changes
                    </Button>
                </HStack>
            </Flex>

            {/* Form Content Box */}
            <Box
                mt="4"
                border="1px solid"
                borderColor="container.border"
                p="4"
                pb="8"
                borderRadius="md"
                flexGrow={1}
                overflowY="auto"
                className="hide-scrollbar"
            >
                {/* Loading State */}
                {isLoadingDepartment && (
                    <Flex justify="center" align="center" height="200px">
                        <Spinner />
                    </Flex>
                )}

                {/* Error State */}
                {departmentError && (
                    <Text color="red.500" textAlign="center" p="4">
                        {departmentError}
                    </Text>
                )}

                {/* Form Content */}
                {!isLoadingDepartment && department && (
                    <VStack spacing={6} align="stretch">
                        {/* Basic Information */}
                        <FormControl isRequired>
                            <FormLabel>Department Name</FormLabel>
                            <Input
                                value={formData.departmentName}
                                onChange={(e) => handleChange('departmentName', e.target.value)}
                                placeholder="Enter department name"
                            />
                        </FormControl>

                        {/* Color Selection */}
                        <FormControl isRequired>
                            <FormLabel>Department Color</FormLabel>
                            <VStack align="stretch" spacing="3">
                                <HStack spacing="4" align="center">
                                    <Input
                                        type="color"
                                        value={formData.departmentColor}
                                        onChange={(e) => handleChange('departmentColor', e.target.value)}
                                        width="80px"
                                        height="40px"
                                        padding="4px"
                                        border="2px solid"
                                        borderColor="gray.300"
                                        borderRadius="md"
                                        cursor="pointer"
                                    />
                                    <Input
                                        value={formData.departmentColor}
                                        onChange={(e) => handleChange('departmentColor', e.target.value)}
                                        placeholder="#3182CE"
                                        maxWidth="120px"
                                        fontFamily="mono"
                                    />
                                    <Text fontSize="sm" color="detail.text">
                                        Click the color box or enter a hex value
                                    </Text>
                                </HStack>

                                {/* Preset Color Options */}
                                <Box>
                                    <Text fontSize="sm" color="detail.text" mb={2}>
                                        Quick Colors:
                                    </Text>
                                    <HStack spacing={2} flexWrap="wrap">
                                        {PRESET_COLORS.map((color) => (
                                            <Button
                                                key={color.value}
                                                size="sm"
                                                height="30px"
                                                width="30px"
                                                minWidth="30px"
                                                backgroundColor={color.value}
                                                border={formData.departmentColor === color.value ? '3px solid' : '1px solid'}
                                                borderColor={formData.departmentColor === color.value ? 'white' : 'gray.300'}
                                                onClick={() => handleChange('departmentColor', color.value)}
                                                _hover={{ transform: 'scale(1.1)' }}
                                                title={color.name}
                                            />
                                        ))}
                                    </HStack>
                                </Box>

                                {/* Color Preview */}
                                <Box>
                                    <Text fontSize="sm" fontWeight="medium" mb="2">Preview:</Text>
                                    <HStack spacing="3" align="center">
                                        <Box
                                            w="60px"
                                            h="60px"
                                            borderRadius="full"
                                            bg={formData.departmentColor}
                                            border="2px solid"
                                            borderColor="gray.300"
                                            _dark={{ borderColor: "gray.600" }}
                                        />
                                        <VStack align="start" spacing="0">
                                            <Text fontSize="sm" fontWeight="medium">
                                                {formData.departmentName || 'Department Name'}
                                            </Text>
                                            <Text fontSize="xs" color="detail.text">
                                                {formData.departmentColor.toUpperCase()}
                                            </Text>
                                        </VStack>
                                    </HStack>
                                </Box>
                            </VStack>
                        </FormControl>

                        {/* Department Description */}
                        <FormControl display="flex" flexDirection="column" flexGrow={1}>
                            <FormLabel>Department Description</FormLabel>
                            <Textarea
                                value={formData.departmentDescription}
                                onChange={(e) => handleChange('departmentDescription', e.target.value)}
                                placeholder="Describe this department's role and responsibilities"
                                flexGrow={1}
                                resize="vertical"
                                minHeight="120px"
                            />
                            <Text fontSize="xs" color="detail.text" mt="1">
                                This description will help crew members understand the department's purpose and responsibilities.
                            </Text>
                        </FormControl>

                        {/* Department Statistics (Read-only) */}
                        <Box
                            p="4"
                            bg="gray.50"
                            _dark={{ bg: "gray.700" }}
                            borderRadius="md"
                        >
                            <Text fontWeight="semibold" mb="3">Department Statistics</Text>
                            <VStack align="stretch" spacing="2" fontSize="sm" color="detail.text">
                                <HStack justify="space-between">
                                    <Text>Crew Members:</Text>
                                    <Text fontWeight="medium">0</Text>
                                </HStack>
                                <HStack justify="space-between">
                                    <Text>Shows Assigned:</Text>
                                    <Text fontWeight="medium">0</Text>
                                </HStack>
                                <HStack justify="space-between">
                                    <Text>Created:</Text>
                                    <Text fontWeight="medium">
                                        {new Date(department.dateCreated).toLocaleDateString()}
                                    </Text>
                                </HStack>
                                <HStack justify="space-between">
                                    <Text>Last Updated:</Text>
                                    <Text fontWeight="medium">
                                        {new Date(department.dateUpdated).toLocaleDateString()}
                                    </Text>
                                </HStack>
                            </VStack>
                            <Text fontSize="xs" color="detail.text" mt="3" fontStyle="italic">
                                Crew member and show assignment counts will be updated when those features are implemented.
                            </Text>
                        </Box>
                    </VStack>
                )}
            </Box>
        </Flex>
    );
};