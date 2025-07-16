// frontend/src/VenueCard.jsx

import React from 'react';
import {
    Box,
    Flex,
    HStack,
    VStack,
    Text,
    Badge,
    Collapse,
    useDisclosure,
    Button,
    Heading
} from "@chakra-ui/react";
import { EditIcon } from '@chakra-ui/icons';

export const VenueCard = ({
    venue,
    onEdit,
    onVenueClick,
    showCount = 0,
    isHovered,
    isSelected,
    onHover
}) => {
    const { isOpen: isExpanded, onToggle } = useDisclosure();

    const borderColor = isHovered ? 'orange.400' : isSelected ? 'blue.400' : 'gray.600';

    const handleEditClick = (e) => {
        e.stopPropagation();
        onEdit(venue.venueID);
    };

    const formatCapacity = (capacity) => {
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
            <Flex justify="space-between" align="center" mb="2">
                <Flex align="center" gap="3">
                    <Heading size="sm">{venue.venueName}</Heading>
                    {showCount > 0 && (
                        <Badge colorScheme="blue" variant="subtle">
                            {showCount} show{showCount !== 1 ? 's' : ''}
                        </Badge>
                    )}
                </Flex>

                {isSelected && (
                    <HStack spacing="1">
                        <Button
                            aria-label="Edit venue"
                            leftIcon={<EditIcon />}
                            size="xs"
                            onClick={handleEditClick}
                        >
                            Edit
                        </Button>
                    </HStack>
                )}
            </Flex>

            {/* Quick Info Row */}
            <HStack spacing="4" color="gray.500" fontSize="sm">
                {venue.address && (
                    <Text isTruncated maxWidth="200px">
                        📍 {venue.address}
                    </Text>
                )}
                {venue.capacity && (
                    <Text>
                        👥 {formatCapacity(venue.capacity)}
                    </Text>
                )}
                {venue.venueType && (
                    <Badge variant="outline" colorScheme="green">
                        {venue.venueType}
                    </Badge>
                )}
            </HStack>

            {/* Expandable Details - only show when selected */}
            <Collapse in={isSelected} animateOpacity>
                <VStack spacing={2} align="stretch">

                    {/* Contact Information */}
                    {(venue.contactName || venue.contactEmail || venue.contactPhone) && (
                        <Box>
                            <Text fontWeight="semibold" mb="1">Contact Information</Text>
                            <VStack align="stretch" spacing="1" fontSize="sm" color="gray.600">
                                {venue.contactName && <Text>👤 {venue.contactName}</Text>}
                                {venue.contactEmail && <Text>📧 {venue.contactEmail}</Text>}
                                {venue.contactPhone && <Text>📞 {venue.contactPhone}</Text>}
                            </VStack>
                        </Box>
                    )}

                    {/* Technical Specifications */}
                    {(venue.stageWidth || venue.stageDepth || venue.flyHeight) && (
                        <Box>
                            <Text fontWeight="semibold" mb="1">Technical Specifications</Text>
                            <HStack spacing="4" fontSize="sm" color="gray.600">
                                {venue.stageWidth && <Text>Width: {venue.stageWidth}'</Text>}
                                {venue.stageDepth && <Text>Depth: {venue.stageDepth}'</Text>}
                                {venue.flyHeight && <Text>Fly: {venue.flyHeight}'</Text>}
                            </HStack>
                        </Box>
                    )}

                    {/* Equipment & Features */}
                    {venue.equipment && venue.equipment.length > 0 && (
                        <Box>
                            <Text fontWeight="semibold" mb="1">Available Equipment</Text>
                            <Flex wrap="wrap" gap="1">
                                {venue.equipment.map((item, index) => (
                                    <Badge key={index} variant="subtle" colorScheme="purple">
                                        {item}
                                    </Badge>
                                ))}
                            </Flex>
                        </Box>
                    )}

                    {/* Notes */}
                    {venue.notes && (
                        <Box>
                            <Text fontWeight="semibold" mb="1">Notes</Text>
                            <Text fontSize="sm" color="gray.600">
                                {venue.notes}
                            </Text>
                        </Box>
                    )}

                    {/* Rental Information */}
                    {(venue.rentalRate || venue.minimumRental) && (
                        <Box>
                            <Text fontWeight="semibold" mb="1">Rental Information</Text>
                            <HStack spacing="4" fontSize="sm" color="gray.600">
                                {venue.rentalRate && <Text>Rate: ${venue.rentalRate}/day</Text>}
                                {venue.minimumRental && <Text>Minimum: ${venue.minimumRental}</Text>}
                            </HStack>
                        </Box>
                    )}

                    {/* Last Updated */}
                    <Box>
                        <Text fontSize="xs" color="gray.400">
                            Last updated: {new Date(venue.dateUpdated || venue.dateCreated).toLocaleDateString()}
                        </Text>
                    </Box>
                </VStack>
            </Collapse>
        </Box>
    );
};