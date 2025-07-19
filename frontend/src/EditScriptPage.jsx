// frontend/src/EditScriptPage.jsx

import { useEffect } from 'react';
import {
    Flex,
    Box,
    Heading,
    HStack,
    VStack,
    Button,
    Text,
    Spinner,
    FormControl,
    FormLabel,
    Input,
    Select
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useFormManager } from './hooks/useFormManager';
import { useScript } from './hooks/useScript';
import { AppIcon } from './components/AppIcon';

const INITIAL_FORM_STATE = {
    scriptName: '',
    scriptStatus: 'ready',
    intendedStartTime: '',
};

// Script status options
const SCRIPT_STATUS_OPTIONS = [
    { value: 'ready', label: 'Ready' },
    { value: 'running', label: 'Running' },
    { value: 'paused', label: 'Paused' },
    { value: 'done', label: 'Done' },
];

export const EditScriptPage = () => {
    const { scriptId } = useParams();
    const navigate = useNavigate();

    // Fetch the initial script data
    const { script, isLoading: isLoadingScript, error: scriptError } = useScript(scriptId);

    // Form management
    const {
        formData,
        isSubmitting,
        updateField,
        setFormData,
        submitForm,
    } = useFormManager(INITIAL_FORM_STATE);

    // Populate form when script data loads
    useEffect(() => {
        if (script) {
            setFormData({
                scriptName: script.scriptName || '',
                scriptStatus: script.scriptStatus || 'ready',
                // Format datetime for input field
                intendedStartTime: script.intendedStartTime
                    ? script.intendedStartTime.substring(0, 16)
                    : '',
            });
        }
    }, [script, setFormData]);

    // Handle form field changes
    const handleChange = (field, value) => {
        updateField(field, value);
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            // Prepare data for API
            const updateData = {
                scriptName: formData.scriptName,
                scriptStatus: formData.scriptStatus,
                intendedStartTime: formData.intendedStartTime || null,
            };

            await submitForm(
                `/api/scripts/${scriptId}`,
                'PATCH',
                `"${formData.scriptName}" has been updated successfully`,
                updateData
            );

            // Navigate back to dashboard on success
            navigate('/dashboard', {
                state: {
                    view: 'shows',
                    selectedShowId: script.showID,
                    selectedScriptId: scriptId,
                    returnFromEdit: true
                }
            });

        } catch (error) {
            // Error handling is done in submitForm
        }
    };

    const handleClose = () => {
        navigate('/dashboard', {
            state: {
                view: 'shows',
                selectedShowId: script.showID,
                selectedScriptId: scriptId,
                returnFromEdit: true
            }
        });
    };

    const isFormValid = () => {
        return formData.scriptName.trim();
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
                        {isLoadingScript ? 'Loading...' : `${script?.scriptName}`}
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
                {isLoadingScript && (
                    <Flex justify="center" align="center" height="200px">
                        <Spinner />
                    </Flex>
                )}

                {/* Error State */}
                {scriptError && (
                    <Text color="red.500" textAlign="center" p="4">
                        {scriptError}
                    </Text>
                )}

                {/* Form Content */}
                {!isLoadingScript && script && (
                    <VStack spacing={4} align="stretch" height="100%">
                        <FormControl isRequired>
                            <FormLabel>Script Name</FormLabel>
                            <Input
                                value={formData.scriptName}
                                onChange={(e) => handleChange('scriptName', e.target.value)}
                                placeholder="Enter script name"
                            />
                        </FormControl>

                        <FormControl isRequired>
                            <FormLabel>Script Status</FormLabel>
                            <Select
                                value={formData.scriptStatus}
                                onChange={(e) => handleChange('scriptStatus', e.target.value)}
                            >
                                {SCRIPT_STATUS_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl>
                            <FormLabel>Intended Start Time</FormLabel>
                            <Input
                                type="datetime-local"
                                value={formData.intendedStartTime}
                                onChange={(e) => handleChange('intendedStartTime', e.target.value)}
                            />
                            <Text fontSize="sm" color="gray.500" mt="1">
                                When this script is scheduled to begin
                            </Text>
                        </FormControl>

                        {/* Script Content Section - takes remaining space */}
                        <Box
                            p="4"
                            bg="gray.50"
                            _dark={{ bg: "gray.700" }}
                            borderRadius="md"
                            flexGrow={1}
                            display="flex"
                            flexDirection="column"
                        >
                            <Text fontWeight="semibold" mb="2">Script Content</Text>
                            <Box flexGrow={1} display="flex" alignItems="center" justifyContent="center">
                                <Text fontSize="sm" color="gray.500" fontStyle="italic" textAlign="center">
                                    Script content editing will be implemented in a future version.
                                    For now, you can manage the script metadata above.
                                </Text>
                            </Box>
                        </Box>
                    </VStack>
                )}
            </Box>
        </Flex>
    );
};