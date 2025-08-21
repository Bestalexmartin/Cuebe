// frontend/src/features/venues/pages/EditVenuePage.tsx

import React, { useEffect, useState } from 'react';
import {
    VStack, HStack, Text, Spinner, Flex
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from '@clerk/clerk-react';
import { useVenue } from "../hooks/useVenue";
import { useValidatedFormSchema } from '../../../components/forms/ValidatedForm';
import { BaseEditPage } from '../../../components/base/BaseEditPage';
import { ActionItem } from '../../../components/ActionsMenu';
import { DeleteConfirmationModal } from '../../../components/modals/DeleteConfirmationModal';
import { useEnhancedToast } from '../../../utils/toastUtils';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { useChangeDetection } from '../../../hooks/useChangeDetection';
import { FloatingValidationErrorPanel } from '../../../components/base/FloatingValidationErrorPanel';
import { EditPageFormField } from '../../../components/base/EditPageFormField';

// TypeScript interfaces
interface VenueFormData {
    venue_name: string;
    address: string;
    city: string;
    state: string;
    capacity: string;
    venue_type: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    stage_width: string;
    stage_depth: string;
    fly_height: string;
    venue_notes: string;
    rental_rate: string;
    minimum_rental: string;
}

interface VenueTypeOption {
    value: string;
    label: string;
}

const INITIAL_FORM_STATE: VenueFormData = {
    venue_name: '',
    address: '',
    city: '',
    state: '',
    capacity: '',
    venue_type: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    stage_width: '',
    stage_depth: '',
    fly_height: '',
    venue_notes: '',
    rental_rate: '',
    minimum_rental: ''
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
    const form = useValidatedFormSchema<VenueFormData>(
        INITIAL_FORM_STATE,
        'venue',
        'venueEdit',
        undefined,
        {
            validateOnBlur: true,
            showFieldErrorsInToast: false
        }
    );

    // Populate form when venue data loads
    useEffect(() => {
        if (venue) {
            form.setFormData({
                venue_name: venue.venue_name || '',
                address: venue.address || '',
                city: venue.city || '',
                state: venue.state || '',
                capacity: venue.capacity?.toString() || '',
                venue_type: venue.venue_type || '',
                contact_name: venue.contact_name || '',
                contact_email: venue.contact_email || '',
                contact_phone: venue.contact_phone || '',
                stage_width: venue.stage_width?.toString() || '',
                stage_depth: venue.stage_depth?.toString() || '',
                fly_height: venue.fly_height?.toString() || '',
                venue_notes: venue.venue_notes || '',
                rental_rate: venue.rental_rate?.toString() || '',
                minimum_rental: venue.minimum_rental?.toString() || ''
            });
        }
    }, [venue, form.setFormData]);

    // Change detection for save button - same pattern as EditShowPage
    const initialData = venue ? {
        venue_name: venue.venue_name || '',
        address: venue.address || '',
        city: venue.city || '',
        state: venue.state || '',
        capacity: venue.capacity?.toString() || '',
        venue_type: venue.venue_type || '',
        contact_name: venue.contact_name || '',
        contact_email: venue.contact_email || '',
        contact_phone: venue.contact_phone || '',
        stage_width: venue.stage_width?.toString() || '',
        stage_depth: venue.stage_depth?.toString() || '',
        fly_height: venue.fly_height?.toString() || '',
        venue_notes: venue.venue_notes || '',
        rental_rate: venue.rental_rate?.toString() || '',
        minimum_rental: venue.minimum_rental?.toString() || ''
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
                venue_name: form.formData.venue_name,
                address: form.formData.address || null,
                city: form.formData.city || null,
                state: form.formData.state || null,
                capacity: form.formData.capacity ? parseInt(form.formData.capacity) : null,
                venue_type: form.formData.venue_type || null,
                contact_name: form.formData.contact_name || null,
                contact_email: form.formData.contact_email || null,
                contact_phone: form.formData.contact_phone || null,
                stage_width: form.formData.stage_width ? parseInt(form.formData.stage_width) : null,
                stage_depth: form.formData.stage_depth ? parseInt(form.formData.stage_depth) : null,
                fly_height: form.formData.fly_height ? parseInt(form.formData.fly_height) : null,
                venue_notes: form.formData.venue_notes || null,
                rental_rate: form.formData.rental_rate ? parseInt(form.formData.rental_rate) : null,
                minimum_rental: form.formData.minimum_rental ? parseInt(form.formData.minimum_rental) : null,
            };

            await form.submitForm(
                `/api/venues/${venueId}`,
                'PATCH',
                `"${form.formData.venue_name}" has been updated successfully`,
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
        return form.fieldErrors.length === 0 && form.formData.venue_name.trim().length >= 4;
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

            showSuccess('Venue Deleted', `"${venue.venue_name}" has been deleted successfully`);

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
                pageTitle={venue?.venue_name || 'Venue'}
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
                        <EditPageFormField
                            type="input"
                            label="Venue Name"
                            value={form.formData.venue_name}
                            onChange={(value) => handleChange('venue_name', value)}
                            onBlur={() => form.validateField('venue_name')}
                            placeholder="Enter venue name"
                            isRequired
                        />

                        <EditPageFormField
                            type="select"
                            label="Venue Type"
                            value={form.formData.venue_type}
                            onChange={(value) => handleChange('venue_type', value)}
                            placeholder="Select venue type"
                            options={VENUE_TYPE_OPTIONS}
                        />

                        <EditPageFormField
                            type="textarea"
                            label="Address"
                            value={form.formData.address}
                            onChange={(value) => handleChange('address', value)}
                            placeholder="Enter venue address"
                            rows={3}
                        />

                        <HStack spacing={4}>
                            <EditPageFormField
                                type="input"
                                label="City"
                                value={form.formData.city}
                                onChange={(value) => handleChange('city', value)}
                                placeholder="Enter city"
                            />
                            <EditPageFormField
                                type="input"
                                label="State"
                                value={form.formData.state}
                                onChange={(value) => handleChange('state', value)}
                                placeholder="CA"
                                maxLength={2}
                            />
                        </HStack>

                        {/* Capacity and Technical Specs - All on one row */}
                        <HStack spacing={4}>
                            <EditPageFormField
                                type="input"
                                inputType="number"
                                label="Capacity"
                                value={form.formData.capacity}
                                onChange={(value) => handleChange('capacity', value)}
                                onBlur={() => form.validateField('capacity')}
                                placeholder="Number of seats"
                            />
                            <EditPageFormField
                                type="input"
                                inputType="number"
                                label="Stage Width (ft)"
                                value={form.formData.stage_width}
                                onChange={(value) => handleChange('stage_width', value)}
                                placeholder="Width in feet"
                            />
                            <EditPageFormField
                                type="input"
                                inputType="number"
                                label="Stage Depth (ft)"
                                value={form.formData.stage_depth}
                                onChange={(value) => handleChange('stage_depth', value)}
                                placeholder="Depth in feet"
                            />
                            <EditPageFormField
                                type="input"
                                inputType="number"
                                label="Fly Height (ft)"
                                value={form.formData.fly_height}
                                onChange={(value) => handleChange('fly_height', value)}
                                placeholder="Height in feet"
                            />
                        </HStack>

                        {/* Contact Information */}
                        <EditPageFormField
                            type="input"
                            label="Contact Name"
                            value={form.formData.contact_name}
                            onChange={(value) => handleChange('contact_name', value)}
                            placeholder="Venue contact person"
                        />

                        <HStack spacing={4}>
                            <EditPageFormField
                                type="input"
                                inputType="email"
                                label="Contact Email"
                                value={form.formData.contact_email}
                                onChange={(value) => handleChange('contact_email', value)}
                                onBlur={() => form.validateField('contact_email')}
                                placeholder="contact@venue.com"
                            />
                            <EditPageFormField
                                type="input"
                                inputType="tel"
                                label="Contact Phone"
                                value={form.formData.contact_phone}
                                onChange={(value) => handleChange('contact_phone', value)}
                                onBlur={() => form.validateField('contact_phone')}
                                placeholder="(555) 123-4567"
                            />
                        </HStack>

                        {/* Rental Information */}
                        <HStack spacing={4}>
                            <EditPageFormField
                                type="input"
                                inputType="number"
                                label="Daily Rental Rate ($)"
                                value={form.formData.rental_rate}
                                onChange={(value) => handleChange('rental_rate', value)}
                                placeholder="Daily rate in dollars"
                            />
                            <EditPageFormField
                                type="input"
                                inputType="number"
                                label="Minimum Rental ($)"
                                value={form.formData.minimum_rental}
                                onChange={(value) => handleChange('minimum_rental', value)}
                                placeholder="Minimum rental amount"
                            />
                        </HStack>

                        {/* Expandable notes textarea */}
                        <EditPageFormField
                            type="textarea"
                            label="Notes"
                            value={form.formData.venue_notes}
                            onChange={(value) => handleChange('venue_notes', value)}
                            onBlur={() => form.validateField('venue_notes')}
                            placeholder="Additional venue information, equipment, special requirements, etc."
                            minHeight="120px"
                        />
                    </VStack>
                )}

                {/* Floating Validation Error Panel */}
                <FloatingValidationErrorPanel fieldErrors={form.fieldErrors} />

            </BaseEditPage>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteVenue}
                isLoading={isDeleting}
                entityType="Venue"
                entityName={venue?.venue_name || ''}
            />
        </ErrorBoundary>
    );
};
