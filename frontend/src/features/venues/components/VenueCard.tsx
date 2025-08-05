// frontend/src/features/venues/components/VenueCard.tsx

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
    venue_id: string;
    venue_name: string;
    venue_type?: string;
    capacity?: number;
    address?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    stage_width?: number;
    stage_depth?: number;
    fly_height?: number;
    equipment?: string[];
    venue_notes?: string;
    rental_rate?: number;
    minimum_rental?: number;
    date_created: string;
    date_updated: string;
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

        onEdit(venue.venue_id);
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
        <VStack align="stretch" spacing="1" color="cardText" fontSize="sm">
            <HStack justify="space-between">
                {venue.venue_type && (
                    <Badge variant="outline" colorScheme="green">
                        {venue.venue_type}
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
                    Created: {formatDateTimeLocal(venue.date_created || venue.date_updated)}
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
                    Updated: {formatDateTimeLocal(venue.date_updated || venue.date_created)}
                </Text>
            </HStack>
        </VStack>
    );

    const expandedContent = (
        <>
            {/* Contact Information */}
            {(venue.contact_name || venue.contact_email || venue.contact_phone) && (
                <Box>
                    <Text fontWeight="semibold" mb={2}>Contact Information</Text>
                    <VStack align="stretch" spacing="1" fontSize="sm" color="cardText">
                        {venue.contact_name && <Text>Contact: {venue.contact_name}</Text>}
                        {venue.contact_email && <Text>Email: {venue.contact_email}</Text>}
                        {venue.contact_phone && <Text>Phone: {venue.contact_phone}</Text>}
                    </VStack>
                </Box>
            )}

            {/* Technical Specifications */}
            {(venue.stage_width || venue.stage_depth || venue.fly_height) && (
                <Box>
                    <Text fontWeight="semibold" mb={2}>Technical Specifications</Text>
                    <HStack spacing="4" fontSize="sm" color="cardText">
                        {venue.stage_width && <Text>Width: {venue.stage_width} ft</Text>}
                        {venue.stage_depth && <Text>Depth: {venue.stage_depth} ft</Text>}
                        {venue.fly_height && <Text>Fly Height: {venue.fly_height} ft</Text>}
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
            {(venue.rental_rate || venue.minimum_rental) && (
                <Box>
                    <Text fontWeight="semibold" mb={2}>Rental Information</Text>
                    <HStack spacing="4" fontSize="sm" color="cardText">
                        {venue.rental_rate && <Text>Daily Rate: ${venue.rental_rate}</Text>}
                        {venue.minimum_rental && <Text>Minimum: ${venue.minimum_rental}</Text>}
                    </HStack>
                </Box>
            )}

            {/* Notes */}
            {venue.venue_notes && (
                <Box>
                    <Text fontWeight="semibold" mb={2}>Notes</Text>
                    <Text fontSize="sm" color="cardText">
                        {venue.venue_notes}
                    </Text>
                </Box>
            )}
        </>
    );

    return (
        <BaseCard
            title={venue.venue_name}
            cardId={venue.venue_id}
            isSelected={isSelected}
            isHovered={isHovered}
            onCardClick={() => onVenueClick(venue.venue_id)}
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
