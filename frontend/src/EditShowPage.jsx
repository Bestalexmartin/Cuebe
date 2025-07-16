// frontend/src/EditShowPage.jsx

import { useEffect, useState } from 'react';
import { Flex, Box, Heading, HStack, VStack, Button, Text, Spinner, FormControl, FormLabel, Input, Textarea, Select } from "@chakra-ui/react";
import { AppIcon } from './components/AppIcon';
import { useParams, useNavigate } from "react-router-dom";
import { useShow } from "./useShow";
import { useVenues } from "./useVenues";
import { useAuth } from '@clerk/clerk-react';

export const EditShowPage = () => {
    const { showId } = useParams();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const { venues } = useVenues();

    // Fetch the initial show data
    const { show, isLoading, error } = useShow(showId);

    // --- State to manage the form data ---
    const [formData, setFormData] = useState({
        showName: '',
        showNotes: '',
        showDate: '',
        deadline: '',
        venueID: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    // --- Effect to populate the form when data is loaded ---
    useEffect(() => {
        if (show) {
            setFormData({
                showName: show.showName || '',
                showNotes: show.showNotes || '',
                // Formatting dates for the input fields
                showDate: show.showDate ? show.showDate.split('T')[0] : '',
                deadline: show.deadline ? show.deadline.substring(0, 16) : '',
                // Fix: get venueID from the venue relationship
                venueID: show.venue?.venueID || ''
            });
        }
    }, [show]);

    // --- Handler for form input changes ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- Handler for form submission ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        console.log("Data being sent to API:", formData);
        try {
            const token = await getToken();
            const response = await fetch(`/api/shows/${showId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData)
            });
            if (!response.ok) throw new Error('Failed to save changes.');
            navigate('/dashboard'); // Go back to dashboard on success
        } catch (err) {
            console.error(err);
            // You can add a user-facing error message here
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        navigate('/dashboard');
    };

    return (
        <Flex as="form" onSubmit={handleSubmit} width="100%" height="100%" p="2rem" flexDirection="column" boxSizing="border-box">
            {/* Header Section */}
            <Flex justify="space-between" align="center" flexShrink={0}>
                <HStack spacing="2" align="center">
                    <AppIcon name="edit" boxSize="25px" />
                    <Heading as="h2" size="md">
                        {isLoading ? 'Loading...' : `Edit: ${show?.showName}`}
                    </Heading>
                </HStack>
                <HStack spacing="2">
                    <Button onClick={handleClose} size="xs">
                        Cancel
                    </Button>
                    <Button
                        bg="blue.400"
                        color="white"
                        size="xs"
                        _hover={{ bg: 'orange.400' }}
                        type="submit"
                        isLoading={isSaving}
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
                {isLoading && (
                    <Flex justify="center" align="center" height="200px">
                        <Spinner />
                    </Flex>
                )}
                {error && (
                    <Text color="red.500" textAlign="center" p="4">
                        {error}
                    </Text>
                )}
                {!isLoading && show && (
                    <VStack spacing={4} align="stretch" height="100%">
                        <FormControl isRequired>
                            <FormLabel>Show Name</FormLabel>
                            <Input name="showName" value={formData.showName} onChange={handleChange} />
                        </FormControl>

                        <FormControl>
                            <FormLabel>Venue</FormLabel>
                            <Select name="venueID" value={formData.venueID} onChange={handleChange} placeholder="Select venue">
                                {/* Map over the fetched venues to create options */}
                                {venues.map(venue => (
                                    <option key={venue.venueID} value={venue.venueID}>
                                        {venue.venueName}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Use an HStack to put date fields side-by-side */}
                        <HStack>
                            <FormControl>
                                <FormLabel>Show Date</FormLabel>
                                <Input name="showDate" type="date" value={formData.showDate} onChange={handleChange} />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Final Info Deadline</FormLabel>
                                <Input name="deadline" type="datetime-local" value={formData.deadline} onChange={handleChange} />
                            </FormControl>
                        </HStack>

                        {/* This FormControl will now expand */}
                        <FormControl display="flex" flexDirection="column" flexGrow={1}>
                            <FormLabel>Notes</FormLabel>
                            {/* This Textarea will grow to fill the FormControl */}
                            <Textarea name="showNotes" value={formData.showNotes} onChange={handleChange} flexGrow={1} />
                        </FormControl>
                    </VStack>
                )}
            </Box>
        </Flex>
    );
};