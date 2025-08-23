// frontend/src/features/crew/components/CrewCard.tsx

import React, { useEffect } from 'react';
import {
    HStack,
    VStack,
    Text,
    Badge,
    Box,
    Avatar,
    Spinner
} from "@chakra-ui/react";
import { useUser } from '@clerk/clerk-react';
import { BaseCard, BaseCardAction } from '../../../components/base/BaseCard';
import { formatDateTimeLocal } from '../../../utils/timeUtils';
import { formatRole } from '../../../constants/userRoles';
import { useCrew } from '../hooks/useCrew';

// TypeScript interfaces
interface CrewMember {
    user_id: string;
    fullname_first?: string;
    fullname_last?: string;
    email_address?: string;
    phone_number?: string;
    user_role?: string;
    user_status?: string;
    is_active?: boolean;
    profile_img_url?: string;
    notes?: string; // User table notes
    relationship_notes?: string; // Relationship table notes
    clerk_user_id?: string; // To identify if this is the current user
    date_created: string;
    date_updated: string;
}

interface CrewCardProps {
    crewMember: CrewMember;
    onEdit: (crewId: string) => void;
    onCrewClick: (crewId: string) => void;
    isHovered: boolean;
    isSelected: boolean;
    onHover?: (crewId: string | null) => void;
    onSaveNavigationState?: () => void;
    isLoading?: boolean;
}

