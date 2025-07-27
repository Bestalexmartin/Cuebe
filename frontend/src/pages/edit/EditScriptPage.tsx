// frontend/src/EditScriptPage.tsx

import React, { useEffect, useState } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Spinner,
    Flex,
    Button,
    Tooltip,
    Divider,
    FormControl,
    FormLabel,
    Input,
    Select,
    Textarea,
    Heading
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from '@clerk/clerk-react';
import { useScript } from "../../hooks/useScript";
import { useShow } from "../../hooks/useShow";
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { AppIcon } from '../../components/AppIcon';
import { ActionsMenu, ActionItem } from '../../components/ActionsMenu';
import { DeleteConfirmationModal } from '../../components/modals/DeleteConfirmationModal';
import { FinalDeleteConfirmationModal } from '../../components/modals/FinalDeleteConfirmationModal';
import { DuplicateScriptModal } from '../../components/modals/DuplicateScriptModal';
import { ProcessingModal } from '../../components/modals/ProcessingModal';
import { useEnhancedToast } from '../../utils/toastUtils';
import { useValidatedForm } from '../../hooks/useValidatedForm';
import { ValidationRules, FormValidationConfig } from '../../types/validation';
import { convertUTCToLocal, convertLocalToUTC } from '../../utils/dateTimeUtils';
import { useChangeDetection } from '../../hooks/useChangeDetection';

interface EditScriptPageProps { }

// TypeScript interfaces for script metadata form
interface ScriptFormData {
    scriptName: string;
    scriptStatus: string;
    startTime: string;
    description: string;
}

// Script status options - matching the workflow states
const SCRIPT_STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'COPY', label: 'Copy' },
    { value: 'WORKING', label: 'Working' },
    { value: 'FINAL', label: 'Final' },
    { value: 'BACKUP', label: 'Backup' },
];

const INITIAL_FORM_STATE: ScriptFormData = {
    scriptName: '',
    scriptStatus: 'DRAFT',
    startTime: '',
    description: ''
};

const VALIDATION_CONFIG: FormValidationConfig = {
    scriptName: {
        required: false,
        rules: [
            {
                validator: (value: string) => {
                    if (!value || value.trim().length === 0) {
                        return true; // Empty is valid
                    }
                    return value.trim().length >= 4; // Must have 4+ chars if not empty
                },
                message: 'Script name must be at least 4 characters',
                code: 'MIN_LENGTH'
            },
            ValidationRules.maxLength(100, 'Script name must be no more than 100 characters')
        ]
    },
    description: {
        required: false,
        rules: [
            ValidationRules.maxLength(500, 'Description must be no more than 500 characters')
        ]
    }
};

interface ToolButton {
    id: string;
    icon: 'view' | 'play' | 'info' | 'script-edit' | 'share' | 'dashboard';
    label: string;
    description: string;
    isActive: boolean;
    isDisabled?: boolean;
}

