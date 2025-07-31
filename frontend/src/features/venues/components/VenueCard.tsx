// frontend/src/components/cards/VenueCard.tsx

import React from 'react';
import {
    HStack,
    VStack,
    Text,
    Badge,
    Box,
    Flex,
} from "@chakra-ui/react";
import { BaseCard, BaseCardAction } from '../../../components/base/BaseCard';
import { formatDateTimeLocal } from '../../../utils/dateTimeUtils';

// TypeScript interfaces
interface Venue {
    venueID: string;
    venueName: string;
    venueType?: string;
    capacity?: number;
    address?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    stageWidth?: number;
    stageDepth?: number;
    flyHeight?: number;
    equipment?: string[];
    notes?: string;
    rentalRate?: number;
    minimumRental?: number;
    dateCreated: string;
    dateUpdated: string;
}

interface VenueCardProps {
    venue: Venue;
    onEdit: (venueId: string) => void;
    onVenueClick: (venueId: string) => void;
    showCount?: number;
    isHovered: boolean;
    isSelected: boolean;
    onHover?: (venueId: string | null) => void;
    onSaveNavigationState?: () => void;
    isLoading?: boolean;
}

const VenueCardComponent: React.FC<VenueCardProps> = ({
    venue,
    onEdit,
    onVenueClick,
    showCount = 0,
    isHovered,
    isSelected,
    onHover,
    onSaveNavigationState,
    isLoading = false
}) => {
    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (onSaveNavigationState) {
            onSaveNavigationState();
        }

        onEdit(venue.venueID);
    };

    const formatCapacity = (capacity?: number): string => {
        if (!capacity) return 'Not specified';
        return capacity.toLocaleString();
    };

    const headerBadges = showCount > 0 ? (
        <Badge colorScheme="blue" variant="subtle">
            {showCount} show{showCount !== 1 ? 's' : ''}
        </Badge>
    ) : undefined;

    const headerActions: BaseCardAction[] = [
        {
            label: "Edit",
            icon: "edit",
            onClick: handleEditClick,
            'aria-label': "Edit venue"
        }
    ];

    const quickInfo = (
        <VStack align="stretch" spacing="1" color="detail.text" fontSize="sm">
            <HStack justify="space-between">
                {venue.venueType && (
                    <Badge variant="outline" colorScheme="green">
                        {venue.venueType}
                    </Badge>
                )}
            </HStack>
            <HStack justify="space-between">
                {venue.capacity ? (
                    <Text>
                        Capacity: {formatCapacity(venue.capacity)}
                    </Text>
                ) : (
                    <Box />
                )}
                <Text fontSize="xs">
                    Created: {formatDateTimeLocal(venue.dateCreated || venue.dateUpdated)}
                </Text>
            </HStack>
            <HStack justify="space-between">
                {venue.address ? (
                    <Text isTruncated>
                        {venue.address}
                    </Text>
                ) : (
                    <Box />
                )}
                <Text fontSize="xs">
                    Updated: {formatDateTimeLocal(venue.dateUpdated || venue.dateCreated)}
                </Text>
            </HStack>
        </VStack>
    );

    const expandedContent = (
        <>
            {/* Contact Information */}
            {(venue.contactName || venue.contactEmail || venue.contactPhone) && (
                <Box>
                    <Text fontWeight="semibold" mb={2}>Contact Information</Text>
                    <VStack align="stretch" spacing="1" fontSize="sm" color="detail.text">
                        {venue.contactName && <Text>Contact: {venue.contactName}</Text>}
                        {venue.contactEmail && <Text>Email: {venue.contactEmail}</Text>}
                        {venue.contactPhone && <Text>Phone: {venue.contactPhone}</Text>}
                    </VStack>
                </Box>
            )}

            {/* Technical Specifications */}
            {(venue.stageWidth || venue.stageDepth || venue.flyHeight) && (
                <Box>
                    <Text fontWeight="semibold" mb={2}>Technical Specifications</Text>
                    <HStack spacing="4" fontSize="sm" color="detail.text">
                        {venue.stageWidth && <Text>Width: {venue.stageWidth} ft</Text>}
                        {venue.stageDepth && <Text>Depth: {venue.stageDepth} ft</Text>}
                        {venue.flyHeight && <Text>Fly Height: {venue.flyHeight} ft</Text>}
                    </HStack>
                </Box>
            )}

            {/* Equipment & Features */}
            {venue.equipment && venue.equipment.length > 0 && (
                <Box>
                    <Text fontWeight="semibold" mb={2}>Available Equipment</Text>
                    <Flex wrap="wrap" gap="1">
                        {venue.equipment.map((item, index) => (
                            <Badge key={index} variant="subtle" colorScheme="purple">
                                {item}
                            </Badge>
                        ))}
                    </Flex>
                </Box>
            )}

            {/* Rental Information */}
            {(venue.rentalRate || venue.minimumRental) && (
                <Box>
                    <Text fontWeight="semibold" mb={2}>Rental Information</Text>
                    <HStack spacing="4" fontSize="sm" color="detail.text">
                        {venue.rentalRate && <Text>Daily Rate: ${venue.rentalRate}</Text>}
                        {venue.minimumRental && <Text>Minimum: ${venue.minimumRental}</Text>}
                    </HStack>
                </Box>
            )}

            {/* Notes */}
            {venue.venueNotes && (
                <Box>
                    <Text fontWeight="semibold" mb={2}>Notes</Text>
                    <Text fontSize="sm" color="detail.text">
                        {venue.venueNotes}
                    </Text>
                </Box>
            )}
        </>
    );

    return (
        <BaseCard
            title={venue.venueName}
            cardId={venue.venueID}
            isSelected={isSelected}
            isHovered={isHovered}
            onCardClick={() => onVenueClick(venue.venueID)}
            onHover={onHover}
            headerBadges={headerBadges}
            headerActions={headerActions}
            quickInfo={quickInfo}
            expandedContent={expandedContent}
            isLoading={isLoading}
            skeletonVariant="venue"
        />
    );
};

export const VenueCard = React.memo(VenueCardComponent);