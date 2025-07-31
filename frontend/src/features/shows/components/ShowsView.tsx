// frontend/src/components/views/ShowsView.tsx

import React, { useState, useMemo } from 'react';
import { Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Spinner, Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/react";
import { AppIcon } from '../../../components/AppIcon';
import { ShowCard } from "./ShowCard";

// TypeScript interfaces
interface Venue {
    venueID: string;
    venueName: string;
}

interface Script {
    scriptID: string;
    scriptName: string;
    scriptStatus: string;
    showID: string;
    startTime: string;
    dateCreated: string;
    dateUpdated: string;
    lastUsed?: string;
}

interface Show {
    showID: string;
    showName: string;
    showDate?: string;
    dateCreated: string;
    dateUpdated: string;
    venue?: Venue;
    scripts: Script[];
}

interface ShowsViewProps {
    shows: Show[];
    isLoading: boolean;
    error: string | null;
    onCreateShow: () => void;
    selectedShowId: string | null;
    hoveredCardId: string | null;
    setHoveredCardId: (id: string | null) => void;
    handleShowClick: (showId: string) => void;
    showCardRefs: React.MutableRefObject<{ [key: string]: HTMLElement | null }>;
    selectedScriptId: string | null;
    handleScriptClick: (scriptId: string) => void;
    onCreateScript: (showId: string) => void;
    onSaveNavigationState: () => void;
    sortBy: SortBy;
    sortDirection: SortDirection;
    onSortChange: (sortBy: SortBy, sortDirection: SortDirection) => void;
}

type SortBy = 'showName' | 'showDate' | 'dateUpdated' | 'dateCreated';
type SortDirection = 'asc' | 'desc';

export const ShowsView: React.FC<ShowsViewProps> = ({
    shows,
    isLoading,
    error,
    onCreateShow,
    selectedShowId,
    hoveredCardId,
    setHoveredCardId,
    handleShowClick,
    showCardRefs,
    selectedScriptId,
    handleScriptClick,
    onCreateScript,
    onSaveNavigationState,
    sortBy,
    sortDirection,
    onSortChange,
}) => {
    // Shows-specific sorting logic
    const handleSortClick = (newSortBy: SortBy): void => {
        if (sortBy === newSortBy) {
            const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            onSortChange(newSortBy, newDirection);
        } else {
            const newDirection = newSortBy === 'dateUpdated' ? 'desc' : 'asc';
            onSortChange(newSortBy, newDirection);
        }
    };

    const sortedShows = useMemo((): Show[] => {
        if (!shows || shows.length === 0) return [];

        const showsToSort = [...shows];
        showsToSort.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'showName') {
                comparison = a.showName.localeCompare(b.showName);
            } else if (sortBy === 'showDate') {
                if (!a.showDate) return 1;
                if (!b.showDate) return -1;
                comparison = new Date(a.showDate).getTime() - new Date(b.showDate).getTime();
            } else if (sortBy === 'dateCreated') {
                comparison = new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
            } else {
                comparison = new Date(b.dateUpdated).getTime() - new Date(a.dateUpdated).getTime();
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
                        <MenuButton as={Button} size="xs" rightIcon={<AppIcon name={sortDirection} boxSize={4} />}>Sort</MenuButton>
                        <MenuList zIndex={9999}>
                            <MenuItem
                                onClick={() => handleSortClick('showName')}
                                color={sortBy === 'showName' ? 'blue.400' : 'inherit'}
                                fontWeight={sortBy === 'showName' ? 'bold' : 'normal'}
                                _hover={{ borderColor: 'orange.400' }}
                            >
                                Name
                            </MenuItem>
                            <MenuItem
                                onClick={() => handleSortClick('showDate')}
                                color={sortBy === 'showDate' ? 'blue.400' : 'inherit'}
                                fontWeight={sortBy === 'showDate' ? 'bold' : 'normal'}
                                _hover={{ borderColor: 'orange.400' }}
                            >
                                Show Date
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
                        onClick={onCreateShow}
                        _hover={{ bg: 'orange.400' }}
                    >
                        Create Show
                    </Button>
                </HStack>
            </Flex>

            {/* Content Section */}
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
                {/* Loading State */}
                {isLoading && (
                    <Flex justify="center" align="center" height="200px">
                        <Spinner />
                    </Flex>
                )}

                {/* Error State */}
                {error && (
                    <Text color="red.500" textAlign="center" p="4">
                        {error}
                    </Text>
                )}

                {/* Shows List or Empty State */}
                {!isLoading && !error && (
                    sortedShows.length > 0 ? (
                        <VStack spacing={4} align="stretch">
                            {sortedShows.map(show => (
                                <div key={show.showID} ref={el => { showCardRefs.current[show.showID] = el; }}>
                                    <ShowCard
                                        show={show}
                                        sortBy={sortBy}
                                        sortDirection={sortDirection}
                                        isSelected={selectedShowId === show.showID}
                                        isHovered={hoveredCardId === show.showID}
                                        onShowHover={setHoveredCardId}
                                        onShowClick={handleShowClick}
                                        selectedScriptId={selectedScriptId}
                                        onScriptClick={handleScriptClick}
                                        onCreateScriptClick={onCreateScript}
                                        onSaveNavigationState={onSaveNavigationState}
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
                                onClick={onCreateShow}
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