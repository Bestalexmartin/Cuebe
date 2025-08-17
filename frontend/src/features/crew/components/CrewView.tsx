// frontend/src/features/crew/components/CrewView.tsx

import React, { useMemo } from 'react';
import { Flex } from "@chakra-ui/react";
import { useNavigate } from 'react-router-dom';
import { CrewCard } from './CrewCard';
import { useCrews } from '../hooks/useCrews';
import { EntityViewHeader } from '../../../components/shared/EntityViewHeader';
import { EntityViewContainer } from '../../../components/shared/EntityViewContainer';
import { EntityEmptyState } from '../../../components/shared/EntityEmptyState';
import { SortOption } from '../../../components/shared/SortMenu';

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

const CREW_SORT_OPTIONS: SortOption[] = [
    { value: 'fullname_first', label: 'First Name' },
    { value: 'fullname_last', label: 'Last Name' },
    { value: 'user_role', label: 'Role' },
    { value: 'email_address', label: 'Email' },
    { value: 'date_created', label: 'Created' },
    { value: 'date_updated', label: 'Updated' },
];

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
    const handleSortClick = (newSortBy: string) => {
        const typedSortBy = newSortBy as typeof sortBy;
        if (sortBy === typedSortBy) {
            const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            onSortChange(typedSortBy, newDirection);
        } else {
            const newDirection = (typedSortBy === 'date_created' || typedSortBy === 'date_updated') ? 'desc' : 'asc';
            onSortChange(typedSortBy, newDirection);
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

    const emptyState = (
        <EntityEmptyState
            entityIcon="crew"
            message="You haven't added any crew yet."
            actionButtonText="Add Your First Crew"
            onActionClick={handleCreateCrew}
        />
    );

    return (
        <Flex direction="column" height="100%">
            <EntityViewHeader
                entityName="Crew"
                entityIcon="crew"
                sortBy={sortBy}
                sortDirection={sortDirection}
                sortOptions={CREW_SORT_OPTIONS}
                onSortClick={handleSortClick}
                createButtonText="Add Crew"
                onCreateClick={handleCreateCrew}
            />

            <EntityViewContainer
                isLoading={isLoading}
                error={error}
                hasItems={sortedCrews.length > 0}
                emptyStateComponent={emptyState}
            >
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
            </EntityViewContainer>
        </Flex>
    );
};
