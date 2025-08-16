// frontend/src/features/shows/components/ShowsView.tsx

import React, { useMemo } from 'react';
import { Flex, Box, VStack, HStack, Heading, Button, Divider, Text, Spinner } from "@chakra-ui/react";
import { AppIcon } from '../../../components/AppIcon';
import { ShowCard } from "./ShowCard";
import { SortMenu, SortOption } from '../../../components/shared/SortMenu';

// TypeScript interfaces
interface Venue {
    venue_id: string;
    venue_name: string;
}

interface Script {
    script_id: string;
    script_name: string;
    script_status: string;
    show_id: string;
    start_time: string;
    date_created: string;
    date_updated: string;
    lastUsed?: string;
    is_shared: boolean;
}

interface Show {
    show_id: string;
    show_name: string;
    show_date?: string;
    date_created: string;
    date_updated: string;
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

type SortBy = 'show_name' | 'show_date' | 'date_updated' | 'date_created';
type SortDirection = 'asc' | 'desc';

const SHOWS_SORT_OPTIONS: SortOption[] = [
    { value: 'show_name', label: 'Name' },
    { value: 'show_date', label: 'Show Date' },
    { value: 'date_created', label: 'Created' },
    { value: 'date_updated', label: 'Updated' },
];

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
            const newDirection = newSortBy === 'date_updated' ? 'desc' : 'asc';
            onSortChange(newSortBy, newDirection);
        }
    };

    const sortedShows = useMemo((): Show[] => {
        if (!shows || shows.length === 0) return [];

        const showsToSort = [...shows];
        showsToSort.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'show_name') {
                comparison = a.show_name.localeCompare(b.show_name);
            } else if (sortBy === 'show_date') {
                if (!a.show_date) return 1;
                if (!b.show_date) return -1;
                comparison = new Date(a.show_date).getTime() - new Date(b.show_date).getTime();
            } else if (sortBy === 'date_created') {
                comparison = new Date(b.date_created).getTime() - new Date(a.date_created).getTime();
            } else {
                comparison = new Date(b.date_updated).getTime() - new Date(a.date_updated).getTime();
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
                    <SortMenu
                        sortBy={sortBy}
                        sortDirection={sortDirection}
                        sortOptions={SHOWS_SORT_OPTIONS}
                        onSortClick={handleSortClick}
                    />
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
                                <div key={show.show_id} ref={el => { showCardRefs.current[show.show_id] = el; }}>
                                    <ShowCard
                                        show={show}
                                        sortBy={sortBy}
                                        sortDirection={sortDirection}
                                        isSelected={selectedShowId === show.show_id}
                                        isHovered={hoveredCardId === show.show_id}
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