const CrewCardComponent: React.FC<CrewCardProps> = ({
    crewMember,
    onEdit,
    onCrewClick,
    isHovered,
    isSelected,
    onHover,
    onSaveNavigationState,
    isLoading = false,
}) => {
    const { user: clerkUser } = useUser();
    const { crew: crewWithAssignments, isLoading: assignmentsLoading, fetchCrew, refetchCrew } = useCrew(crewMember.user_id, false);

    // Calculate assignment info
    const assignments = crewWithAssignments?.department_assignments || [];
    const currentAssignmentsCount = assignments.length;
    
    // Find relevant show assignments
    const showAssignments = React.useMemo(() => {
        if (assignments.length === 0) return { upcoming: null, recent: null };

        const now = new Date();
        
        // Find upcoming shows
        const upcomingShows = assignments
            .filter(assignment => {
                if (!assignment.show_date) return false;
                const showDate = new Date(assignment.show_date);
                return showDate > now;
            })
            .sort((a, b) => {
                const dateA = new Date(a.show_date!);
                const dateB = new Date(b.show_date!);
                return dateA.getTime() - dateB.getTime();
            });

        // Find past shows
        const pastShows = assignments
            .filter(assignment => {
                if (!assignment.show_date) return false;
                const showDate = new Date(assignment.show_date);
                return showDate <= now;
            })
            .sort((a, b) => {
                const dateA = new Date(a.show_date!);
                const dateB = new Date(b.show_date!);
                return dateB.getTime() - dateA.getTime(); // Most recent first
            });

        const upcoming = upcomingShows.length > 0 ? {
            show_name: upcomingShows[0].show_name,
            department_name: upcomingShows[0].department_name,
            role: upcomingShows[0].role || 'Crew',
            show_date: upcomingShows[0].show_date!
        } : null;

        const recent = pastShows.length > 0 ? {
            show_name: pastShows[0].show_name,
            department_name: pastShows[0].department_name,
            role: pastShows[0].role || 'Crew',
            show_date: pastShows[0].show_date!
        } : null;

        return { upcoming, recent };
    }, [assignments]);

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (onSaveNavigationState) {
            onSaveNavigationState();
        }

        onEdit(crewMember.user_id);
    };


    const getFullName = (): string => {
        const firstName = crewMember.fullname_first || '';
        const lastName = crewMember.fullname_last || '';
        return `${firstName} ${lastName}`.trim() || 'Unknown User';
    };

    const getUserStatusBadge = () => {
        const isVerified = crewMember.user_status === 'verified';
        return (
            <Badge
                variant={isVerified ? "solid" : "outline"}
                colorScheme={isVerified ? "green" : "orange"}
                size="sm"
            >
                {isVerified ? "Verified" : "Guest"}
            </Badge>
        );
    };

    const getNotesToShow = (): string | undefined => {
        // If this is the current user viewing their own card, always show user notes
        const isCurrentUser = clerkUser && crewMember.clerk_user_id === clerkUser.id;
        if (isCurrentUser) {
            return crewMember.notes; // User table notes
        }

        // For all other users (both verified and guest): show relationship notes
        return crewMember.relationship_notes; // Relationship table notes
    };

    const headerBadges = (
        <Avatar
            size="sm"
            name={getFullName()}
            src={crewMember.profile_img_url}
        />
    );

    const headerActions: BaseCardAction[] = [
        {
            label: "Edit",
            icon: "edit",
            onClick: handleEditClick,
            'aria-label': "Edit Crew Member"
        }
    ];

    const quickInfo = (
        <VStack align="stretch" spacing="1" fontSize="sm" color="cardText">
            <HStack spacing="2" align="center">
                <Badge variant="outline" colorScheme="blue" size="sm">
                    {formatRole(crewMember.user_role || '')}
                </Badge>
                {getUserStatusBadge()}
                {!crewMember.is_active && (
                    <Badge variant="solid" colorScheme="red" size="sm">
                        Inactive
                    </Badge>
                )}
            </HStack>

            {/* Handle different combinations of email and phone with dates */}
            {crewMember.email_address && crewMember.phone_number ? (
                // Both email and phone present
                <>
                    <HStack justify="space-between">
                        <Text isTruncated>
                            {crewMember.email_address}
                        </Text>
                        <Text fontSize="xs">
                            Created: {formatDateTimeLocal(crewMember.date_created)}
                        </Text>
                    </HStack>
                    <HStack justify="space-between">
                        <Text isTruncated>
                            {crewMember.phone_number}
                        </Text>
                        <Text fontSize="xs">
                            Updated: {formatDateTimeLocal(crewMember.date_updated)}
                        </Text>
                    </HStack>
                </>
            ) : crewMember.email_address ? (
                // Only email present - need another line for both dates
                <>
                    <HStack justify="space-between">
                        <Text isTruncated>
                            {crewMember.email_address}
                        </Text>
                        <Text fontSize="xs">
                            Created: {formatDateTimeLocal(crewMember.date_created)}
                        </Text>
                    </HStack>
                    <HStack justify="flex-end">
                        <Text fontSize="xs">
                            Updated: {formatDateTimeLocal(crewMember.date_updated)}
                        </Text>
                    </HStack>
                </>
            ) : crewMember.phone_number ? (
                // Only phone present - need another line for both dates
                <>
                    <HStack justify="space-between">
                        <Text isTruncated>
                            {crewMember.phone_number}
                        </Text>
                        <Text fontSize="xs">
                            Created: {formatDateTimeLocal(crewMember.date_created)}
                        </Text>
                    </HStack>
                    <HStack justify="flex-end">
                        <Text fontSize="xs">
                            Updated: {formatDateTimeLocal(crewMember.date_updated)}
                        </Text>
                    </HStack>
                </>
            ) : (
                // Neither email nor phone - dates align with badges row and a spacer
                <>
                    <HStack justify="flex-end">
                        <Text fontSize="xs">
                            Created: {formatDateTimeLocal(crewMember.date_created)}
                        </Text>
                    </HStack>
                    <HStack justify="flex-end">
                        <Text fontSize="xs">
                            Updated: {formatDateTimeLocal(crewMember.date_updated)}
                        </Text>
                    </HStack>
                </>
            )}
        </VStack>
    );

    const expandedContent = (
        <VStack align="stretch" spacing={4}>
            {/* Assignment Information */}
            <Box>
                <Text fontWeight="semibold" mb={2}>Show Assignments</Text>
                {assignmentsLoading ? (
                    <HStack spacing={2}>
                        <Spinner size="sm" />
                        <Text fontSize="sm" color="cardText">Loading assignments...</Text>
                    </HStack>
                ) : (
                    <VStack align="stretch" spacing={2} pl="20px">
                        <Text fontSize="sm" color="gray.700" _dark={{ color: "gray.200" }}>
                            Current Assignments: <Text as="span" fontWeight="medium" color="cardText">{currentAssignmentsCount}</Text>
                        </Text>
                        {(showAssignments.upcoming || showAssignments.recent) ? (
                            <VStack align="stretch" spacing={1}>
                                {showAssignments.upcoming && (
                                    <HStack spacing={2} align="center" wrap="wrap">
                                        <Text fontSize="sm" color="gray.700" _dark={{ color: "gray.200" }}>
                                            Upcoming Show: <Text as="span" fontWeight="medium" color="cardText">{showAssignments.upcoming.show_name}</Text> • <Text as="span" color="cardText">{formatDateTimeLocal(showAssignments.upcoming.show_date)}</Text>
                                        </Text>
                                        <Badge variant="outline" colorScheme="blue" size="sm">
                                            {showAssignments.upcoming.department_name.replace(/_/g, ' ')}
                                        </Badge>
                                        <Badge variant="outline" colorScheme="green" size="sm">
                                            {showAssignments.upcoming.role.replace(/_/g, ' ')}
                                        </Badge>
                                    </HStack>
                                )}
                                {showAssignments.recent && (
                                    <HStack spacing={2} align="center" wrap="wrap">
                                        <Text fontSize="sm" color="gray.700" _dark={{ color: "gray.200" }}>
                                            Recent Show: <Text as="span" fontWeight="medium" color="cardText">{showAssignments.recent.show_name}</Text> • <Text as="span" color="cardText">{formatDateTimeLocal(showAssignments.recent.show_date)}</Text>
                                        </Text>
                                        <Badge variant="outline" colorScheme="blue" size="sm">
                                            {showAssignments.recent.department_name.replace(/_/g, ' ')}
                                        </Badge>
                                        <Badge variant="outline" colorScheme="green" size="sm">
                                            {showAssignments.recent.role.replace(/_/g, ' ')}
                                        </Badge>
                                    </HStack>
                                )}
                            </VStack>
                        ) : currentAssignmentsCount > 0 ? (
                            <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }}>
                                No show dates available
                            </Text>
                        ) : (
                            <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }}>
                                No current assignments
                            </Text>
                        )}
                    </VStack>
                )}
            </Box>
            
            {/* Notes Section */}
            {getNotesToShow() && (
                <Box>
                    <Text fontWeight="semibold" mb={2}>Notes</Text>
                    <Text fontSize="sm" color="cardText" pl="20px">
                        {getNotesToShow()}
                    </Text>
                </Box>
            )}
        </VStack>
    );

    // Handle the edge case where card is already selected when component mounts
    useEffect(() => {
        if (isSelected && !crewWithAssignments && !assignmentsLoading) {
            fetchCrew();
        }
    }, []); // Only run on mount

    const handleCardExpand = () => {
        if (!assignmentsLoading) {
            if (!crewWithAssignments) {
                // First time opening - fetch data
                fetchCrew();
            } else {
                // Card already has data - refresh it to ensure it's current
                refetchCrew();
            }
        }
    };

    return (
        <BaseCard
            title={getFullName()}
            cardId={crewMember.user_id}
            isSelected={isSelected}
            isHovered={isHovered}
            onCardClick={() => onCrewClick(crewMember.user_id)}
            onHover={onHover}
            headerBadges={headerBadges}
            headerActions={headerActions}
            quickInfo={quickInfo}
            expandedContent={expandedContent}
            onExpand={handleCardExpand}
            isLoading={isLoading}
            skeletonVariant="crew"
        />
    );
};

export const CrewCard = React.memo(CrewCardComponent);
