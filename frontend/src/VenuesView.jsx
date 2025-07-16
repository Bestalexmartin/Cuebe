// frontend/src/VenuesView.jsx

import { Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Spinner, Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/react";
import { AppIcon } from './components/AppIcon';
import { useVenues } from './useVenues';

export const VenuesView = ({
    sortBy,
    sortDirection,
    handleSortClick,
    onVenueModalOpen
}) => {
    const { venues, isLoading } = useVenues();

    return (
        <Flex direction="column" height="100%">
            {/* Header Section */}
            <Flex justify="space-between" align="center" flexShrink={0}>
                <HStack spacing="2" align="center">
                    <AppIcon name="venue" boxSize="25px" />
                    <Heading as="h2" size="md">Venues</Heading>
                </HStack>
                <HStack spacing="2">
                    <Menu>
                        <MenuButton as={Button} size="xs" rightIcon={<AppIcon name="openmenu" />}>
                            Sort by: {sortBy === 'venueName' ? 'Name' : 'Date Added'}
                        </MenuButton>
                        <MenuList>
                            <MenuItem onClick={() => handleSortClick('venueName')}>Name</MenuItem>
                            <MenuItem onClick={() => handleSortClick('dateAdded')}>Date Added</MenuItem>
                        </MenuList>
                    </Menu>
                    <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />
                    <Button
                        bg="blue.400"
                        color="white"
                        size="xs"
                        onClick={onVenueModalOpen}
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
                    venues.length > 0 ? (
                        <VStack spacing={4} align="stretch">
                            {venues.map(venue => (
                                <Box
                                    key={venue.venueID}
                                    p="4"
                                    borderWidth="2px"
                                    borderRadius="md"
                                    shadow="sm"
                                    borderColor="gray.600"
                                    _hover={{ borderColor: 'orange.400' }}
                                >
                                    <Text fontWeight="medium">{venue.venueName}</Text>
                                </Box>
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
                                onClick={onVenueModalOpen}
                                _hover={{ bg: 'orange.400' }}
                            >
                                Add Your First Venue
                            </Button>
                        </Flex>
                    )
                )}
            </Box>
        </Flex>
    );
};