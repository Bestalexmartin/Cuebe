// frontend/src/EditScriptPage.tsx

import React, { useEffect, useState } from 'react';
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
    Select,
    Divider,
    useToast
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from '@clerk/clerk-react';
import { useFormManager } from './hooks/useFormManager';
import { useScript } from './hooks/useScript';
import { AppIcon } from './components/AppIcon';
import { ActionsMenu, ActionItem } from './components/ActionsMenu';
import { DeleteConfirmationModal } from './components/modals/DeleteConfirmationModal';
import { FinalDeleteConfirmationModal } from './components/modals/FinalDeleteConfirmationModal';
import { useEnhancedToast } from './utils/toastUtils';
import { convertUTCToLocal, convertLocalToUTC } from './utils/dateTimeUtils';

// TypeScript interfaces
interface ScriptFormData {
    scriptName: string;
    scriptStatus: string;
    startTime: string;
}

interface ScriptStatusOption {
    value: string;
    label: string;
}

const INITIAL_FORM_STATE: ScriptFormData = {
    scriptName: '',
    scriptStatus: 'DRAFT',
    startTime: '',
};

// Script status options - updated workflow states
const SCRIPT_STATUS_OPTIONS: ScriptStatusOption[] = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'COPY', label: 'Copy' },
    { value: 'WORKING', label: 'Working' },
    { value: 'FINAL', label: 'Final' },
    { value: 'BACKUP', label: 'Backup' },
];

export const EditScriptPage: React.FC = () => {
    const { scriptId } = useParams<{ scriptId: string }>();
    const navigate = useNavigate();
    const { showSuccess, showError } = useEnhancedToast();
    const { getToken } = useAuth();

    // Delete state management
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isFinalDeleteModalOpen, setIsFinalDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch the initial script data
    const { script, isLoading: isLoadingScript, error: scriptError } = useScript(scriptId);

    // Form management
    const {
        formData,
        isSubmitting,
        updateField,
        setFormData,
        submitForm,
    } = useFormManager<ScriptFormData>(INITIAL_FORM_STATE);

    // Populate form when script data loads
    useEffect(() => {
        if (script) {
            setFormData({
                scriptName: script.scriptName || '',
                scriptStatus: script.scriptStatus || 'DRAFT',
                startTime: convertUTCToLocal(script.startTime),
            });
        }
    }, [script, setFormData]);

    // Handle form field changes
    const handleChange = (field: keyof ScriptFormData, value: string) => {
        updateField(field, value);
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!scriptId) return;

        try {
            // Prepare data for API
            const updateData = {
                scriptName: formData.scriptName,
                scriptStatus: formData.scriptStatus,
                startTime: convertLocalToUTC(formData.startTime),
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
                    selectedShowId: script?.showID,
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
                selectedShowId: script?.showID,
                selectedScriptId: scriptId,
                returnFromEdit: true
            }
        });
    };

    const isFormValid = (): boolean => {
        return formData.scriptName.trim().length > 0;
    };

    // Delete functionality
    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    const handleInitialDeleteConfirm = () => {
        setIsDeleteModalOpen(false);
        setIsFinalDeleteModalOpen(true);
    };

    const handleFinalDeleteConfirm = async () => {
        if (!scriptId) return;

        setIsDeleting(true);
        try {
            const token = await getToken();
            if (!token) {
                throw new Error('Authentication token not available');
            }

            const response = await fetch(`/api/scripts/${scriptId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete script');
            }

            showSuccess('Script Deleted', `"${script?.scriptName}" has been permanently deleted`);

            // Navigate back to dashboard shows view
            navigate('/dashboard', {
                state: {
                    view: 'shows',
                    selectedShowId: script?.showID,
                    returnFromEdit: true
                }
            });

        } catch (error) {
            console.error('Error deleting script:', error);
            showError('Failed to delete script. Please try again.');
        } finally {
            setIsDeleting(false);
            setIsFinalDeleteModalOpen(false);
        }
    };

    const handleDeleteCancel = () => {
        setIsDeleteModalOpen(false);
        setIsFinalDeleteModalOpen(false);
    };

    // Actions menu items
    const actionItems: ActionItem[] = [
        {
            id: 'delete',
            label: 'Delete Script',
            onClick: handleDeleteClick,
            isDestructive: true
        }
    ];

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
                    <ActionsMenu actions={actionItems} />
                    <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />
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
                pb="8"
                borderRadius="md"
                flexGrow={1}
                overflowY="auto"
                className="hide-scrollbar edit-form-container"
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
                    <VStack spacing={4} align="stretch">
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
                            <FormLabel>Start Time</FormLabel>
                            <Input
                                type="datetime-local"
                                value={formData.startTime}
                                onChange={(e) => handleChange('startTime', e.target.value)}
                                placeholder="Select start time"
                            />
                        </FormControl>

                        {/* Script Content Section */}
                        <Box
                            p="4"
                            bg="gray.50"
                            _dark={{ bg: "gray.700" }}
                            borderRadius="md"
                            minHeight="200px"
                            display="flex"
                            flexDirection="column"
                        >
                            <Text fontWeight="semibold" mb="2">Script Content</Text>
                            <Box minHeight="150px" display="flex" alignItems="center" justifyContent="center">
                                <Text fontSize="sm" color="detail.text" fontStyle="italic" textAlign="center">
                                    Script content editing will be implemented in a future version.
                                    For now, you can manage the script metadata above.
                                </Text>
                            </Box>
                        </Box>
                    </VStack>
                )}
            </Box>

            {/* Delete Confirmation Modals */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={handleDeleteCancel}
                onConfirm={handleInitialDeleteConfirm}
                entityType="Script"
                entityName={script?.scriptName || ''}
            />

            <FinalDeleteConfirmationModal
                isOpen={isFinalDeleteModalOpen}
                onClose={handleDeleteCancel}
                onConfirm={handleFinalDeleteConfirm}
                isLoading={isDeleting}
                entityType="Script"
                entityName={script?.scriptName || ''}
                warningMessage="Deleting this script will permanently remove all script elements and cannot be undone."
            />
        </Flex>
    );
};