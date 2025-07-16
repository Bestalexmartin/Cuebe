// frontend/src/ShowsView.jsx

import { useState, useMemo } from 'react';
import { Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Spinner, Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/react";
import { AppIcon } from './components/AppIcon';
import { ShowCard } from "./ShowCard";

export const ShowsView = ({
    shows,
    isLoading,
    error,
    onShowModalOpen,
    selectedShowId,
    hoveredShowId,
    setHoveredShowId,
    handleShowClick,
    showCardRefs,
    selectedScriptId,
    handleScriptClick,
    handleOpenCreateScriptModal,
}) => {
    // Shows-specific sorting state
    const [sortBy, setSortBy] = useState('dateUpdated');
    const [sortDirection, setSortDirection] = useState('desc');

    // Shows-specific sorting logic
    const handleSortClick = (newSortBy) => {
        if (sortBy === newSortBy) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(newSortBy);
            setSortDirection(newSortBy === 'dateUpdated' ? 'desc' : 'asc');
        }
    };

    const sortedShows = useMemo(() => {
        if (!shows || shows.length === 0) return [];

        const showsToSort = [...shows];
        showsToSort.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'showName') {
                comparison = a.showName.localeCompare(b.showName);
            } else if (sortBy === 'showDate') {
                if (!a.showDate) return 1;
                if (!b.showDate) return -1;
                comparison = new Date(a.showDate) - new Date(b.showDate);
            } else { // 'dateUpdated'
                comparison = new Date(b.dateUpdated) - new Date(a.dateUpdated);
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        return showsToSort;
    }, [shows, sortBy, sortDirection]);

    return (
        <Flex direction="column" height="100%">
            {/* Header Section */}
            <Flex justify="space-between" align="center" flexShrink={0}>
                <HStack spacing="2" align="center">
                    <AppIcon name="show" boxSize="25px" />
                    <Heading as="h2" size="md">Shows</Heading>
                </HStack>
                <HStack spacing="2">
                    <Menu>
                        <MenuButton as={Button} size="xs" rightIcon={<AppIcon name="openmenu" />}>
                            Sort by: {sortBy === 'showDate' ? 'Show Date' : sortBy === 'showName' ? 'Name' : 'Updated'}
                        </MenuButton>
                        <MenuList>
                            <MenuItem onClick={() => handleSortClick('showName')}>Name</MenuItem>
                            <MenuItem onClick={() => handleSortClick('showDate')}>Show Date</MenuItem>
                            <MenuItem onClick={() => handleSortClick('dateUpdated')}>Updated</MenuItem>
                        </MenuList>
                    </Menu>
                    <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />
                    <Button bg="blue.400" color="white" size="xs" onClick={onShowModalOpen} _hover={{ bg: 'orange.400' }}>
                        Create Show
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
                    sortedShows.length > 0 ? (
                        <VStack spacing={4} align="stretch">
                            {sortedShows.map(show => (
                                <div key={show.showID} ref={el => showCardRefs.current[show.showID] = el}>
                                    <ShowCard
                                        key={show.showID}
                                        show={show}
                                        sortBy={sortBy}
                                        sortDirection={sortDirection}
                                        isSelected={selectedShowId === show.showID}
                                        isHovered={hoveredShowId === show.showID}
                                        onShowHover={setHoveredShowId}
                                        onShowClick={handleShowClick}
                                        selectedScriptId={selectedScriptId}
                                        onScriptClick={handleScriptClick}
                                        onCreateScriptClick={handleOpenCreateScriptModal}
                                    />
                                </div>
                            ))}
                        </VStack>
                    ) : (
                        <Flex direction="column" align="center" justify="center" height="200px" gap="4">
                            <AppIcon name="show" boxSize="40px" color="gray.400" />
                            <Text color="gray.500" textAlign="center">
                                You haven't added any shows yet.
                            </Text>
                            <Button
                                bg="blue.400"
                                color="white"
                                size="sm"
                                onClick={onShowModalOpen}
                                _hover={{ bg: 'orange.400' }}
                            >
                                Create Your First Show
                            </Button>
                        </Flex>
                    )
                )}
            </Box>
        </Flex>
    );
};