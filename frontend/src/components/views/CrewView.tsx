// frontend/src/CrewView.tsx

import React, { useState, useMemo } from 'react';
import { Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Spinner, Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/react";
import { useNavigate } from 'react-router-dom';
import { AppIcon } from '../AppIcon';
import { CrewCard } from '../cards/CrewCard';
import { useCrews } from '../../hooks/useCrews';

// TypeScript interfaces
interface CrewViewProps {
    onCreateCrew: () => void;
    selectedCrewId?: string | null;
    onCrewClick: (crewId: string) => void;
    hoveredCardId?: string | null;
    setHoveredCardId: (id: string | null) => void;
    onSaveNavigationState?: () => void;
    sortBy: 'fullnameFirst' | 'fullnameLast' | 'userRole' | 'emailAddress' | 'dateCreated' | 'dateUpdated';
    sortDirection: 'asc' | 'desc';
    onSortChange: (sortBy: 'fullnameFirst' | 'fullnameLast' | 'userRole' | 'emailAddress' | 'dateCreated' | 'dateUpdated', sortDirection: 'asc' | 'desc') => void;
}

export const CrewView: React.FC<CrewViewProps> = ({
    onCreateCrew,
    selectedCrewId,
    onCrewClick,
    hoveredCardId,
    setHoveredCardId,
    onSaveNavigationState,
    sortBy,
    sortDirection,
    onSortChange
}) => {
    const navigate = useNavigate();
    const { crews, isLoading, error } = useCrews();

    // Crew-specific sorting logic
    const handleSortClick = (newSortBy: typeof sortBy) => {
        if (sortBy === newSortBy) {
            const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            onSortChange(newSortBy, newDirection);
        } else {
            const newDirection = (newSortBy === 'dateCreated' || newSortBy === 'dateUpdated') ? 'desc' : 'asc';
            onSortChange(newSortBy, newDirection);
        }
    };

    const sortedCrews = useMemo(() => {
        if (!crews || crews.length === 0) return [];

        const crewsToSort = [...crews];
        crewsToSort.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'fullnameFirst') {
                const aName = `${a.fullnameFirst || ''} ${a.fullnameLast || ''}`.trim();
                const bName = `${b.fullnameFirst || ''} ${b.fullnameLast || ''}`.trim();
                comparison = aName.localeCompare(bName);
            } else if (sortBy === 'fullnameLast') {
                const aName = `${a.fullnameLast || ''} ${a.fullnameFirst || ''}`.trim();
                const bName = `${b.fullnameLast || ''} ${b.fullnameFirst || ''}`.trim();
                comparison = aName.localeCompare(bName);
            } else if (sortBy === 'userRole') {
                const aRole = a.userRole || 'zzz';
                const bRole = b.userRole || 'zzz';
                comparison = aRole.localeCompare(bRole);
            } else if (sortBy === 'emailAddress') {
                const aEmail = a.emailAddress || 'zzz';
                const bEmail = b.emailAddress || 'zzz';
                comparison = aEmail.localeCompare(bEmail);
            } else if (sortBy === 'dateCreated') {
                comparison = new Date(b.dateCreated || b.dateUpdated).getTime() - new Date(a.dateCreated || a.dateUpdated).getTime();
            } else {
                comparison = new Date(b.dateUpdated || b.dateCreated).getTime() - new Date(a.dateUpdated || a.dateCreated).getTime();
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        return crewsToSort;
    }, [crews, sortBy, sortDirection]);

    const handleEdit = (crewId: string) => {
        if (onSaveNavigationState) {
            onSaveNavigationState();
        }
        navigate(`/crew/${crewId}/edit`);
    };

    // Use the modal handler from props if provided, otherwise use local modal
    const handleCreateCrew = onCreateCrew;

    return (
        <>
            <Flex direction="column" height="100%">
                {/* Header Section */}
                <Flex justify="space-between" align="center" flexShrink={0}>
                    <HStack spacing="2" align="center">
                        <AppIcon name="crew" boxSize="25px" />
                        <Heading as="h2" size="md">Crew</Heading>
                    </HStack>
                    <HStack spacing="2">
                        <Menu>
                            <MenuButton as={Button} size="xs" rightIcon={<AppIcon name={sortDirection} boxSize={4} />}>Sort</MenuButton>
                            <MenuList>
                                <MenuItem
                                    onClick={() => handleSortClick('fullnameFirst')}
                                    color={sortBy === 'fullnameFirst' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'fullnameFirst' ? 'bold' : 'normal'}
                                >
                                    First Name
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleSortClick('fullnameLast')}
                                    color={sortBy === 'fullnameLast' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'fullnameLast' ? 'bold' : 'normal'}
                                >
                                    Last Name
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleSortClick('userRole')}
                                    color={sortBy === 'userRole' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'userRole' ? 'bold' : 'normal'}
                                >
                                    Role
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleSortClick('emailAddress')}
                                    color={sortBy === 'emailAddress' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'emailAddress' ? 'bold' : 'normal'}
                                >
                                    Email
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleSortClick('dateCreated')}
                                    color={sortBy === 'dateCreated' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'dateCreated' ? 'bold' : 'normal'}
                                >
                                    Date Added
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleSortClick('dateUpdated')}
                                    color={sortBy === 'dateUpdated' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'dateUpdated' ? 'bold' : 'normal'}
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
                            onClick={handleCreateCrew}
                            _hover={{ bg: 'orange.400' }}
                        >
                            Add Crew
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
                        sortedCrews.length > 0 ? (
                            <VStack spacing={4} align="stretch">
                                {sortedCrews.map(crewMember => (
                                    <CrewCard
                                        key={crewMember.userID}
                                        crewMember={crewMember}
                                        onEdit={handleEdit}
                                        onCrewClick={onCrewClick}
                                        isHovered={hoveredCardId === crewMember.userID}
                                        isSelected={selectedCrewId === crewMember.userID}
                                        onHover={setHoveredCardId}
                                        onSaveNavigationState={onSaveNavigationState}
                                    />
                                ))}
                            </VStack>
                        ) : (
                            <Flex direction="column" align="center" justify="center" height="200px" gap="4">
                                <AppIcon name="crew" boxSize="40px" color="gray.400" />
                                <Text color="gray.500" textAlign="center">
                                    You haven't added any crew yet.
                                </Text>
                                <Button
                                    bg="blue.400"
                                    color="white"
                                    size="sm"
                                    onClick={handleCreateCrew}
                                    _hover={{ bg: 'orange.400' }}
                                >
                                    Add Your First Crew
                                </Button>
                            </Flex>
                        )
                    )}
                </Box>
            </Flex>

        </>
    );
};