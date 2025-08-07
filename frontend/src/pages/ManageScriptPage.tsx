// frontend/src/pages/ManageScriptPage.tsx

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Spinner,
    Flex,
    Heading,
    Divider,
    Button,
    useBreakpointValue
} from "@chakra-ui/react";
import { useParams } from "react-router-dom";
import { useScript } from "../features/script/hooks/useScript";
import { useShow } from "../features/shows/hooks/useShow";
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AppIcon } from '../components/AppIcon';
import { ActionsMenu } from '../components/ActionsMenu';
import { useValidatedForm } from '../hooks/useValidatedForm';
import { ValidationRules, FormValidationConfig } from '../types/validation';
import { useEnhancedToast } from '../utils/toastUtils';
import { convertLocalToUTC } from '../utils/dateTimeUtils';
import { useUserPreferences, UserPreferences } from '../hooks/useUserPreferences';
import { useScriptElementsWithEditQueue } from '../features/script/hooks/useScriptElementsWithEditQueue';
import { EditQueueFormatter } from '../features/script/utils/editQueueFormatter';
import { EnableAutoSortOperation } from '../features/script/types/editQueue';
import { useModalState } from '../hooks/useModalState';
import { SaveConfirmationModal } from '../components/modals/SaveConfirmationModal';
import { SaveProcessingModal } from '../components/modals/SaveProcessingModal';
import { ScriptSharingService } from '../services/scriptSharingService';
import { useAuth } from '@clerk/clerk-react';

import { ScriptToolbar } from '../features/script/components/ScriptToolbar';
import { ViewMode, ViewModeRef } from '../features/script/components/modes/ViewMode';
import { EditMode, EditModeRef } from '../features/script/components/modes/EditMode';
import { useScriptModes, ScriptMode } from '../features/script/hooks/useScriptModes';
import { useElementActions } from '../features/script/hooks/useElementActions';
import { ScriptModals } from '../features/script/components/ScriptModals';
import { MobileScriptDrawer } from '../features/script/components/MobileScriptDrawer';
import { getToolbarButtons, ToolbarContext } from '../features/script/utils/toolbarConfig';
import { InfoMode } from '../features/script/components/modes/InfoMode';
import { PlayMode } from '../features/script/components/modes/PlayMode';
import { EditHistoryView } from '../components/EditHistoryView';

import { useElementModalActions } from '../features/script/hooks/useElementModalActions';
import { useScriptModalHandlers } from '../features/script/hooks/useScriptModalHandlers';
import { useScriptNavigation } from '../hooks/useScriptNavigation';
import { useScriptFormSync } from '../features/script/hooks/useScriptFormSync';
import { useShowCrew } from '../features/shows/hooks/useShowCrew';
import { createActionMenuConfig } from '../features/script/config/actionMenuConfig';

const MODAL_NAMES = {
    DELETE: 'delete',
    FINAL_DELETE: 'final_delete',
    DUPLICATE: 'duplicate',
    PROCESSING: 'processing',
    ADD_ELEMENT: 'add_element',
    EDIT_ELEMENT: 'edit_element',
    OPTIONS: 'options',
    DELETE_CUE: 'delete_cue',
    DUPLICATE_ELEMENT: 'duplicate_element',
    GROUP_ELEMENTS: 'group_elements',
    UNSAVED_CHANGES: 'unsaved_changes',
    FINAL_UNSAVED_CHANGES: 'final_unsaved_changes',
    CLEAR_HISTORY: 'clear_history',
    FINAL_CLEAR_HISTORY: 'final_clear_history',
    SAVE_CONFIRMATION: 'save_confirmation',
    FINAL_SAVE_CONFIRMATION: 'final_save_confirmation',
    SAVE_PROCESSING: 'save_processing',
    SHARE_CONFIRMATION: 'share_confirmation',
    HIDE_SCRIPT: 'hide_script',
    FINAL_HIDE_SCRIPT: 'final_hide_script'
} as const;

interface ManageScriptPageProps {
    isMenuOpen: boolean;
    onMenuClose: () => void;
}

interface ScriptFormData {
    script_name: string;
    script_status: string;
    start_time: string;
    end_time: string;
    script_notes: string;
}


const INITIAL_FORM_STATE: ScriptFormData = {
    script_name: '',
    script_status: 'DRAFT',
    start_time: '',
    end_time: '',
    script_notes: ''
};

