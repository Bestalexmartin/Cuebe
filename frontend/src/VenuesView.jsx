// frontend/src/VenuesView.jsx

import { useState, useMemo } from 'react';
import { Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Spinner, Menu, MenuButton, MenuList, MenuItem, useDisclosure } from "@chakra-ui/react";
import { AppIcon } from './components/AppIcon';
import { useVenues } from './hooks/useVenues';
import { VenueCard } from './VenueCard';
import { CreateVenueModal } from './components/modals/CreateVenueModal';
import { useNavigate } from 'react-router-dom';

export const VenuesView = ({
    onCreateVenue,
    selectedVenueId,
    onVenueClick,
    hoveredCardId,
    setHoveredCardId,
    onSaveNavigationState // NEW: Add prop for saving navigation state
}) => {
    const navigate = useNavigate();
    const { venues, isLoading, refetchVenues } = useVenues();
    const { isOpen, onOpen, onClose } = useDisclosure();

    // Venue-specific sorting state  
    const [sortBy, setSortBy] = useState('venueName');
    const [sortDirection, setSortDirection] = useState('asc');

    // Venue-specific sorting logic
    const handleSortClick = (newSortBy) => {
        if (sortBy === newSortBy) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(newSortBy);
            setSortDirection(newSortBy === 'venueName' ? 'asc' : 'desc');
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
            } else {
                comparison = new Date(b.dateCreated || b.dateUpdated) - new Date(a.dateCreated || a.dateUpdated);
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        return venuesToSort;
    }, [venues, sortBy, sortDirection]);

    const handleEdit = (venueId) => {
        // Save navigation state before leaving dashboard
        if (onSaveNavigationState) {
            onSaveNavigationState();
        }

        navigate(`/venues/${venueId}/edit`);
    };

    // Use the modal handler from props if provided, otherwise use local modal
    const handleCreateVenue = onCreateVenue || onOpen;

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
                            <MenuButton as={Button} size="xs" rightIcon={<AppIcon name="openmenu" />}>
                                Sort by: {sortBy === 'venueName' ? 'Name' : sortBy === 'capacity' ? 'Capacity' : sortBy === 'venueType' ? 'Type' : 'Date Added'}
                            </MenuButton>
                            <MenuList>
                                <MenuItem onClick={() => handleSortClick('venueName')}>Name</MenuItem>
                                <MenuItem onClick={() => handleSortClick('capacity')}>Capacity</MenuItem>
                                <MenuItem onClick={() => handleSortClick('venueType')}>Type</MenuItem>
                                <MenuItem onClick={() => handleSortClick('dateCreated')}>Date Added</MenuItem>
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
                                    <VenueCard
                                        key={venue.venueID}
                                        venue={venue}
                                        onEdit={handleEdit}
                                        onVenueClick={onVenueClick}
                                        showCount={0}
                                        isHovered={hoveredCardId === venue.venueID}
                                        isSelected={selectedVenueId === venue.venueID}
                                        onHover={setHoveredCardId}
                                        onSaveNavigationState={onSaveNavigationState} // NEW: Pass down the save function
                                    />
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

            <CreateVenueModal
                isOpen={isOpen}
                onClose={onClose}
                onVenueCreated={refetchVenues}
            />
        </>
    );
};