// frontend/src/features/venues/components/VenuesView.tsx

import React, { useMemo } from 'react';
import { Flex } from "@chakra-ui/react";
import { useVenues } from '../hooks/useVenues';
import { VenueCard } from './VenueCard';
import { useNavigate } from 'react-router-dom';
import { EntityViewHeader } from '../../../components/shared/EntityViewHeader';
import { EntityViewContainer } from '../../../components/shared/EntityViewContainer';
import { EntityEmptyState } from '../../../components/shared/EntityEmptyState';
import { SortOption } from '../../../components/shared/SortMenu';

// TypeScript interfaces
interface VenuesViewProps {
    onCreateVenue: () => void;
    selectedVenueId?: string | null;
    onVenueClick: (venueId: string) => void;
    hoveredCardId?: string | null;
    setHoveredCardId: (id: string | null) => void;
    onSaveNavigationState?: () => void;
    sortBy: 'venue_name' | 'capacity' | 'venue_type' | 'date_created' | 'date_updated';
    sortDirection: 'asc' | 'desc';
    onSortChange: (sortBy: 'venue_name' | 'capacity' | 'venue_type' | 'date_created' | 'date_updated', sortDirection: 'asc' | 'desc') => void;
    showCardRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
}

const VENUES_SORT_OPTIONS: SortOption[] = [
    { value: 'venue_name', label: 'Name' },
    { value: 'capacity', label: 'Capacity' },
    { value: 'venue_type', label: 'Type' },
    { value: 'date_created', label: 'Created' },
    { value: 'date_updated', label: 'Updated' },
];

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
    const { venues, isLoading, error } = useVenues();

    // Venue-specific sorting logic
    const handleSortClick = (newSortBy: string) => {
        const typedSortBy = newSortBy as typeof sortBy;
        if (sortBy === typedSortBy) {
            const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            onSortChange(typedSortBy, newDirection);
        } else {
            const newDirection = typedSortBy === 'venue_name' ? 'asc' : 'desc';
            onSortChange(typedSortBy, newDirection);
        }
    };

    const sortedVenues = useMemo(() => {
        if (!venues || venues.length === 0) return [];

        const venuesToSort = [...venues];
        venuesToSort.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'venue_name') {
                comparison = a.venue_name.localeCompare(b.venue_name);
            } else if (sortBy === 'capacity') {
                const aCapacity = a.capacity || 0;
                const bCapacity = b.capacity || 0;
                comparison = aCapacity - bCapacity;
            } else if (sortBy === 'venue_type') {
                const aType = a.venue_type || 'ZZZ';
                const bType = b.venue_type || 'ZZZ';
                comparison = aType.localeCompare(bType);
            } else if (sortBy === 'date_created') {
                comparison = new Date(b.date_created || b.date_updated).getTime() - new Date(a.date_created || a.date_updated).getTime();
            } else {
                comparison = new Date(b.date_updated || b.date_created).getTime() - new Date(a.date_updated || a.date_created).getTime();
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

    const emptyState = (
        <EntityEmptyState
            entityIcon="venue"
            message="You haven't added any venues yet."
            actionButtonText="Add Your First Venue"
            onActionClick={handleCreateVenue}
        />
    );

    return (
        <Flex direction="column" height="100%">
            <EntityViewHeader
                entityName="Venues"
                entityIcon="venue"
                sortBy={sortBy}
                sortDirection={sortDirection}
                sortOptions={VENUES_SORT_OPTIONS}
                onSortClick={handleSortClick}
                createButtonText="Add Venue"
                onCreateClick={handleCreateVenue}
            />

            <EntityViewContainer
                isLoading={isLoading}
                error={error}
                hasItems={sortedVenues.length > 0}
                emptyStateComponent={emptyState}
            >
                {sortedVenues.map(venue => (
                    <div key={venue.venue_id} ref={el => { showCardRefs.current[venue.venue_id] = el; }}>
                        <VenueCard
                            venue={venue}
                            onEdit={handleEdit}
                            onVenueClick={onVenueClick}
                            showCount={0}
                            isHovered={hoveredCardId === venue.venue_id}
                            isSelected={selectedVenueId === venue.venue_id}
                            onHover={setHoveredCardId}
                            onSaveNavigationState={onSaveNavigationState}
                        />
                    </div>
                ))}
            </EntityViewContainer>
        </Flex>
    );
};