export const EditScriptPage: React.FC<EditScriptPageProps> = () => {
    const { scriptId } = useParams<{ scriptId: string }>();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const { showSuccess, showError } = useEnhancedToast();

    // Delete state management
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isFinalDeleteModalOpen, setIsFinalDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Duplicate state management
    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
    const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);

    // Form management for INFO mode
    const form = useValidatedForm<ScriptFormData>(INITIAL_FORM_STATE, {
        validationConfig: VALIDATION_CONFIG,
        validateOnChange: true,
        validateOnBlur: true,
        showFieldErrorsInToast: false
    });

    // Fetch the script data
    const { script, isLoading: isLoadingScript, error: scriptError } = useScript(scriptId);

    // Fetch the show data using the script's showID
    const { show } = useShow(script?.showID);

    // Active mode state
    const [activeMode, setActiveMode] = useState<string>('view');

    // Change detection for save button
    const initialData = script && show ? {
        scriptName: script.scriptName,
        showName: show.showName,
        scriptStatus: script.scriptStatus,
        startTime: convertLocalToUTC(convertUTCToLocal(script.startTime)) // Normalize the format
    } : null;

    const { hasChanges, updateOriginalData } = useChangeDetection(
        initialData,
        {
            scriptName: form.formData.scriptName,
            scriptStatus: form.formData.scriptStatus,
            startTime: convertLocalToUTC(form.formData.startTime)
        },
        activeMode === 'info'
    );

    // Populate form when script data loads
    React.useEffect(() => {
        if (script) {
            form.setFormData({
                scriptName: script.scriptName || '',
                scriptStatus: script.scriptStatus || 'DRAFT',
                startTime: convertUTCToLocal(script.startTime),
                description: ''
            });
        }
    }, [script, form.setFormData]);


    // Tool buttons configuration - single column, ghosted except view and info
    const toolButtons: ToolButton[] = [
        {
            id: 'view',
            icon: 'view',
            label: 'View',
            description: 'View Script',
            isActive: activeMode === 'view',
            isDisabled: false
        },
        {
            id: 'play',
            icon: 'play',
            label: 'Play',
            description: 'Perform Script',
            isActive: activeMode === 'play',
            isDisabled: true
        },
        {
            id: 'info',
            icon: 'info',
            label: 'Info',
            description: 'Update Script Info',
            isActive: activeMode === 'info',
            isDisabled: false
        },
        {
            id: 'edit',
            icon: 'script-edit',
            label: 'Edit',
            description: 'Edit Script',
            isActive: activeMode === 'edit',
            isDisabled: true
        },
        {
            id: 'share',
            icon: 'share',
            label: 'Share',
            description: 'Share Script',
            isActive: activeMode === 'share',
            isDisabled: true
        },
        {
            id: 'dashboard',
            icon: 'dashboard',
            label: 'Dashboard',
            description: 'Return to Dashboard',
            isActive: false,
            isDisabled: false
        }
    ];

    const handleModeChange = (modeId: string) => {
        // Handle dashboard navigation separately
        if (modeId === 'dashboard') {
            handleCancel();
            return;
        }

        // Only allow switching to enabled modes
        const tool = toolButtons.find(t => t.id === modeId);
        if (tool && !tool.isDisabled) {
            setActiveMode(modeId);
        }
    };

    const handleSave = async () => {
        if (!scriptId || activeMode !== 'info') return;

        try {
            // Prepare data for API
            const updateData = {
                scriptName: form.formData.scriptName,
                scriptStatus: form.formData.scriptStatus,
                startTime: convertLocalToUTC(form.formData.startTime),
                description: form.formData.description || null
            };

            await form.submitForm(
                `/api/scripts/${scriptId}`,
                'PATCH',
                `"${form.formData.scriptName}" has been updated successfully`,
                updateData
            );

            // Update original data to reflect the new saved state
            updateOriginalData({
                scriptName: form.formData.scriptName,
                scriptStatus: form.formData.scriptStatus,
                startTime: convertLocalToUTC(form.formData.startTime)
            });

        } catch (error) {
            // Error handling is done in submitForm
        }
    };

    const handleCancel = () => {
        navigate('/dashboard', {
            state: {
                view: 'shows',
                selectedShowId: script?.showID,
                selectedScriptId: scriptId,
                returnFromEdit: true
            }
        });
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

    const handleProcessingStart = () => {
        setIsProcessingModalOpen(true);
    };

    const handleScriptDuplicated = (newScriptId: string) => {
        setIsProcessingModalOpen(false);
        // Navigate directly to the new script's edit page
        navigate(`/scripts/${newScriptId}/edit`);
    };

    const handleDuplicationError = () => {
        setIsProcessingModalOpen(false);
        // Error toast will be shown by the form submission handler
    };

    // Configure actions menu
    const actions: ActionItem[] = [
        {
            id: 'duplicate-script',
            label: 'Duplicate Script',
            onClick: () => setIsDuplicateModalOpen(true),
            isDestructive: false,
            isDisabled: false
        },
        {
            id: 'export-script',
            label: 'Export Script',
            onClick: () => { },
            isDestructive: false,
            isDisabled: true
        },
        {
            id: 'edit-history',
            label: 'Edit History',
            onClick: () => { },
            isDestructive: false,
            isDisabled: true
        },
        {
            id: 'delete-script',
            label: 'Delete Script',
            onClick: handleDeleteClick,
            isDestructive: true,
            isDisabled: false
        }
    ];

    return (
        <ErrorBoundary context="Script Edit Page">
            <Flex width="100%" height="100%" p="2rem" flexDirection="column" boxSizing="border-box">
                {/* Header Section */}
                <Flex
                    width="100%"
                    justify="space-between"
                    align="center"
                    flexShrink={0}
                    mb="4"
                    height="24px"
                >
                    {/* Left: Script Title */}
                    <HStack spacing={2} align="center">
                        <AppIcon name="script" boxSize="20px" color="white" />
                        <Heading as="h2" size="md">
                            {show?.showName && script?.scriptName ? `${show.showName} > ${script.scriptName}` : script?.scriptName || 'Script'}
                        </Heading>
                    </HStack>

                    {/* Right: Action Buttons positioned to align with scroll area */}
                    <Box flex={1} position="relative">
                        <Box position="absolute" right="106px" top="50%" transform="translateY(-50%)">
                            <HStack spacing={2}>
                                {/* Actions Menu */}
                                <ActionsMenu
                                    actions={actions}
                                    isDisabled={false}
                                />

                                {/* Divider */}
                                <Divider orientation="vertical" height="20px" borderColor="gray.400" mx="2" />

                                {/* Action Buttons */}
                                <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={handleCancel}
                                    _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="xs"
                                    bg="blue.400"
                                    color="white"
                                    onClick={handleSave}
                                    isDisabled={!hasChanges}
                                    _hover={{ bg: 'orange.400' }}
                                >
                                    Save Changes
                                </Button>
                            </HStack>
                        </Box>
                    </Box>
                </Flex>

                {/* Main Content Area */}
                <Flex flex={1} width="100%" overflow="hidden" minHeight={0}>
                    {/* Left: Script Content Area - matches BaseEditPage dimensions but shifted left */}
                    <Box
                        flex={1}
                        bg={{ base: "white", _dark: "gray.900" }}
                        borderRadius="md"
                        mr="8"
                        position="relative"
                        overflow="hidden"
                        display="flex"
                        flexDirection="column"
                        border="1px solid"
                        borderColor="container.border"
                        width="calc(100% - 106px)" // Account for bordered toolbar (74px) + double margins (32px)
                    >
                        {/* Loading State */}
                        {isLoadingScript && (
                            <Flex justify="center" align="center" height="100%">
                                <VStack spacing={4}>
                                    <Spinner size="lg" />
                                    <Text>Loading script...</Text>
                                </VStack>
                            </Flex>
                        )}

                        {/* Error State */}
                        {scriptError && (
                            <Flex justify="center" align="center" height="100%">
                                <Text color="red.500" textAlign="center">
                                    {scriptError}
                                </Text>
                            </Flex>
                        )}

                        {/* Script Content */}
                        {!isLoadingScript && !scriptError && script && (
                            <Box
                                flex={1}
                                p="4"
                                pb="8"
                                overflowY="auto"
                                className="hide-scrollbar edit-form-container"
                                minHeight={0}
                            >
                                {/* INFO Mode - Script Metadata Form */}
                                {activeMode === 'info' && (
                                    <VStack spacing={4} align="stretch" width="100%">
                                        <FormControl isRequired>
                                            <FormLabel>Script Name</FormLabel>
                                            <Input
                                                value={form.formData.scriptName}
                                                onChange={(e) => form.updateField('scriptName', e.target.value)}
                                                onBlur={() => form.validateField('scriptName')}
                                                placeholder="Enter script name"
                                            />
                                        </FormControl>

                                        <FormControl isRequired>
                                            <FormLabel>Script Status</FormLabel>
                                            <Select
                                                value={form.formData.scriptStatus}
                                                onChange={(e) => form.updateField('scriptStatus', e.target.value)}
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
                                                value={form.formData.startTime}
                                                onChange={(e) => form.updateField('startTime', e.target.value)}
                                                placeholder="Select start time"
                                            />
                                        </FormControl>

                                        <FormControl>
                                            <FormLabel>Description</FormLabel>
                                            <Textarea
                                                value={form.formData.description}
                                                onChange={(e) => form.updateField('description', e.target.value)}
                                                onBlur={() => form.validateField('description')}
                                                placeholder="Script description, notes, or special instructions..."
                                                minHeight="120px"
                                                resize="vertical"
                                            />
                                        </FormControl>
                                    </VStack>
                                )}

                                {/* Other modes - Placeholder */}
                                {activeMode !== 'info' && (
                                    <Flex
                                        height="100%"
                                        alignItems="center"
                                        justifyContent="center"
                                    >
                                        <Text color="gray.500" fontSize="lg">
                                            Script content area - {activeMode} mode
                                        </Text>
                                    </Flex>
                                )}
                            </Box>
                        )}
                    </Box>

                    {/* Right: Tool Toolbar - Single Column with Border */}
                    <Box
                        width="74px"
                        flexShrink={0}
                        border="1px solid"
                        borderColor="container.border"
                        borderRadius="md"
                        p="4"
                        bg={{ base: "gray.50", _dark: "gray.900" }}
                        alignSelf="flex-start"
                        maxHeight="100%"
                        overflowY="auto"
                        className="hide-scrollbar"
                    >
                        <VStack spacing={2}>
                            {toolButtons.map((tool) => (
                                <Tooltip
                                    key={tool.id}
                                    label={tool.description}
                                    placement="bottom-start"
                                    hasArrow
                                    bg="blue.500"
                                    color="white"
                                    fontSize="sm"
                                    px={3}
                                    py={2}
                                    borderRadius="md"
                                    openDelay={2000}
                                >
                                    <Button
                                        width="50px"
                                        height="50px"
                                        minWidth="50px"
                                        p={0}
                                        bg={tool.isActive && !tool.isDisabled ? "blue.500" : tool.isDisabled ? { base: "gray.200", _dark: "gray.800" } : { base: "gray.100", _dark: "gray.700" }}
                                        color={tool.isActive && !tool.isDisabled ? "white" : tool.isDisabled ? { base: "gray.400", _dark: "gray.600" } : { base: "gray.600", _dark: "gray.300" }}
                                        border="1px solid"
                                        borderColor={tool.isActive && !tool.isDisabled ? "blue.400" : "container.border"}
                                        borderRadius="md"
                                        _hover={tool.isDisabled ? {} : {
                                            bg: tool.isActive ? "orange.400" : "orange.500",
                                            color: "white",
                                            borderColor: "orange.300",
                                            transform: "scale(1.05)"
                                        }}
                                        _active={tool.isDisabled ? {} : {
                                            transform: "scale(0.95)"
                                        }}
                                        transition="all 0.2s"
                                        onClick={() => !tool.isDisabled && handleModeChange(tool.id)}
                                        isDisabled={tool.isDisabled}
                                        cursor={tool.isDisabled ? "not-allowed" : "pointer"}
                                        opacity={tool.isDisabled ? 0.4 : 1}
                                    >
                                        <AppIcon
                                            name={tool.icon}
                                            boxSize="24px"
                                        />
                                    </Button>
                                </Tooltip>
                            ))}
                        </VStack>
                    </Box>
                </Flex>
            </Flex>

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

            {/* Duplicate Script Modal */}
            <DuplicateScriptModal
                isOpen={isDuplicateModalOpen}
                onClose={() => setIsDuplicateModalOpen(false)}
                showId={script?.showID || ''}
                originalScriptName={script?.scriptName || ''}
                onScriptDuplicated={handleScriptDuplicated}
                onProcessingStart={handleProcessingStart}
                onError={handleDuplicationError}
            />

            {/* Processing Modal */}
            <ProcessingModal
                isOpen={isProcessingModalOpen}
                title="Duplicating Script"
                message="Creating a copy of your script. This may take a moment for large scripts..."
            />

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
        </ErrorBoundary>
    );
};