const VALIDATION_CONFIG: FormValidationConfig = {
    script_name: {
        required: true,
        rules: [
            {
                validator: (value: string) => {
                    if (!value || value.trim().length === 0) {
                        return false; // Empty is invalid
                    }
                    return value.trim().length >= 4; // Must have 4+ chars if not empty
                },
                message: 'Script name is required and must be at least 4 characters',
                code: 'requiredMinLength'
            },
            ValidationRules.maxLength(100, 'Script name must be no more than 100 characters')
        ]
    },
    script_notes: {
        required: false,
        rules: [
            ValidationRules.maxLength(500, 'Notes must be no more than 500 characters')
        ]
    }
};


export const ManageScriptPage: React.FC<ManageScriptPageProps> = ({ isMenuOpen, onMenuClose }) => {
    const { scriptId } = useParams<{ scriptId: string }>();
    const { getToken } = useAuth();

    const viewModeRef = useRef<ViewModeRef>(null);
    const editModeRef = useRef<EditModeRef>(null);

    const isMobile = useBreakpointValue({ base: true, lg: false });

    const formConfig = {
        validationConfig: VALIDATION_CONFIG,
        validateOnChange: true,
        validateOnBlur: true,
        showFieldErrorsInToast: false
    };
    const form = useValidatedForm<ScriptFormData>(INITIAL_FORM_STATE, formConfig);

    const modalState = useModalState(Object.values(MODAL_NAMES));

    const { script, isLoading: isLoadingScript, error: scriptError } = useScript(scriptId);
    const { show } = useShow(script?.show_id);

    const editQueueHook = useScriptElementsWithEditQueue(scriptId);
    const {
        elements: editQueueElements,
        allElements: allEditQueueElements,
        pendingOperations,
        hasUnsavedChanges,
        revertToPoint,
        applyLocalChange,
        discardChanges,
        saveChanges,
        toggleGroupCollapse
    } = editQueueHook;

    const [previewPreferences, setPreviewPreferences] = useState<UserPreferences | null>(null);
    const {
        preferences: { darkMode, colorizeDepNames, showClockTimes, autoSortCues },
        updatePreference,
        updatePreferences
    } = useUserPreferences();

    // Calculate the current auto-sort state from edit queue operations
    const currentAutoSortState = useMemo(() => {
        let currentState = autoSortCues;
        for (const operation of pendingOperations) {
            if (operation.type === 'ENABLE_AUTO_SORT' || operation.type === 'DISABLE_AUTO_SORT') {
                currentState = (operation as any).new_preference_value;
            }
        }
        return currentState;
    }, [autoSortCues, pendingOperations]);

    // Use preview preferences when options modal is open, otherwise use saved preferences  
    const activePreferences = useMemo(() =>
        modalState.isOpen(MODAL_NAMES.OPTIONS) && previewPreferences
            ? previewPreferences
            : { darkMode, colorizeDepNames, showClockTimes, autoSortCues: currentAutoSortState }
        , [modalState, previewPreferences, darkMode, colorizeDepNames, showClockTimes, currentAutoSortState]);

    const { insertElement } = useElementActions(
        editQueueElements,
        activePreferences.autoSortCues,
        applyLocalChange
    );

    const { activeMode, setActiveMode } = useScriptModes('view');

    // Script form synchronization hook
    const { currentScript, hasChanges, handleInfoModeExit } = useScriptFormSync({
        script,
        pendingOperations,
        form,
        activeMode,
        applyLocalChange,
        setActiveMode
    });

    // Crew data for sharing
    const { crewMembers } = useShowCrew(currentScript?.show_id || '');

    // Function to capture Info mode changes without changing mode
    const captureInfoChanges = useCallback(() => {
        if (activeMode === 'info' && hasChanges && currentScript) {
            // Use the same logic as handleInfoModeExit but don't change mode
            const formChanges = {
                script_name: {
                    oldValue: currentScript.script_name,
                    newValue: form.formData.script_name
                },
                script_status: {
                    oldValue: currentScript.script_status,
                    newValue: form.formData.script_status
                },
                start_time: {
                    oldValue: currentScript.start_time,
                    newValue: convertLocalToUTC(form.formData.start_time)
                },
                end_time: {
                    oldValue: currentScript.end_time,
                    newValue: convertLocalToUTC(form.formData.end_time)
                },
                script_notes: {
                    oldValue: currentScript.script_notes || '',
                    newValue: form.formData.script_notes
                }
            };

            const actualChanges: any = {};
            for (const [field, values] of Object.entries(formChanges)) {
                if (values.oldValue !== values.newValue) {
                    actualChanges[field] = values;
                }
            }

            if (Object.keys(actualChanges).length > 0) {
                const infoFormOperation = {
                    type: 'UPDATE_SCRIPT_INFO' as const,
                    element_id: 'script-info',
                    changes: actualChanges
                };

                applyLocalChange(infoFormOperation);
            }
        }
    }, [activeMode, hasChanges, currentScript, form.formData, applyLocalChange]);

    // Navigation hook
    const navigation = useScriptNavigation({
        hasUnsavedChanges,
        script,
        scriptId,
        onUnsavedChangesDetected: (pendingPath: string) => {
            modalHandlers.setPendingNavigation(pendingPath);
            modalState.openModal(MODAL_NAMES.UNSAVED_CHANGES);
        }
    });

    // Modal handlers hook
    const modalHandlers = useScriptModalHandlers({
        scriptId,
        script,
        hasUnsavedChanges,
        saveChanges,
        discardChanges,
        modalState,
        modalNames: MODAL_NAMES,
        activeMode,
        hasInfoChanges: hasChanges,
        captureInfoChanges,
        onSaveSuccess: () => setActiveMode('view')
    });

    // Track EditMode's selection state reactively
    const [currentSelectedElementIds, setCurrentSelectedElementIds] = useState<string[]>([]);

    // Sharing state
    const [isSharing, setIsSharing] = useState(false);
    const [isHiding, setIsHiding] = useState(false);
    const [isScriptShared, setIsScriptShared] = useState(false);
    const [shareCount, setShareCount] = useState(0);

    // Element modal actions hook
    const elementActions = useElementModalActions({
        scriptId,
        editQueueElements,
        applyLocalChange,
        insertElement,
        modalState,
        modalNames: MODAL_NAMES,
        selectedElementIds: currentSelectedElementIds,
        clearSelection: () => {
            editModeRef.current?.clearSelection();
            setCurrentSelectedElementIds([]);
        },
        setSelectedElementIds: () => {
            // Delegate to EditMode's selection management
            if (editModeRef.current) {
                editModeRef.current.clearSelection();
                setCurrentSelectedElementIds([]);
                // If setting non-empty selection, would need EditMode method for that
            }
        }
    });

    // Scroll state for jump button ghosting
    const [scrollState, setScrollState] = useState<{
        isAtTop: boolean;
        isAtBottom: boolean;
        allElementsFitOnScreen: boolean;
    }>({
        isAtTop: true,
        isAtBottom: false,
        allElementsFitOnScreen: true
    });

    // Callback for child components to update scroll state
    const handleScrollStateChange = useCallback((newScrollState: {
        isAtTop: boolean;
        isAtBottom: boolean;
        allElementsFitOnScreen: boolean;
    }) => {
        setScrollState(newScrollState);
    }, []);

    // Get the selected element for toolbar context
    const selectedElement = useMemo(() => {
        if (elementActions.selectedElementIds.length === 1) {
            return editQueueElements.find(el => el.element_id === elementActions.selectedElementIds[0]);
        }
        return undefined;
    }, [editQueueElements, elementActions.selectedElementIds]);

    // Tool buttons configuration using extracted utility
    const toolbarContext = useMemo((): ToolbarContext => ({
        activeMode,
        scrollState,
        hasSelection: elementActions.selectedElementIds.length > 0,
        hasMultipleSelection: elementActions.selectedElementIds.length > 1,
        hasUnsavedChanges,
        pendingOperationsCount: pendingOperations.length,
        selectedElement,
        isScriptShared
    }), [activeMode, scrollState, elementActions.selectedElementIds.length, hasUnsavedChanges, pendingOperations.length, selectedElement, isScriptShared]);


    const toolButtons = useMemo(() => getToolbarButtons(toolbarContext), [toolbarContext]);

    // Clear selection when exiting edit mode
    useEffect(() => {
        if (activeMode !== 'edit') {
            elementActions.setSelectedElementIds([]);
        }
    }, [activeMode]); // Removed elementActions from dependencies to prevent infinite loop

    // Main mode change handler
    const handleModeChange = (modeId: string) => {
        // Handle EXIT button
        if (modeId === 'exit') {
            navigation.handleCancel();
            return;
        }

        // Handle SHARE button
        if (modeId === 'share') {
            modalState.openModal(MODAL_NAMES.SHARE_CONFIRMATION);
            return;
        }

        // Handle HIDE button
        if (modeId === 'hide') {
            modalState.openModal(MODAL_NAMES.HIDE_SCRIPT);
            return;
        }

        // Handle separators (do nothing)
        if (modeId === 'separator' || modeId === 'nav-separator') {
            return;
        }

        // Handle view state buttons
        if (modeId === 'view' || modeId === 'info' || modeId === 'edit' || modeId === 'history') {
            // Check if we're leaving Info mode with unsaved changes
            if (activeMode === 'info' && modeId !== 'info' && hasChanges) {
                handleInfoModeExit(modeId as ScriptMode);
                return;
            }
            
            setActiveMode(modeId as ScriptMode);
            return;
        }

        // Handle navigation buttons
        if (modeId === 'jump-top') {
            handleJump('top');
            return;
        }
        if (modeId === 'jump-bottom') {
            handleJump('bottom');
            return;
        }

        // Handle VIEW mode tools
        if (activeMode === 'view') {
            switch (modeId) {
                case 'play':
                    setActiveMode('play' as ScriptMode);
                    return;
                case 'share':
                    setActiveMode('share' as ScriptMode);
                    return;
            }
        }

        // Handle HISTORY mode tools
        if (activeMode === 'history') {
            switch (modeId) {
                case 'clear-history':
                    modalHandlers.handleClearHistory();
                    return;
            }
        }

        // Handle EDIT mode tools
        if (activeMode === 'edit') {
            switch (modeId) {
                case 'add-element':
                    modalState.openModal(MODAL_NAMES.ADD_ELEMENT);
                    return;
                case 'edit-element':
                    elementActions.handleElementEdit();
                    return;
                case 'duplicate-element':
                    elementActions.handleElementDuplicate();
                    return;
                case 'group-elements':
                    elementActions.handleElementGroup();
                    return;
                case 'ungroup-elements':
                    elementActions.handleElementUngroup();
                    return;
                case 'delete-element':
                    elementActions.handleElementDelete();
                    return;
            }
        }
    };

    const handleJump = (direction: 'top' | 'bottom') => {
        let scrollContainer: HTMLElement | null = null;

        if (activeMode === 'edit' || activeMode === 'view') {
            const hideScrollbarContainers = document.querySelectorAll('.hide-scrollbar');
            let maxScrollHeight = 0;
            for (const container of hideScrollbarContainers) {
                if (container instanceof HTMLElement && container.scrollHeight > container.clientHeight) {
                    if (container.scrollHeight > maxScrollHeight) {
                        maxScrollHeight = container.scrollHeight;
                        scrollContainer = container;
                    }
                }
            }
        } else {
            const mainContainer = document.querySelector('.edit-form-container');
            if (mainContainer instanceof HTMLElement) {
                scrollContainer = mainContainer;
            }
        }

        if (scrollContainer) {
            scrollContainer.scrollTop = direction === 'top' ? 0 : scrollContainer.scrollHeight;
        }
    };

    // Auto-sort functionality
    const { showSuccess, showError } = useEnhancedToast();
    
    const handleAutoSortElements = useCallback(async () => {
        if (!scriptId) return;

        try {
            const currentElements = [...editQueueElements];
            const sortedElements = [...currentElements].sort((a, b) => a.time_offset_ms - b.time_offset_ms);

            const needsReordering = currentElements.some((element, index) => {
                return element.element_id !== sortedElements[index]?.element_id;
            });

            if (!needsReordering) {
                showSuccess('Auto-Sort Complete', 'Elements are already in correct time order.');
                return;
            }

            const elementChanges: any[] = [];
            for (let newIndex = 0; newIndex < sortedElements.length; newIndex++) {
                const element = sortedElements[newIndex];
                const oldIndex = currentElements.findIndex(el => el.element_id === element.element_id);

                if (oldIndex !== newIndex) {
                    elementChanges.push({
                        element_id: element.element_id,
                        old_index: oldIndex,
                        new_index: newIndex,
                        old_sequence: oldIndex + 1,
                        new_sequence: newIndex + 1
                    });
                }
            }

            // Create the auto-sort operation with element changes for the initial sort
            applyLocalChange({
                type: 'ENABLE_AUTO_SORT',
                element_id: 'auto-sort-preference',
                old_preference_value: false,
                new_preference_value: true,
                element_moves: elementChanges
            } as Omit<EnableAutoSortOperation, 'id' | 'timestamp' | 'description'>);
            
            showSuccess('Elements Auto-Sorted', `Reordered ${elementChanges.length} elements by time offset. New elements will be automatically sorted.`);
        } catch (error) {
            showError(error instanceof Error ? error.message : 'Failed to enable auto-sort');
        }
    }, [scriptId, editQueueElements, applyLocalChange, showSuccess, showError]);

    const handleAutoSortToggle = useCallback(
        async (value: boolean) => {
            if (value && !activePreferences.autoSortCues && scriptId) {
                handleAutoSortElements();
            } else if (!value && activePreferences.autoSortCues) {
                // Disable auto-sort
                const disableOperation = {
                    type: 'DISABLE_AUTO_SORT' as const,
                    element_id: 'auto-sort-preference',
                    old_preference_value: true,
                    new_preference_value: false
                };
                applyLocalChange(disableOperation);
            }
            await updatePreference('autoSortCues', value);
        },
        [updatePreference, scriptId, activePreferences.autoSortCues, handleAutoSortElements, applyLocalChange, editQueueElements]
    );

    const handleAutoSortCheckboxChange = async (newAutoSortValue: boolean) => {
        // Use the same logic as handleAutoSortToggle
        await handleAutoSortToggle(newAutoSortValue);
    };

    const handleOptionsModalSave = async (newPreferences: UserPreferences) => {
        await updatePreferences(newPreferences);
        setPreviewPreferences(null);
    };

    // Load initial sharing status
    useEffect(() => {
        const loadSharingStatus = async () => {
            if (!scriptId) return;
            
            try {
                const token = await getToken();
                if (!token) return;
                
                const status = await ScriptSharingService.getSharingStatus(scriptId, token);
                setIsScriptShared(status.isShared);
                setShareCount(status.shareCount);
            } catch (error) {
                // Silently handle sharing status errors
            }
        };
        
        loadSharingStatus();
    }, [scriptId, getToken]);

    // Sharing handlers
    const handleShareConfirm = async () => {
        if (!scriptId) return;
        
        setIsSharing(true);
        try {
            const token = await getToken();
            if (!token) throw new Error('Authentication required');
            
            await ScriptSharingService.shareWithAllCrew(scriptId, token);
            modalState.closeModal(MODAL_NAMES.SHARE_CONFIRMATION);
            setIsScriptShared(true);
            setActiveMode('view' as ScriptMode); // Return to view mode to show HIDE button
            showSuccess('Script Shared', 'Script has been shared with all crew members');
        } catch (error) {
            showError('Failed to enable script sharing', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsSharing(false);
        }
    };

    const handleInitialHideConfirm = useCallback(() => {
        modalState.closeModal(MODAL_NAMES.HIDE_SCRIPT);
        modalState.openModal(MODAL_NAMES.FINAL_HIDE_SCRIPT);
    }, [modalState]);

    const handleFinalHideConfirm = useCallback(async () => {
        if (!scriptId) return;
        
        setIsHiding(true);
        try {
            const token = await getToken();
            if (!token) throw new Error('Authentication required');
            
            await ScriptSharingService.hideFromAllCrew(scriptId, token);
            modalState.closeModal(MODAL_NAMES.FINAL_HIDE_SCRIPT);
            setIsScriptShared(false);
            setShareCount(0);
            setActiveMode('view' as ScriptMode); // Return to view mode to show SHARE button
            showSuccess('Script Hidden', 'Script has been hidden from all crew members');
        } catch (error) {
            showError('Failed to disable script sharing', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsHiding(false);
        }
    }, [scriptId, getToken, modalState, setActiveMode, showSuccess, showError]);

    const handleHideCancel = useCallback(() => {
        modalState.closeModal(MODAL_NAMES.HIDE_SCRIPT);
        modalState.closeModal(MODAL_NAMES.FINAL_HIDE_SCRIPT);
    }, [modalState]);

    // Configure actions menu using extracted config
    const actions = createActionMenuConfig({
        onOptionsClick: () => modalState.openModal(MODAL_NAMES.OPTIONS),
        onDuplicateClick: () => modalState.openModal(MODAL_NAMES.DUPLICATE),
        onDeleteClick: modalHandlers.handleDeleteClick
    });

    // Calculate total changes count including Info mode changes
    const totalChangesCount = useMemo(() => {
        let count = pendingOperations.length;
        if (activeMode === 'info' && hasChanges) {
            count += 1;
        }
        return count;
    }, [pendingOperations.length, activeMode, hasChanges]);

    return (
        <ErrorBoundary context="Script Management Page">
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
                            {show?.show_name && currentScript?.script_name ? `${show.show_name} > ${currentScript.script_name}` : currentScript?.script_name || 'Script'}
                        </Heading>
                    </HStack>

                    {/* Right: Action Buttons positioned to align with scroll area */}
                    <Box flex={1} position="relative">
                        <Box
                            position="absolute"
                            right={isMobile ? "16px" : "197px"}
                            top="50%"
                            transform="translateY(-50%)"
                            zIndex={100}
                        >
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
                                    onClick={navigation.handleCancel}
                                    _hover={{ bg: 'gray.100' }}
                                    _dark={{ _hover: { bg: 'gray.700' } }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="xs"
                                    bg="blue.400"
                                    color="white"
                                    onClick={modalHandlers.handleShowSaveConfirmation}
                                    isDisabled={(!hasChanges && !hasUnsavedChanges) || !form.isValid}
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
                        bg="window.background"
                        borderRadius="md"
                        mr={isMobile ? "0" : "8"}
                        position="relative"
                        overflow="hidden"
                        display="flex"
                        flexDirection="column"
                        border="1px solid"
                        borderColor="container.border"
                        width={isMobile ? "100%" : "calc(100% - 106px)"} // Full width on mobile, account for toolbar on desktop
                        zIndex={1}
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
                                overflowY="auto"
                                className="hide-scrollbar edit-form-container"
                                minHeight={0}
                                maxHeight="100%"
                            >
                                {/* Render active mode component */}
                                {activeMode === 'info' && <InfoMode form={form} />}
                                {activeMode === 'view' && (
                                    <ViewMode ref={viewModeRef} scriptId={scriptId || ''} colorizeDepNames={activePreferences.colorizeDepNames} showClockTimes={activePreferences.showClockTimes} autoSortCues={activePreferences.autoSortCues} onScrollStateChange={handleScrollStateChange} elements={editQueueElements} allElements={allEditQueueElements} script={script} onToggleGroupCollapse={toggleGroupCollapse} />
                                )}
                                {activeMode === 'edit' && (
                                    <EditMode
                                        ref={editModeRef}
                                        scriptId={scriptId || ''}
                                        colorizeDepNames={activePreferences.colorizeDepNames}
                                        showClockTimes={activePreferences.showClockTimes}
                                        autoSortCues={activePreferences.autoSortCues}
                                        onAutoSortChange={handleAutoSortToggle}
                                        onScrollStateChange={handleScrollStateChange}
                                        onSelectionChange={setCurrentSelectedElementIds}
                                        onToggleGroupCollapse={toggleGroupCollapse}
                                        elements={editQueueElements}
                                        allElements={allEditQueueElements}
                                        script={currentScript}
                                        onApplyLocalChange={applyLocalChange}
                                    />
                                )}
                                {activeMode === 'play' && <PlayMode />}
                                {activeMode === 'history' && <EditHistoryView operations={pendingOperations} allElements={allEditQueueElements} summary={EditQueueFormatter.formatOperationsSummary(pendingOperations)} onRevertToPoint={revertToPoint} onRevertSuccess={() => setActiveMode('edit')} />}
                            </Box>
                        )}
                    </Box>

                    {/* Right: Tool Toolbar - Single Column with Border - Hidden on Mobile */}
                    {!isMobile && (
                        <Box
                            width="165px"
                            flexShrink={0}
                            border="1px solid"
                            borderColor="container.border"
                            borderRadius="md"
                            p="4"
                            bg="gray.50"
                            _dark={{ bg: "gray.900" }}
                            alignSelf="flex-start"
                            maxHeight="100%"
                            overflowY="auto"
                            className="hide-scrollbar"
                        >
                            <ScriptToolbar
                                toolButtons={toolButtons}
                                onModeChange={handleModeChange}
                                activeMode={activeMode}
                            />
                        </Box>
                    )}
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

            {/* All Script Modals - Consolidated */}
            <ScriptModals
                modalState={modalState}
                modalNames={MODAL_NAMES}
                script={script}
                scriptId={scriptId || ''}
                selectedElement={elementActions.selectedElement}
                selectedElementIds={elementActions.selectedElementIds}
                selectedElementName={elementActions.selectedElementName}
                selectedElementTimeOffset={elementActions.selectedElementTimeOffset}
                pendingOperations={pendingOperations}
                isDeleting={modalHandlers.isDeleting}
                isDeletingCue={elementActions.isDeletingCue}
                isDuplicatingElement={elementActions.isDuplicatingElement}
                darkMode={activePreferences.darkMode}
                colorizeDepNames={activePreferences.colorizeDepNames}
                showClockTimes={activePreferences.showClockTimes}
                autoSortCues={activePreferences.autoSortCues}
                onDeleteCancel={modalHandlers.handleDeleteCancel}
                onInitialDeleteConfirm={modalHandlers.handleInitialDeleteConfirm}
                onFinalDeleteConfirm={modalHandlers.handleFinalDeleteConfirm}
                onClearHistoryCancel={modalHandlers.handleClearHistoryCancel}
                onInitialClearHistoryConfirm={modalHandlers.handleInitialClearHistoryConfirm}
                onFinalClearHistoryConfirm={modalHandlers.handleFinalClearHistoryConfirm}
                onDuplicateClose={() => modalState.closeModal(MODAL_NAMES.DUPLICATE)}
                onDuplicateConfirm={() => {
                    modalState.closeModal(MODAL_NAMES.DUPLICATE);
                }}
                onElementCreated={elementActions.handleElementCreated}
                onOptionsPreview={(preferences) => setPreviewPreferences(preferences)}
                onOptionsSave={handleOptionsModalSave}
                onAutoSortChange={handleAutoSortCheckboxChange}
                onColorizeChange={async (value: boolean) => await updatePreference('colorizeDepNames', value)}
                onClockTimesChange={async (value: boolean) => await updatePreference('showClockTimes', value)}
                onConfirmDeleteCue={elementActions.handleConfirmDeleteCue}
                onConfirmDuplicate={elementActions.handleConfirmDuplicate}
                onConfirmGroupElements={elementActions.handleConfirmGroupElements}
                onUnsavedChangesCancel={modalHandlers.handleUnsavedChangesCancel}
                onInitialUnsavedConfirm={modalHandlers.handleInitialUnsavedConfirm}
                onAbandonChangesConfirm={modalHandlers.handleAbandonChangesConfirm}
                onFinalSaveConfirm={modalHandlers.handleFinalSaveConfirm}
                onSaveCancel={modalHandlers.handleSaveCancel}
                onElementEdit={elementActions.handleElementEditSave}
                scriptName={currentScript?.script_name || 'Script'}
                crewCount={Array.from(new Map(crewMembers.map(member => [member.user_id, member])).values()).length}
                shareCount={shareCount}
                isSharing={isSharing}
                isHiding={isHiding}
                onShareConfirm={handleShareConfirm}
                onInitialHideConfirm={handleInitialHideConfirm}
                onFinalHideConfirm={handleFinalHideConfirm}
                onHideCancel={handleHideCancel}
            />

            {/* Save Confirmation Modal */}
            <SaveConfirmationModal
                isOpen={modalState.isOpen(MODAL_NAMES.SAVE_CONFIRMATION)}
                onClose={modalHandlers.handleSaveCancel}
                onConfirm={modalHandlers.handleInitialSaveConfirm}
                changesCount={totalChangesCount}
            />

            {/* Save Processing Modal */}
            <SaveProcessingModal
                isOpen={modalState.isOpen(MODAL_NAMES.SAVE_PROCESSING)}
                changesCount={pendingOperations.length}
            />

            {/* Mobile Drawer Menu */}
            <MobileScriptDrawer
                isOpen={isMenuOpen}
                onClose={onMenuClose}
                activeMode={activeMode}
                toolButtons={toolButtons}
                onModeChange={handleModeChange}
            />
        </ErrorBoundary>
    );
};