// frontend/src/features/shows/components/ShowsView.tsx

import React, { useMemo } from 'react';
import { Flex, VStack, HStack, Text, Button, Image, Heading } from "@chakra-ui/react";
import { ShowCard } from "./ShowCard";
import { EntityViewHeader } from '../../../components/shared/EntityViewHeader';
import { EntityViewContainer } from '../../../components/shared/EntityViewContainer';
import { AppIcon } from '../../../components/AppIcon';
import { SortOption } from '../../../components/shared/SortMenu';

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
    onImportScript: (showId: string) => void;
    onClearDepartmentMappingClick?: (showId: string) => void;
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
    onImportScript,
    onClearDepartmentMappingClick,
    onSaveNavigationState,
    sortBy,
    sortDirection,
    onSortChange,
}) => {
    // Shows-specific sorting logic
    const handleSortClick = (newSortBy: string): void => {
        const typedSortBy = newSortBy as SortBy;
        if (sortBy === typedSortBy) {
            const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            onSortChange(typedSortBy, newDirection);
        } else {
            const newDirection = typedSortBy === 'date_updated' ? 'desc' : 'asc';
            onSortChange(typedSortBy, newDirection);
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

    // Using semantic token for consistent theming

    const emptyState = (
        <VStack spacing={4} align="center" justify="center" py={16} px={8} textAlign="center">
            {/* Large Cuebe Logo and Branding */}
            <Flex align="center" justify="center" ml={-7}>
                <Image boxSize="144px" src="/cuebe.svg" alt="Cuebe Logo" />
                <Heading as="h1" fontSize="8xl" ml={-2}>
                    <Text as="span" color="orange.400">
                        Cue
                    </Text>
                    <Text as="span" color="blue.400">
                        be
                    </Text>
                </Heading>
            </Flex>

            {/* Three Value Points */}
            <VStack spacing={4} maxW="700px">
                <Text fontSize="xl" fontWeight="medium" color="detail.text">
                    • Dynamic script creation and crew management
                </Text>

                <Text fontSize="xl" fontWeight="medium" color="detail.text">
                    • Seamless collaboration across departments and venues
                </Text>

                <Text fontSize="xl" fontWeight="medium" color="detail.text">
                    • Tuned for mobile devices and live production environments
                </Text>
            </VStack>

            {/* Dual Call to Action */}
            <HStack spacing={8} pt={24}>
                <Button
                    variant="outline"
                    colorScheme="blue"
                    size="md"
                    leftIcon={<AppIcon name="docs" boxSize="16px" />}
                    _hover={{ borderColor: 'orange.400' }}
                >
                    View the Tutorials
                </Button>
                <Button
                    bg="blue.400"
                    color="white"
                    size="md"
                    leftIcon={<AppIcon name="show" boxSize="16px" />}
                    onClick={onCreateShow}
                    _hover={{ bg: 'orange.400' }}
                >
                    Create Your First Show
                </Button>
            </HStack>
        </VStack>
    );

    return (
        <Flex direction="column" height="100%">
            <EntityViewHeader
                entityName="Shows"
                entityIcon="show"
                sortBy={sortBy}
                sortDirection={sortDirection}
                sortOptions={SHOWS_SORT_OPTIONS}
                onSortClick={handleSortClick}
                createButtonText="Create Show"
                onCreateClick={onCreateShow}
            />

            <EntityViewContainer
                isLoading={isLoading}
                error={error}
                hasItems={sortedShows.length > 0}
                emptyStateComponent={emptyState}
            >
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
                            onImportScriptClick={onImportScript}
                            onClearDepartmentMappingClick={onClearDepartmentMappingClick}
                            onSaveNavigationState={onSaveNavigationState}
                        />
                    </div>
                ))}
            </EntityViewContainer>
        </Flex>
    );
};
