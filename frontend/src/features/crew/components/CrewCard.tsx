// frontend/src/features/crew/components/CrewCard.tsx

import React from 'react';
import {
    HStack,
    VStack,
    Text,
    Badge,
    Box,
    Avatar
} from "@chakra-ui/react";
import { useUser } from '@clerk/clerk-react';
import { BaseCard, BaseCardAction } from '../../../components/base/BaseCard';
import { formatDateTimeLocal } from '../../../utils/dateTimeUtils';

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

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (onSaveNavigationState) {
            onSaveNavigationState();
        }

        onEdit(crewMember.user_id);
    };

    const formatRole = (role?: string): string => {
        if (!role) return 'Crew';
        return role.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
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
                    {formatRole(crewMember.user_role)}
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

    const expandedContent = getNotesToShow() ? (
        <Box>
            <Text fontWeight="semibold" mb={2}>Notes</Text>
            <Text fontSize="sm" color="cardText">
                {getNotesToShow()}
            </Text>
        </Box>
    ) : undefined;

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
            isLoading={isLoading}
            skeletonVariant="crew"
        />
    );
};

export const CrewCard = React.memo(CrewCardComponent);
