// frontend/src/EditVenuePage.jsx

import { useEffect } from 'react';
import {
    Flex, Box, Heading, HStack, VStack, Button, Text, Spinner,
    FormControl, FormLabel, Input, Textarea, Select
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useVenue } from "./hooks/useVenue";
import { useFormManager } from './hooks/useFormManager';
import { AppIcon } from './components/AppIcon';

const INITIAL_FORM_STATE = {
    venueName: '',
    address: '',
    capacity: '',
    venueType: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    stageWidth: '',
    stageDepth: '',
    flyHeight: '',
    notes: '',
    rentalRate: '',
    minimumRental: ''
};

// Venue type options
const VENUE_TYPE_OPTIONS = [
    { value: 'Proscenium', label: 'Proscenium' },
    { value: 'Thrust', label: 'Thrust' },
    { value: 'Arena', label: 'Arena' },
    { value: 'Black Box', label: 'Black Box' },
    { value: 'Outdoor', label: 'Outdoor' },
    { value: 'Other', label: 'Other' },
];

export const EditVenuePage = () => {
    const { venueId } = useParams();
    const navigate = useNavigate();

    // Fetch the initial venue data
    const { venue, isLoading: isLoadingVenue, error: venueError } = useVenue(venueId);

    // Form management
    const {
        formData,
        isSubmitting,
        updateField,
        setFormData,
        submitForm,
    } = useFormManager(INITIAL_FORM_STATE);

    // Populate form when venue data loads
    useEffect(() => {
        if (venue) {
            setFormData({
                venueName: venue.venueName || '',
                address: venue.address || '',
                capacity: venue.capacity?.toString() || '',
                venueType: venue.venueType || '',
                contactName: venue.contactName || '',
                contactEmail: venue.contactEmail || '',
                contactPhone: venue.contactPhone || '',
                stageWidth: venue.stageWidth?.toString() || '',
                stageDepth: venue.stageDepth?.toString() || '',
                flyHeight: venue.flyHeight?.toString() || '',
                notes: venue.notes || '',
                rentalRate: venue.rentalRate?.toString() || '',
                minimumRental: venue.minimumRental?.toString() || ''
            });
        }
    }, [venue, setFormData]);

    // Handle form field changes
    const handleChange = (field, value) => {
        updateField(field, value);
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            // Prepare data for API - convert numeric fields
            const updateData = {
                venueName: formData.venueName,
                address: formData.address || null,
                capacity: formData.capacity ? parseInt(formData.capacity) : null,
                venueType: formData.venueType || null,
                contactName: formData.contactName || null,
                contactEmail: formData.contactEmail || null,
                contactPhone: formData.contactPhone || null,
                stageWidth: formData.stageWidth ? parseInt(formData.stageWidth) : null,
                stageDepth: formData.stageDepth ? parseInt(formData.stageDepth) : null,
                flyHeight: formData.flyHeight ? parseInt(formData.flyHeight) : null,
                notes: formData.notes || null,
                rentalRate: formData.rentalRate ? parseInt(formData.rentalRate) : null,
                minimumRental: formData.minimumRental ? parseInt(formData.minimumRental) : null,
            };

            await submitForm(
                `/api/venues/${venueId}`,
                'PATCH',
                `"${formData.venueName}" has been updated successfully`,
                updateData
            );

            // Navigate back to dashboard on success
            navigate('/dashboard', {
                state: {
                    view: 'venues',
                    selectedVenueId: venueId,
                    returnFromEdit: true
                }
            });

        } catch (error) {
        }
    };

    const handleClose = () => {
        navigate('/dashboard', {
            state: {
                view: 'venues',
                selectedVenueId: venueId,
                returnFromEdit: true
            }
        });
    };

    const isFormValid = () => {
        return formData.venueName.trim();
    };

    return (
        <Flex
            as="form"
            onSubmit={handleSubmit}
            width="100%"
            height="100%"
            p="2rem"
            flexDirection="column"
            boxSizing="border-box"
        >
            {/* Header Section */}
            <Flex justify="space-between" align="center" flexShrink={0}>
                <HStack spacing="2" align="center">
                    <AppIcon name="edit" boxSize="20px" />
                    <Heading as="h2" size="md">
                        {isLoadingVenue ? 'Loading...' : `${venue?.venueName}`}
                    </Heading>
                </HStack>
                <HStack spacing="2">
                    <Button
                        onClick={handleClose}
                        size="xs"
                        _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
                    >
                        Cancel
                    </Button>
                    <Button
                        bg="blue.400"
                        color="white"
                        size="xs"
                        _hover={{ bg: 'orange.400' }}
                        type="submit"
                        isLoading={isSubmitting}
                        isDisabled={!isFormValid()}
                    >
                        Save Changes
                    </Button>
                </HStack>
            </Flex>

            {/* Form Content Box */}
            <Box
                mt="4"
                border="1px solid"
                borderColor="container.border"
                p="4"
                borderRadius="md"
                flexGrow={1}
                overflowY="auto"
                className="hide-scrollbar"
            >
                {/* Loading State */}
                {isLoadingVenue && (
                    <Flex justify="center" align="center" height="200px">
                        <Spinner />
                    </Flex>
                )}

                {/* Error State */}
                {venueError && (
                    <Text color="red.500" textAlign="center" p="4">
                        {venueError}
                    </Text>
                )}

                {/* Form Content */}
                {!isLoadingVenue && venue && (
                    <VStack spacing={4} align="stretch" height="100%">
                        {/* Basic Information */}
                        <FormControl isRequired>
                            <FormLabel>Venue Name</FormLabel>
                            <Input
                                value={formData.venueName}
                                onChange={(e) => handleChange('venueName', e.target.value)}
                                placeholder="Enter venue name"
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel>Venue Type</FormLabel>
                            <Select
                                value={formData.venueType}
                                onChange={(e) => handleChange('venueType', e.target.value)}
                                placeholder="Select venue type"
                            >
                                {VENUE_TYPE_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl>
                            <FormLabel>Address</FormLabel>
                            <Textarea
                                value={formData.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                                placeholder="Enter venue address"
                                rows={3}
                            />
                        </FormControl>

                        {/* Capacity and Technical Specs - All on one row */}
                        <HStack spacing={4}>
                            <FormControl>
                                <FormLabel>Capacity</FormLabel>
                                <Input
                                    type="number"
                                    value={formData.capacity}
                                    onChange={(e) => handleChange('capacity', e.target.value)}
                                    placeholder="Number of seats"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Stage Width (ft)</FormLabel>
                                <Input
                                    type="number"
                                    value={formData.stageWidth}
                                    onChange={(e) => handleChange('stageWidth', e.target.value)}
                                    placeholder="Width in feet"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Stage Depth (ft)</FormLabel>
                                <Input
                                    type="number"
                                    value={formData.stageDepth}
                                    onChange={(e) => handleChange('stageDepth', e.target.value)}
                                    placeholder="Depth in feet"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Fly Height (ft)</FormLabel>
                                <Input
                                    type="number"
                                    value={formData.flyHeight}
                                    onChange={(e) => handleChange('flyHeight', e.target.value)}
                                    placeholder="Height in feet"
                                />
                            </FormControl>
                        </HStack>

                        {/* Contact Information */}
                        <FormControl>
                            <FormLabel>Contact Name</FormLabel>
                            <Input
                                value={formData.contactName}
                                onChange={(e) => handleChange('contactName', e.target.value)}
                                placeholder="Venue contact person"
                            />
                        </FormControl>

                        <HStack spacing={4}>
                            <FormControl>
                                <FormLabel>Contact Email</FormLabel>
                                <Input
                                    type="email"
                                    value={formData.contactEmail}
                                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                                    placeholder="contact@venue.com"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Contact Phone</FormLabel>
                                <Input
                                    type="tel"
                                    value={formData.contactPhone}
                                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                                    placeholder="(555) 123-4567"
                                />
                            </FormControl>
                        </HStack>

                        {/* Rental Information */}
                        <HStack spacing={4}>
                            <FormControl>
                                <FormLabel>Daily Rental Rate ($)</FormLabel>
                                <Input
                                    type="number"
                                    value={formData.rentalRate}
                                    onChange={(e) => handleChange('rentalRate', e.target.value)}
                                    placeholder="Daily rate in dollars"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Minimum Rental ($)</FormLabel>
                                <Input
                                    type="number"
                                    value={formData.minimumRental}
                                    onChange={(e) => handleChange('minimumRental', e.target.value)}
                                    placeholder="Minimum rental amount"
                                />
                            </FormControl>
                        </HStack>

                        {/* Expandable notes textarea */}
                        <FormControl display="flex" flexDirection="column" flexGrow={1}>
                            <FormLabel>Notes</FormLabel>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                placeholder="Additional venue information, equipment, special requirements, etc."
                                flexGrow={1}
                                resize="vertical"
                            />
                        </FormControl>
                    </VStack>
                )}
            </Box>
        </Flex>
    );
};