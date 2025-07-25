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
import { BaseCard, BaseCardAction } from '../base/BaseCard';
import { formatDateTimeLocal } from '../../utils/dateTimeUtils';

// TypeScript interfaces
interface CrewMember {
    userID: string;
    fullnameFirst?: string;
    fullnameLast?: string;
    emailAddress?: string;
    phoneNumber?: string;
    userRole?: string;
    userStatus?: string;
    isActive?: boolean;
    profileImgURL?: string;
    notes?: string; // User table notes
    relationshipNotes?: string; // Relationship table notes
    clerk_user_id?: string; // To identify if this is the current user
    dateCreated: string;
    dateUpdated: string;
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

        onEdit(crewMember.userID);
    };

    const formatRole = (role?: string): string => {
        if (!role) return 'Crew';
        return role.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const getFullName = (): string => {
        const firstName = crewMember.fullnameFirst || '';
        const lastName = crewMember.fullnameLast || '';
        return `${firstName} ${lastName}`.trim() || 'Unknown User';
    };

    const getUserStatusBadge = () => {
        const isVerified = crewMember.userStatus === 'verified';
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
        return crewMember.relationshipNotes; // Relationship table notes
    };

    const headerBadges = (
        <Avatar
            size="sm"
            name={getFullName()}
            src={crewMember.profileImgURL}
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
        <VStack align="stretch" spacing="1" fontSize="sm" color="detail.text">
            <HStack spacing="2" align="center">
                <Badge variant="outline" colorScheme="blue" size="sm">
                    {formatRole(crewMember.userRole)}
                </Badge>
                {getUserStatusBadge()}
                {!crewMember.isActive && (
                    <Badge variant="solid" colorScheme="red" size="sm">
                        Inactive
                    </Badge>
                )}
            </HStack>

            {/* Handle different combinations of email and phone with dates */}
            {crewMember.emailAddress && crewMember.phoneNumber ? (
                // Both email and phone present
                <>
                    <HStack justify="space-between">
                        <Text isTruncated>
                            {crewMember.emailAddress}
                        </Text>
                        <Text fontSize="xs">
                            Created: {formatDateTimeLocal(crewMember.dateCreated)}
                        </Text>
                    </HStack>
                    <HStack justify="space-between">
                        <Text isTruncated>
                            {crewMember.phoneNumber}
                        </Text>
                        <Text fontSize="xs">
                            Updated: {formatDateTimeLocal(crewMember.dateUpdated)}
                        </Text>
                    </HStack>
                </>
            ) : crewMember.emailAddress ? (
                // Only email present - need another line for both dates
                <>
                    <HStack justify="space-between">
                        <Text isTruncated>
                            {crewMember.emailAddress}
                        </Text>
                        <Text fontSize="xs">
                            Created: {formatDateTimeLocal(crewMember.dateCreated)}
                        </Text>
                    </HStack>
                    <HStack justify="flex-end">
                        <Text fontSize="xs">
                            Updated: {formatDateTimeLocal(crewMember.dateUpdated)}
                        </Text>
                    </HStack>
                </>
            ) : crewMember.phoneNumber ? (
                // Only phone present - need another line for both dates
                <>
                    <HStack justify="space-between">
                        <Text isTruncated>
                            {crewMember.phoneNumber}
                        </Text>
                        <Text fontSize="xs">
                            Created: {formatDateTimeLocal(crewMember.dateCreated)}
                        </Text>
                    </HStack>
                    <HStack justify="flex-end">
                        <Text fontSize="xs">
                            Updated: {formatDateTimeLocal(crewMember.dateUpdated)}
                        </Text>
                    </HStack>
                </>
            ) : (
                // Neither email nor phone - dates align with badges row and a spacer
                <>
                    <HStack justify="flex-end">
                        <Text fontSize="xs">
                            Created: {formatDateTimeLocal(crewMember.dateCreated)}
                        </Text>
                    </HStack>
                    <HStack justify="flex-end">
                        <Text fontSize="xs">
                            Updated: {formatDateTimeLocal(crewMember.dateUpdated)}
                        </Text>
                    </HStack>
                </>
            )}
        </VStack>
    );

    const expandedContent = getNotesToShow() ? (
        <Box>
            <Text fontWeight="semibold" mb={2}>Notes</Text>
            <Text fontSize="sm" color="detail.text">
                {getNotesToShow()}
            </Text>
        </Box>
    ) : undefined;

    return (
        <BaseCard
            title={getFullName()}
            cardId={crewMember.userID}
            isSelected={isSelected}
            isHovered={isHovered}
            onCardClick={() => onCrewClick(crewMember.userID)}
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