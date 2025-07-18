// frontend/src/EditShowPage.jsx

import { useEffect } from 'react';
import {
    Flex, Box, Heading, HStack, VStack, Button, Text, Spinner,
    FormControl, FormLabel, Input, Textarea, Select
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useShow } from "./hooks/useShow";
import { useFormManager } from './hooks/useFormManager';
import { useResource } from './hooks/useResource';
import { AppIcon } from './components/AppIcon';

const INITIAL_FORM_STATE = {
    showName: '',
    showNotes: '',
    showDate: '',
    deadline: '',
    venueID: ''
};

export const EditShowPage = () => {
    const { showId } = useParams();
    const navigate = useNavigate();

    // Fetch the initial show data
    const { show, isLoading: isLoadingShow, error: showError } = useShow(showId);

    // Fetch venues for the dropdown
    const {
        data: venues,
        isLoading: isLoadingVenues
    } = useResource('/api/venues/');

    // Form management
    const {
        formData,
        isSubmitting,
        updateField,
        setFormData,
        submitForm,
    } = useFormManager(INITIAL_FORM_STATE);

    // Populate form when show data loads
    useEffect(() => {
        if (show) {
            setFormData({
                showName: show.showName || '',
                showNotes: show.showNotes || '',
                // Format dates for input fields
                showDate: show.showDate ? show.showDate.split('T')[0] : '',
                deadline: show.deadline ? show.deadline.substring(0, 16) : '',
                // Get venueID from the venue relationship
                venueID: show.venue?.venueID || ''
            });
        }
    }, [show, setFormData]);

    // Handle form field changes
    const handleChange = (field, value) => {
        updateField(field, value);
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            // Prepare data for API (convert venueID to integer if provided)
            const updateData = {
                ...formData,
                venueID: formData.venueID || null,
                showDate: formData.showDate || null,
                deadline: formData.deadline || null,
                showNotes: formData.showNotes || null,
            };

            await submitForm(
                `/api/shows/${showId}`,
                'PATCH',
                `"${formData.showName}" has been updated successfully`,
                updateData
            );

            // Navigate back to dashboard on success
            navigate('/dashboard');

        } catch (error) {
            // Error handling is done in submitForm
        }
    };

    const handleClose = () => {
        navigate('/dashboard');
    };

    const isFormValid = () => {
        return formData.showName.trim();
    };

    const isLoading = isLoadingShow || isLoadingVenues;

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
                        {isLoadingShow ? 'Loading...' : `${show?.showName}`}
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
                {isLoading && (
                    <Flex justify="center" align="center" height="200px">
                        <Spinner />
                    </Flex>
                )}

                {/* Error State */}
                {showError && (
                    <Text color="red.500" textAlign="center" p="4">
                        {showError}
                    </Text>
                )}

                {/* Form Content */}
                {!isLoading && show && (
                    <VStack spacing={4} align="stretch" height="100%">
                        <FormControl isRequired>
                            <FormLabel>Show Name</FormLabel>
                            <Input
                                value={formData.showName}
                                onChange={(e) => handleChange('showName', e.target.value)}
                                placeholder=""
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel>Venue</FormLabel>
                            <Select
                                value={formData.venueID}
                                onChange={(e) => handleChange('venueID', e.target.value)}
                                placeholder={isLoadingVenues ? "Loading venues..." : "Select Venue"}
                                disabled={isLoadingVenues}
                            >
                                {venues.map(venue => (
                                    <option key={venue.venueID} value={venue.venueID}>
                                        {venue.venueName}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Date fields side-by-side */}
                        <HStack spacing={4}>
                            <FormControl>
                                <FormLabel>Show Date</FormLabel>
                                <Input
                                    type="date"
                                    value={formData.showDate}
                                    onChange={(e) => handleChange('showDate', e.target.value)}
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Script Deadline</FormLabel>
                                <Input
                                    type="datetime-local"
                                    value={formData.deadline}
                                    onChange={(e) => handleChange('deadline', e.target.value)}
                                />
                            </FormControl>
                        </HStack>

                        {/* Expandable notes textarea */}
                        <FormControl display="flex" flexDirection="column" flexGrow={1}>
                            <FormLabel>Notes</FormLabel>
                            <Textarea
                                value={formData.showNotes}
                                onChange={(e) => handleChange('showNotes', e.target.value)}
                                placeholder=""
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