// frontend/src/features/shared-script/components/SharedScriptView.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Spinner,
    Flex,
    Heading,
    Badge,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Button,
    useColorModeValue,
    Input,
    InputGroup,
    InputLeftElement,
    Select,
    Divider,
    Icon
} from "@chakra-ui/react";
import { formatDistanceToNow } from 'date-fns';

import { SharedScriptElement } from './SharedScriptElement';
import { SharedScriptHeader } from './SharedScriptHeader';
import { SharedScriptFilters } from './SharedScriptFilters';
import { useSharedScript } from '../hooks/useSharedScript';
import { SharedScriptData, SharedScriptElement as SharedScriptElementType } from '../types/sharedScript';
import { AppIcon } from '../../../components/AppIcon';

interface SharedScriptViewProps {
    token: string;
    className?: string;
}

export const SharedScriptView: React.FC<SharedScriptViewProps> = ({
    token,
    className
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
    const [showOnlyMyElements, setShowOnlyMyElements] = useState(false);

    const {
        scriptData,
        isLoading,
        error,
        isExpired,
        refetch
    } = useSharedScript(token);

    // Background color for the main container
    const bgColor = useColorModeValue('gray.50', 'gray.900');
    const containerBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    // Filter elements based on search and department filters
    const filteredElements = useMemo(() => {
        if (!scriptData?.elements) return [];

        let filtered = [...scriptData.elements];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(element =>
                element.description?.toLowerCase().includes(query) ||
                element.cue_id?.toLowerCase().includes(query) ||
                element.cue_notes?.toLowerCase().includes(query)
            );
        }

        // Apply department filter
        if (selectedDepartment !== 'all') {
            filtered = filtered.filter(element =>
                element.department_id === selectedDepartment
            );
        }

        return filtered;
    }, [scriptData?.elements, searchQuery, selectedDepartment]);

    // Get department options for filtering
    const departmentOptions = useMemo(() => {
        if (!scriptData?.departments) return [];

        return [
            { value: 'all', label: 'All Departments' },
            ...scriptData.departments.map(dept => ({
                value: dept.department_id,
                label: dept.department_name
            }))
        ];
    }, [scriptData?.departments]);

    // Auto-refresh every 30 seconds if the script is still active
    useEffect(() => {
        if (!isExpired && scriptData) {
            const interval = setInterval(() => {
                refetch();
            }, 30000); // 30 seconds

            return () => clearInterval(interval);
        }
    }, [isExpired, scriptData, refetch]);

    if (isLoading) {
        return (
            <Flex
                height="100vh"
                align="center"
                justify="center"
                bg={bgColor}
                className={className}
            >
                <VStack spacing={4}>
                    <Spinner size="xl" color="blue.500" />
                    <Text>Loading script...</Text>
                </VStack>
            </Flex>
        );
    }

    if (error) {
        return (
            <Flex
                height="100vh"
                align="center"
                justify="center"
                bg={bgColor}
                p={8}
                className={className}
            >
                <Alert status="error" maxW="md" borderRadius="md">
                    <AlertIcon />
                    <Box>
                        <AlertTitle>Access Denied!</AlertTitle>
                        <AlertDescription>
                            {error}
                        </AlertDescription>
                    </Box>
                </Alert>
            </Flex>
        );
    }

    if (isExpired) {
        return (
            <Flex
                height="100vh"
                align="center"
                justify="center"
                bg={bgColor}
                p={8}
                className={className}
            >
                <Alert status="warning" maxW="md" borderRadius="md">
                    <AlertIcon />
                    <Box>
                        <AlertTitle>Link Expired!</AlertTitle>
                        <AlertDescription>
                            This sharing link has expired. Please request a new link from the script owner.
                        </AlertDescription>
                    </Box>
                </Alert>
            </Flex>
        );
    }

    if (!scriptData) {
        return (
            <Flex
                height="100vh"
                align="center"
                justify="center"
                bg={bgColor}
                className={className}
            >
                <Text>No script data available</Text>
            </Flex>
        );
    }

    return (
        <Box
            minHeight="100vh"
            bg={bgColor}
            className={className}
        >
            {/* Header */}
            <SharedScriptHeader scriptData={scriptData} />

            {/* Main Content */}
            <Box maxW="6xl" mx="auto" px={4} py={6}>
                {/* Filters and Search */}
                <VStack spacing={4} mb={6}>
                    <HStack width="100%" spacing={4} flexWrap="wrap">
                        {/* Search */}
                        <InputGroup flex={1} minW="250px">
                            <InputLeftElement pointerEvents="none">
                                <AppIcon name="search" color="gray.400" />
                            </InputLeftElement>
                            <Input
                                placeholder="Search cues, descriptions, notes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                bg={containerBg}
                            />
                        </InputGroup>

                        {/* Department Filter */}
                        {departmentOptions.length > 1 && (
                            <Select
                                value={selectedDepartment}
                                onChange={(e) => setSelectedDepartment(e.target.value)}
                                width="200px"
                                bg={containerBg}
                            >
                                {departmentOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </Select>
                        )}
                    </HStack>

                    {/* Results Summary */}
                    <HStack width="100%" justify="space-between" fontSize="sm" color="gray.600">
                        <Text>
                            Showing {filteredElements.length} of {scriptData.elements.length} elements
                        </Text>

                        {scriptData.last_updated && (
                            <HStack spacing={1}>
                                <AppIcon name="time" />
                                <Text>
                                    Updated {formatDistanceToNow(new Date(scriptData.last_updated))} ago
                                </Text>
                            </HStack>
                        )}
                    </HStack>
                </VStack>

                {/* Script Elements */}
                <Box
                    bg={containerBg}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor={borderColor}
                    overflow="hidden"
                >
                    {filteredElements.length === 0 ? (
                        <Flex
                            justify="center"
                            align="center"
                            py={20}
                            direction="column"
                            color="gray.500"
                        >
                            <Text fontSize="lg" mb={2}>No elements found</Text>
                            {searchQuery && (
                                <Text fontSize="sm">
                                    Try adjusting your search or filter criteria
                                </Text>
                            )}
                        </Flex>
                    ) : (
                        <VStack spacing={0} align="stretch">
                            {filteredElements.map((element, index) => (
                                <React.Fragment key={element.element_id}>
                                    <SharedScriptElement
                                        element={element}
                                        departments={scriptData.departments || []}
                                        isLast={index === filteredElements.length - 1}
                                    />
                                    {index < filteredElements.length - 1 && (
                                        <Divider />
                                    )}
                                </React.Fragment>
                            ))}
                        </VStack>
                    )}
                </Box>

                {/* Footer Info */}
                <Box mt={8} textAlign="center" color="gray.500" fontSize="sm">
                    <HStack justify="center" spacing={4} flexWrap="wrap">
                        {scriptData.share_name && (
                            <Text>Share: {scriptData.share_name}</Text>
                        )}

                        {scriptData.expires_at && (
                            <HStack spacing={1}>
                                <AppIcon name="calendar" />
                                <Text>
                                    Expires {formatDistanceToNow(new Date(scriptData.expires_at))} from now
                                </Text>
                            </HStack>
                        )}

                        <Text>Cuebe Shared Script</Text>
                    </HStack>
                </Box>
            </Box>
        </Box>
    );
};