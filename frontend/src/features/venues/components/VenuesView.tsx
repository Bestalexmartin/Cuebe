// frontend/src/components/views/VenuesView.tsx

import React, { useState, useMemo } from 'react';
import { Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Spinner, Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/react";
import { AppIcon } from '../../../components/AppIcon';
import { useVenues } from '../hooks/useVenues';
import { VenueCard } from './VenueCard';
import { useNavigate } from 'react-router-dom';

// TypeScript interfaces
interface VenuesViewProps {
    onCreateVenue: () => void;
    selectedVenueId?: string | null;
    onVenueClick: (venueId: string) => void;
    hoveredCardId?: string | null;
    setHoveredCardId: (id: string | null) => void;
    onSaveNavigationState?: () => void;
    sortBy: 'venueName' | 'capacity' | 'venueType' | 'dateCreated' | 'dateUpdated';
    sortDirection: 'asc' | 'desc';
    onSortChange: (sortBy: 'venueName' | 'capacity' | 'venueType' | 'dateCreated' | 'dateUpdated', sortDirection: 'asc' | 'desc') => void;
    showCardRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
}

export const VenuesView: React.FC<VenuesViewProps> = ({
    onCreateVenue,
    selectedVenueId,
    onVenueClick,
    hoveredCardId,
    setHoveredCardId,
    onSaveNavigationState,
    sortBy,
    sortDirection,
    onSortChange,
    showCardRefs
}) => {
    const navigate = useNavigate();
    const { venues, isLoading } = useVenues();

    // Venue-specific sorting logic
    const handleSortClick = (newSortBy: typeof sortBy) => {
        if (sortBy === newSortBy) {
            const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            onSortChange(newSortBy, newDirection);
        } else {
            const newDirection = newSortBy === 'venueName' ? 'asc' : 'desc';
            onSortChange(newSortBy, newDirection);
        }
    };

    const sortedVenues = useMemo(() => {
        if (!venues || venues.length === 0) return [];

        const venuesToSort = [...venues];
        venuesToSort.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'venueName') {
                comparison = a.venueName.localeCompare(b.venueName);
            } else if (sortBy === 'capacity') {
                const aCapacity = a.capacity || 0;
                const bCapacity = b.capacity || 0;
                comparison = aCapacity - bCapacity;
            } else if (sortBy === 'venueType') {
                const aType = a.venueType || 'ZZZ';
                const bType = b.venueType || 'ZZZ';
                comparison = aType.localeCompare(bType);
            } else if (sortBy === 'dateCreated') {
                comparison = new Date(b.dateCreated || b.dateUpdated).getTime() - new Date(a.dateCreated || a.dateUpdated).getTime();
            } else {
                comparison = new Date(b.dateUpdated || b.dateCreated).getTime() - new Date(a.dateUpdated || a.dateCreated).getTime();
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        return venuesToSort;
    }, [venues, sortBy, sortDirection]);

    const handleEdit = (venueId: string) => {
        // Save navigation state before leaving dashboard
        if (onSaveNavigationState) {
            onSaveNavigationState();
        }

        navigate(`/venues/${venueId}/edit`);
    };

    // Use the modal handler from props if provided, otherwise use local modal
    const handleCreateVenue = onCreateVenue;

    return (
        <>
            <Flex direction="column" height="100%">
                <Flex justify="space-between" align="center" flexShrink={0}>
                    <HStack spacing="2" align="center">
                        <AppIcon name="venue" boxSize="25px" />
                        <Heading as="h2" size="md">Venues</Heading>
                    </HStack>
                    <HStack spacing="2">
                        <Menu>
                            <MenuButton as={Button} size="xs" rightIcon={<AppIcon name={sortDirection} boxSize={4} />}>Sort</MenuButton>
                            <MenuList zIndex={9999}>
                                <MenuItem
                                    onClick={() => handleSortClick('venueName')}
                                    color={sortBy === 'venueName' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'venueName' ? 'bold' : 'normal'}
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    Name
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleSortClick('capacity')}
                                    color={sortBy === 'capacity' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'capacity' ? 'bold' : 'normal'}
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    Capacity
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleSortClick('venueType')}
                                    color={sortBy === 'venueType' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'venueType' ? 'bold' : 'normal'}
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    Type
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleSortClick('dateCreated')}
                                    color={sortBy === 'dateCreated' ? 'blue.400' : 'inherit'}
                                    fontWeight={sortBy === 'dateCreated' ? 'bold' : 'normal'}
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    Created
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
                            onClick={handleCreateVenue}
                            _hover={{ bg: 'orange.400' }}
                        >
                            Add Venue
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
                    {!isLoading && (
                        sortedVenues.length > 0 ? (
                            <VStack spacing={4} align="stretch">
                                {sortedVenues.map(venue => (
                                    <div key={venue.venueID} ref={el => { showCardRefs.current[venue.venueID] = el; }}>
                                        <VenueCard
                                            venue={venue}
                                            onEdit={handleEdit}
                                            onVenueClick={onVenueClick}
                                            showCount={0}
                                            isHovered={hoveredCardId === venue.venueID}
                                            isSelected={selectedVenueId === venue.venueID}
                                            onHover={setHoveredCardId}
                                            onSaveNavigationState={onSaveNavigationState}
                                        />
                                    </div>
                                ))}
                            </VStack>
                        ) : (
                            <Flex direction="column" align="center" justify="center" height="200px" gap="4">
                                <AppIcon name="venue" boxSize="40px" color="gray.400" />
                                <Text color="gray.500" textAlign="center">
                                    You haven't added any venues yet.
                                </Text>
                                <Button
                                    bg="blue.400"
                                    color="white"
                                    size="sm"
                                    onClick={handleCreateVenue}
                                    _hover={{ bg: 'orange.400' }}
                                >
                                    Add Your First Venue
                                </Button>
                            </Flex>
                        )
                    )}
                </Box>
            </Flex>

        </>
    );
};