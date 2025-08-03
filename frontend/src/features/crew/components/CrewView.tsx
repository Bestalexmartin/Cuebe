// frontend/src/features/crew/components/CrewView.tsx

import React, { useState, useMemo } from 'react';
import { Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Spinner, Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/react";
import { useNavigate } from 'react-router-dom';
import { AppIcon } from '../../../components/AppIcon';
import { CrewCard } from './CrewCard';
import { useCrews } from '../hooks/useCrews';

// TypeScript interfaces
interface CrewViewProps {
    onCreateCrew: () => void;
    selectedCrewId?: string | null;
    onCrewClick: (crewId: string) => void;
    hoveredCardId?: string | null;
    setHoveredCardId: (id: string | null) => void;
    onSaveNavigationState?: () => void;
    sortBy: 'fullname_first' | 'fullname_last' | 'user_role' | 'email_address' | 'date_created' | 'date_updated';
    sortDirection: 'asc' | 'desc';
    onSortChange: (sortBy: 'fullname_first' | 'fullname_last' | 'user_role' | 'email_address' | 'date_created' | 'date_updated', sortDirection: 'asc' | 'desc') => void;
    showCardRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
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
    onSortChange,
    showCardRefs
}) => {
    const navigate = useNavigate();
    const { crews, isLoading, error } = useCrews();

    // Crew-specific sorting logic
    const handleSortClick = (newSortBy: typeof sortBy) => {
        if (sortBy === newSortBy) {
            const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            onSortChange(newSortBy, newDirection);
        } else {
            const newDirection = (newSortBy === 'date_created' || newSortBy === 'date_updated') ? 'desc' : 'asc';
            onSortChange(newSortBy, newDirection);
        }
    };

    const sortedCrews = useMemo(() => {
        if (!crews || crews.length === 0) return [];

        const crewsToSort = [...crews];
        crewsToSort.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'fullname_first') {
                const aName = `${a.fullname_first || ''} ${a.fullname_last || ''}`.trim();
                const bName = `${b.fullname_first || ''} ${b.fullname_last || ''}`.trim();
                comparison = aName.localeCompare(bName);
            } else if (sortBy === 'fullname_last') {
                const aName = `${a.fullname_last || ''} ${a.fullname_first || ''}`.trim();
                const bName = `${b.fullname_last || ''} ${b.fullname_first || ''}`.trim();
                comparison = aName.localeCompare(bName);
            } else if (sortBy === 'user_role') {
                const aRole = a.user_role || 'zzz';
                const bRole = b.user_role || 'zzz';
                comparison = aRole.localeCompare(bRole);
            } else if (sortBy === 'email_address') {
                const aEmail = a.email_address || 'zzz';
                const bEmail = b.email_address || 'zzz';
                comparison = aEmail.localeCompare(bEmail);
            } else if (sortBy === 'date_created') {
                comparison = new Date(b.date_created || b.date_updated).getTime() - new Date(a.date_created || a.date_updated).getTime();
            } else {
                comparison = new Date(b.date_updated || b.date_created).getTime() - new Date(a.date_updated || a.date_created).getTime();
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
                            <MenuList zIndex={9999}>
                                <MenuItem
                                    onClick={() => handleSortClick('fullname_first')}
                                    color={sortBy === 'fullname_first' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'fullname_first' ? 'bold' : 'normal'}
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    First Name
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleSortClick('fullname_last')}
                                    color={sortBy === 'fullname_last' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'fullname_last' ? 'bold' : 'normal'}
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    Last Name
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleSortClick('user_role')}
                                    color={sortBy === 'user_role' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'user_role' ? 'bold' : 'normal'}
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    Role
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleSortClick('email_address')}
                                    color={sortBy === 'email_address' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'email_address' ? 'bold' : 'normal'}
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    Email
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleSortClick('date_created')}
                                    color={sortBy === 'date_created' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'date_created' ? 'bold' : 'normal'}
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    Created
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
                                    <div key={crewMember.user_id} ref={el => { showCardRefs.current[crewMember.user_id] = el; }}>
                                        <CrewCard
                                            crewMember={crewMember}
                                            onEdit={handleEdit}
                                            onCrewClick={onCrewClick}
                                            isHovered={hoveredCardId === crewMember.user_id}
                                            isSelected={selectedCrewId === crewMember.user_id}
                                            onHover={setHoveredCardId}
                                            onSaveNavigationState={onSaveNavigationState}
                                        />
                                    </div>
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
