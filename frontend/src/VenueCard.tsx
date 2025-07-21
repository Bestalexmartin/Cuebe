// frontend/src/VenueCard.tsx

import React from 'react';
import {
    Box,
    Flex,
    HStack,
    VStack,
    Text,
    Badge,
    Collapse,
    Button,
    Heading
} from "@chakra-ui/react";
import { AppIcon } from './components/AppIcon';

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
}

export const VenueCard: React.FC<VenueCardProps> = ({
    venue,
    onEdit,
    onVenueClick,
    showCount = 0,
    isHovered,
    isSelected,
    onHover,
    onSaveNavigationState
}) => {
    const borderColor = isHovered ? 'orange.400' : isSelected ? 'blue.400' : 'gray.600';

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

    return (
        <Box
            p="4"
            borderWidth="2px"
            borderRadius="md"
            shadow="sm"
            cursor="pointer"
            borderColor={borderColor}
            _hover={{ borderColor: 'orange.400' }}
            onMouseEnter={() => onHover?.(venue.venueID)}
            onMouseLeave={() => onHover?.(null)}
            onClick={() => onVenueClick(venue.venueID)}
        >
            {/* Header Row */}
            <Flex justify="space-between" align="center" mb={2}>
                <Flex align="center" gap="3">
                    <Heading size="sm">{venue.venueName}</Heading>
                    {showCount > 0 && (
                        <Badge colorScheme="blue" variant="subtle">
                            {showCount} show{showCount !== 1 ? 's' : ''}
                        </Badge>
                    )}
                </Flex>

                <HStack spacing="1" opacity={isSelected ? 1 : 0} pointerEvents={isSelected ? "auto" : "none"}>
                    <Button
                        aria-label="Edit venue"
                        leftIcon={<AppIcon name="edit" boxSize="12px" />}
                        size="xs"
                        onClick={handleEditClick}
                    >
                        Edit
                    </Button>
                </HStack>
            </Flex>

            {/* Quick Info Rows */}
            <VStack align="stretch" spacing="1" color="detail.text" fontSize="sm" ml={4}>
                <HStack spacing="4">
                    {venue.venueType && (
                        <Badge variant="outline" colorScheme="green">
                            {venue.venueType}
                        </Badge>
                    )}
                    {venue.capacity && (
                        <Text>
                            Capacity: {formatCapacity(venue.capacity)}
                        </Text>
                    )}
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
                        Updated: {new Date(venue.dateUpdated || venue.dateCreated).toLocaleDateString()}
                    </Text>
                </HStack>
            </VStack>

            {/* Expandable Details - only show when selected */}
            <Collapse in={isSelected} animateOpacity>
                <VStack align="stretch" spacing="3" mt="4" pt="3" borderTop="1px solid" borderColor="ui.border">

                    {/* Contact Information */}
                    {(venue.contactName || venue.contactEmail || venue.contactPhone) && (
                        <Box>
                            <Text fontWeight="semibold" mb={2}>Contact Information</Text>
                            <VStack align="stretch" spacing="1" fontSize="sm" color="detail.text" ml={4}>
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
                            <HStack spacing="4" fontSize="sm" color="detail.text" ml={4}>
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
                            <Flex wrap="wrap" gap="1" ml={4}>
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
                            <HStack spacing="4" fontSize="sm" color="detail.text" ml={4}>
                                {venue.rentalRate && <Text>Daily Rate: ${venue.rentalRate}</Text>}
                                {venue.minimumRental && <Text>Minimum: ${venue.minimumRental}</Text>}
                            </HStack>
                        </Box>
                    )}

                    {/* Notes */}
                    {venue.notes && (
                        <Box>
                            <Text fontWeight="semibold" mb={2}>Notes</Text>
                            <Text fontSize="sm" color="detail.text" ml={4}>
                                {venue.notes}
                            </Text>
                        </Box>
                    )}

                    {/* Created Date */}
                    <Flex justify="flex-end">
                        <Text fontSize="xs" color="detail.text">
                            Created: {new Date(venue.dateCreated || venue.dateUpdated).toLocaleDateString()}
                        </Text>
                    </Flex>
                </VStack>
            </Collapse>
        </Box>
    );
};