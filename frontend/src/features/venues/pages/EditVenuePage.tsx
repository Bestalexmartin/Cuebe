// frontend/src/features/venues/pages/EditVenuePage.tsx

import React, { useEffect, useState } from 'react';
import {
    Box, VStack, HStack, Text, Spinner, Flex,
    FormControl, FormLabel, Input, Textarea, Select
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from '@clerk/clerk-react';
import { useVenue } from "../hooks/useVenue";
import { useValidatedForm } from '../../../hooks/useValidatedForm';
import { ValidationRules, FormValidationConfig } from '../../../types/validation';
import { BaseEditPage } from '../../../components/base/BaseEditPage';
import { ActionItem } from '../../../components/ActionsMenu';
import { DeleteConfirmationModal } from '../../../components/modals/DeleteConfirmationModal';
import { useEnhancedToast } from '../../../utils/toastUtils';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { useChangeDetection } from '../../../hooks/useChangeDetection';

// TypeScript interfaces
interface VenueFormData {
    venueName: string;
    address: string;
    city: string;
    state: string;
    capacity: string;
    venueType: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    stageWidth: string;
    stageDepth: string;
    flyHeight: string;
    venueNotes: string;
    rentalRate: string;
    minimumRental: string;
}

interface VenueTypeOption {
    value: string;
    label: string;
}

const INITIAL_FORM_STATE: VenueFormData = {
    venueName: '',
    address: '',
    city: '',
    state: '',
    capacity: '',
    venueType: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    stageWidth: '',
    stageDepth: '',
    flyHeight: '',
    venueNotes: '',
    rentalRate: '',
    minimumRental: ''
};

// Venue type options
const VENUE_TYPE_OPTIONS: VenueTypeOption[] = [
    { value: 'Proscenium', label: 'Proscenium' },
    { value: 'Thrust', label: 'Thrust' },
    { value: 'Arena', label: 'Arena' },
    { value: 'Black Box', label: 'Black Box' },
    { value: 'Outdoor', label: 'Outdoor' },
    { value: 'Other', label: 'Other' },
];

const VALIDATION_CONFIG: FormValidationConfig = {
    venueName: {
        required: false,
        rules: [
            {
                validator: (value: string) => {
                    if (!value || value.trim().length === 0) {
                        return true; // Empty is valid
                    }
                    return value.trim().length >= 4; // Must have 4+ chars if not empty
                },
                message: 'Venue name must be at least 4 characters',
                code: 'MIN_LENGTH'
            },
            ValidationRules.maxLength(100, 'Venue name must be no more than 100 characters')
        ]
    },
    contactEmail: {
        required: false,
        rules: [
            ValidationRules.email('Please enter a valid email address')
        ]
    },
    contactPhone: {
        required: false,
        rules: [
            ValidationRules.phone('Please enter a valid phone number')
        ]
    },
    capacity: {
        required: false,
        rules: [
            {
                validator: (value: string) => !value || (!isNaN(Number(value)) && Number(value) > 0),
                message: 'Capacity must be a positive number',
                code: 'INVALID_NUMBER'
            }
        ]
    },
    venueNotes: {
        required: false,
        rules: [
            ValidationRules.maxLength(1000, 'Notes must be no more than 1000 characters')
        ]
    }
};

export const EditVenuePage: React.FC = () => {
    const { venueId } = useParams<{ venueId: string }>();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const { showSuccess, showError } = useEnhancedToast();

    // Delete confirmation modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch the initial venue data
    const { venue, isLoading: isLoadingVenue, error: venueError } = useVenue(venueId);

    // Form management
    const form = useValidatedForm<VenueFormData>(INITIAL_FORM_STATE, {
        validationConfig: VALIDATION_CONFIG,
        validateOnChange: true,
        validateOnBlur: true,
        showFieldErrorsInToast: false
    });

    // Populate form when venue data loads
    useEffect(() => {
        if (venue) {
            form.setFormData({
                venueName: venue.venueName || '',
                address: venue.address || '',
                city: venue.city || '',
                state: venue.state || '',
                capacity: venue.capacity?.toString() || '',
                venueType: venue.venueType || '',
                contactName: venue.contactName || '',
                contactEmail: venue.contactEmail || '',
                contactPhone: venue.contactPhone || '',
                stageWidth: venue.stageWidth?.toString() || '',
                stageDepth: venue.stageDepth?.toString() || '',
                flyHeight: venue.flyHeight?.toString() || '',
                venueNotes: venue.venueNotes || '',
                rentalRate: venue.rentalRate?.toString() || '',
                minimumRental: venue.minimumRental?.toString() || ''
            });
        }
    }, [venue, form.setFormData]);

    // Change detection for save button - same pattern as EditShowPage
    const initialData = venue ? {
        venueName: venue.venueName || '',
        address: venue.address || '',
        city: venue.city || '',
        state: venue.state || '',
        capacity: venue.capacity?.toString() || '',
        venueType: venue.venueType || '',
        contactName: venue.contactName || '',
        contactEmail: venue.contactEmail || '',
        contactPhone: venue.contactPhone || '',
        stageWidth: venue.stageWidth?.toString() || '',
        stageDepth: venue.stageDepth?.toString() || '',
        flyHeight: venue.flyHeight?.toString() || '',
        venueNotes: venue.venueNotes || '',
        rentalRate: venue.rentalRate?.toString() || '',
        minimumRental: venue.minimumRental?.toString() || ''
    } : null;

    const { hasChanges, updateOriginalData } = useChangeDetection(
        initialData,
        form.formData,
        true // Always active for venue edit
    );

    // Handle form field changes
    const handleChange = (field: keyof VenueFormData, value: string) => {
        form.updateField(field, value);
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!venueId) return;

        try {
            // Prepare data for API - convert numeric fields
            const updateData = {
                venueName: form.formData.venueName,
                address: form.formData.address || null,
                city: form.formData.city || null,
                state: form.formData.state || null,
                capacity: form.formData.capacity ? parseInt(form.formData.capacity) : null,
                venueType: form.formData.venueType || null,
                contactName: form.formData.contactName || null,
                contactEmail: form.formData.contactEmail || null,
                contactPhone: form.formData.contactPhone || null,
                stageWidth: form.formData.stageWidth ? parseInt(form.formData.stageWidth) : null,
                stageDepth: form.formData.stageDepth ? parseInt(form.formData.stageDepth) : null,
                flyHeight: form.formData.flyHeight ? parseInt(form.formData.flyHeight) : null,
                venueNotes: form.formData.venueNotes || null,
                rentalRate: form.formData.rentalRate ? parseInt(form.formData.rentalRate) : null,
                minimumRental: form.formData.minimumRental ? parseInt(form.formData.minimumRental) : null,
            };

            await form.submitForm(
                `/api/venues/${venueId}`,
                'PATCH',
                `"${form.formData.venueName}" has been updated successfully`,
                updateData
            );

            // Update original data to reflect the changes
            updateOriginalData(form.formData);

            // Navigate back to dashboard on success
            navigate('/dashboard', {
                state: {
                    view: 'venues',
                    selectedVenueId: venueId,
                    returnFromEdit: true
                }
            });

        } catch (error) {
            // Error handled by submitForm
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

    const isFormValid = (): boolean => {
        return form.fieldErrors.length === 0 && form.formData.venueName.trim().length >= 4;
    };

    // Handle venue deletion
    const handleDeleteVenue = async () => {
        if (!venueId || !venue) return;

        setIsDeleting(true);
        try {
            const token = await getToken();
            const response = await fetch(`/api/venues/${venueId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete venue');
            }

            showSuccess('Venue Deleted', `"${venue.venueName}" has been deleted successfully`);

            // Navigate back to dashboard
            navigate('/dashboard', {
                state: {
                    view: 'venues',
                    returnFromEdit: true
                }
            });

        } catch (error) {
            console.error('Error deleting venue:', error);
            showError('Failed to delete venue. Please try again.');
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    // Configure actions menu
    const actions: ActionItem[] = [
        {
            id: 'delete-venue',
            label: 'Delete Venue',
            onClick: () => setIsDeleteModalOpen(true),
            isDestructive: true,
            isDisabled: form.isSubmitting || isDeleting
        }
    ];

    return (
        <ErrorBoundary context="Edit Venue Page">
            <BaseEditPage
                pageTitle={venue?.venueName || 'Venue'}
                onSubmit={handleSubmit}
                isLoading={isLoadingVenue}
                primaryAction={{
                    label: "Save Changes",
                    variant: "primary",
                    type: "submit",
                    isLoading: form.isSubmitting,
                    isDisabled: !isFormValid() || !hasChanges
                }}
                secondaryActions={[
                    {
                        label: "Cancel",
                        variant: "outline",
                        onClick: handleClose
                    }
                ]}
                menuActions={actions}
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
                    <VStack spacing={4} align="stretch">
                        {/* Basic Information */}
                        <FormControl isRequired>
                            <FormLabel>Venue Name</FormLabel>
                            <Input
                                value={form.formData.venueName}
                                onChange={(e) => handleChange('venueName', e.target.value)}
                                onBlur={() => form.validateField('venueName')}
                                placeholder="Enter venue name"
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel>Venue Type</FormLabel>
                            <Select
                                value={form.formData.venueType}
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
                                value={form.formData.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                                placeholder="Enter venue address"
                                rows={3}
                            />
                        </FormControl>

                        <HStack spacing={4}>
                            <FormControl>
                                <FormLabel>City</FormLabel>
                                <Input
                                    value={form.formData.city}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                    placeholder="Enter city"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>State</FormLabel>
                                <Input
                                    value={form.formData.state}
                                    onChange={(e) => handleChange('state', e.target.value)}
                                    placeholder="CA"
                                    maxLength={2}
                                />
                            </FormControl>
                        </HStack>

                        {/* Capacity and Technical Specs - All on one row */}
                        <HStack spacing={4}>
                            <FormControl>
                                <FormLabel>Capacity</FormLabel>
                                <Input
                                    type="number"
                                    value={form.formData.capacity}
                                    onChange={(e) => handleChange('capacity', e.target.value)}
                                    onBlur={() => form.validateField('capacity')}
                                    placeholder="Number of seats"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Stage Width (ft)</FormLabel>
                                <Input
                                    type="number"
                                    value={form.formData.stageWidth}
                                    onChange={(e) => handleChange('stageWidth', e.target.value)}
                                    placeholder="Width in feet"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Stage Depth (ft)</FormLabel>
                                <Input
                                    type="number"
                                    value={form.formData.stageDepth}
                                    onChange={(e) => handleChange('stageDepth', e.target.value)}
                                    placeholder="Depth in feet"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Fly Height (ft)</FormLabel>
                                <Input
                                    type="number"
                                    value={form.formData.flyHeight}
                                    onChange={(e) => handleChange('flyHeight', e.target.value)}
                                    placeholder="Height in feet"
                                />
                            </FormControl>
                        </HStack>

                        {/* Contact Information */}
                        <FormControl>
                            <FormLabel>Contact Name</FormLabel>
                            <Input
                                value={form.formData.contactName}
                                onChange={(e) => handleChange('contactName', e.target.value)}
                                placeholder="Venue contact person"
                            />
                        </FormControl>

                        <HStack spacing={4}>
                            <FormControl>
                                <FormLabel>Contact Email</FormLabel>
                                <Input
                                    type="email"
                                    value={form.formData.contactEmail}
                                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                                    onBlur={() => form.validateField('contactEmail')}
                                    placeholder="contact@venue.com"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Contact Phone</FormLabel>
                                <Input
                                    type="tel"
                                    value={form.formData.contactPhone}
                                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                                    onBlur={() => form.validateField('contactPhone')}
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
                                    value={form.formData.rentalRate}
                                    onChange={(e) => handleChange('rentalRate', e.target.value)}
                                    placeholder="Daily rate in dollars"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Minimum Rental ($)</FormLabel>
                                <Input
                                    type="number"
                                    value={form.formData.minimumRental}
                                    onChange={(e) => handleChange('minimumRental', e.target.value)}
                                    placeholder="Minimum rental amount"
                                />
                            </FormControl>
                        </HStack>

                        {/* Expandable notes textarea */}
                        <FormControl>
                            <FormLabel>Notes</FormLabel>
                            <Textarea
                                value={form.formData.venueNotes}
                                onChange={(e) => handleChange('venueNotes', e.target.value)}
                                onBlur={() => form.validateField('venueNotes')}
                                placeholder="Additional venue information, equipment, special requirements, etc."
                                minHeight="120px"
                                resize="vertical"
                            />
                        </FormControl>
                    </VStack>
                )}

                {/* Floating Validation Error Panel */}
                {form.fieldErrors.length > 0 && (
                    <Box
                        position="fixed"
                        bottom="20px"
                        left="50%"
                        transform="translateX(-50%)"
                        bg="red.500"
                        color="white"
                        px="8"
                        py="6"
                        borderRadius="lg"
                        boxShadow="xl"
                        flexShrink={0}
                        minWidth="450px"
                    >
                        <Text fontWeight="semibold" fontSize="md" display="inline">
                            Validation Errors:
                        </Text>
                        <Text fontSize="md" display="inline" ml={1}>
                            {form.fieldErrors.map((error, i) => (
                                <Text key={i} as="span">
                                    {i > 0 && '; '}{error.message}
                                </Text>
                            ))}
                        </Text>
                    </Box>
                )}

            </BaseEditPage>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteVenue}
                isLoading={isDeleting}
                entityType="Venue"
                entityName={venue?.venueName || ''}
            />
        </ErrorBoundary>
    );
};
