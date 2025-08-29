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
    Badge,
    useBreakpointValue,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalBody
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { useScript } from "../features/script/hooks/useScript";
import { useShow } from "../features/shows/hooks/useShow";
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AppIcon } from '../components/AppIcon';
import { ActionsMenu } from '../components/ActionsMenu';
import { useValidatedFormSchema } from '../components/forms/ValidatedForm';
import { useEnhancedToast } from '../utils/toastUtils';
import { convertLocalToUTC } from '../utils/timeUtils';
import { useUserPreferences, UserPreferences } from '../hooks/useUserPreferences';
import { useScriptElementsWithEditQueue } from '../features/script/hooks/useScriptElementsWithEditQueue';
import { useScriptSync } from '../hooks/useScriptSync';
import { useScriptSyncContext } from '../contexts/ScriptSyncContext';
import { saveScript } from '../utils/saveScript';
import { EditQueueFormatter } from '../features/script/utils/editQueueFormatter';
import { useModalState } from '../hooks/useModalState';
import { SaveConfirmationModal } from '../components/modals/SaveConfirmationModal';
import { SaveProcessingModal } from '../components/modals/SaveProcessingModal';
import { useAuth } from '@clerk/clerk-react';

import { ScriptToolbar } from '../features/script/components/ScriptToolbar';
import { useAutoSave } from '../hooks/useAutoSave';
import { ViewMode, ViewModeRef } from '../features/script/components/modes/ViewMode';
import { EditMode, EditModeRef } from '../features/script/components/modes/EditMode';
import { useScriptModes, ScriptMode } from '../features/script/hooks/useScriptModes';
import { useElementActions } from '../features/script/hooks/useElementActions';
import { ScriptModals } from '../features/script/components/ScriptModals';
import { FilterDepartmentsModal } from '../features/script/components/modals/FilterDepartmentsModal';
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
import { FloatingValidationErrorPanel } from '../components/base/FloatingValidationErrorPanel';
import { exportScriptAsCSV } from '../features/script/export/utils/csvExporter';

const MODAL_NAMES = {
    DELETE: 'delete',
    FINAL_DELETE: 'final_delete',
    DUPLICATE: 'duplicate',
    PROCESSING: 'processing',
    ADD_ELEMENT: 'add_element',
    EDIT_CUE: 'edit_cue',
    EDIT_GROUP: 'edit_group',
    OPTIONS: 'options',
    FILTER_DEPARTMENTS: 'filter_departments',
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



// Create a wrapper component that isolates the auth hook
const ManageScriptPageInner: React.FC<ManageScriptPageProps & { getToken: () => Promise<string | null> }> = ({ 
    isMenuOpen, 
    onMenuClose, 
    getToken 
}) => {
    const { scriptId } = useParams<{ scriptId: string }>();
    const { showSuccess, showError } = useEnhancedToast();
    // Removed shouldRotateAuth state - now using direct function calls

    const viewModeRef = useRef<ViewModeRef>(null);
    const editModeRef = useRef<EditModeRef>(null);

    const isMobile = useBreakpointValue({ base: true, lg: false });

    const form = useValidatedFormSchema<ScriptFormData>(
        INITIAL_FORM_STATE,
        'scriptElement',
        'scriptInfo',
        undefined,
        {
            validateOnBlur: true,
            showFieldErrorsInToast: false
        }
    );

    const modalState = useModalState(Object.values(MODAL_NAMES));

    // Coordinated script data fetching - single source of truth
    const { script: sourceScript, isLoading: isLoadingScript, error: scriptError, refetchScript } = useScript(scriptId);
    const { show } = useShow(sourceScript?.show_id);

    // Coordinated data refresh function will be defined after editQueueHook

    // Moved this hook call after preferences are defined

    // Ref to hold the actual rotation function from the icon
    const triggerRotationRef = useRef<(() => void) | null>(null);
    
    // Function to trigger rotation
    const triggerRotation = useCallback(() => {
        triggerRotationRef.current?.();
    }, []);

    // Real-time sync for collaborative editing
    const scriptSyncOptions = useMemo(() => {
        return {
            onConnect: () => { },
            onDisconnect: () => { },
            onDataReceived: () => {
                triggerRotation(); // Trigger rotation for ping/pong
            }
        };
    }, [triggerRotation]);

    // Real-time sync for collaborative editing - RESTORED
    const { 
        isConnected: isSyncConnected, 
        isConnecting: isSyncConnecting, 
        connectionCount: syncConnectionCount, 
        connectionError: syncConnectionError, 
        sendUpdate: sendSyncUpdate 
    } = useScriptSync(
        scriptId || '',
        undefined, // shareToken
        scriptSyncOptions
    );

    // Update sync context for header display - FIXED FOR RENDER LOOP
    const { setSyncData } = useScriptSyncContext();
    
    // Memoize sync data to prevent unnecessary context updates
    const syncData = useMemo(() => {
        if (!scriptId) return null;
        
        return {
            isConnected: isSyncConnected,
            isConnecting: isSyncConnecting,
            connectionCount: syncConnectionCount,
            connectionError: syncConnectionError,
            userType: 'stage_manager' as const,
            triggerRotation: triggerRotationRef
        };
    }, [scriptId, isSyncConnected, isSyncConnecting, syncConnectionCount, syncConnectionError, triggerRotationRef]);
    
    useEffect(() => {
        setSyncData(syncData);
        
        // Cleanup when component unmounts
        return () => setSyncData(null);
    }, [syncData, setSyncData]);

    // applyLocalChangeWithSync will be defined after editQueueHook

    const [previewPreferences, setPreviewPreferences] = useState<UserPreferences | null>(null);
    const [buttonShowsOpen, setButtonShowsOpen] = useState<boolean>(true);
    const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({});

    // handleToggleAllGroups will be defined after editQueueHook

    const {
        preferences: { darkMode, colorizeDepNames, showClockTimes, autoSortCues, useMilitaryTime, dangerMode, autoSaveInterval },
        updatePreference,
        updatePreferences
    } = useUserPreferences();

    // Memoize elements array to prevent unnecessary re-renders
    // Use sourceScript object reference as dependency
    const elementsToPass = useMemo(() => 
        (sourceScript as any)?.elements || [], 
        [sourceScript]
    );
    
    // Debug logging moved to top of component
    
    // Track if arrays are changing references
    const elementsRef = useRef<any[]>([]);
    if (elementsRef.current !== elementsToPass) {
        elementsRef.current = elementsToPass;
    }
    

    // Always call hooks (React requirement), but conditionally process data
    const dataReady = sourceScript && !isLoadingScript;
    
    // Memoize options to prevent recreating on every render
    const editQueueOptions = useMemo(() => ({ 
        autoSortCues,
        sendSyncUpdate: sendSyncUpdate
    }), [autoSortCues, sendSyncUpdate]);

    const editQueueHook = useScriptElementsWithEditQueue(scriptId, elementsToPass, editQueueOptions);
    const {
        elements: editQueueElements,
        allElements: allEditQueueElements,
        pendingOperations,
        hasUnsavedChanges,
        revertToPoint,
        applyLocalChange,
        discardChanges,
        updateServerElements,
        saveChanges: _hookSaveChanges,
        toggleGroupCollapse,
        expandAllGroups,
        collapseAllGroups,
    } = editQueueHook;

    // Unified save function that both auto-save and manual save use
    const saveChanges = useCallback(async (): Promise<boolean> => {        
        if (!scriptId || pendingOperations.length === 0) {
            return true;
        }

        const result = await saveScript({
            scriptId,
            operations: pendingOperations,
            getToken,
            onSuccess: (freshData) => {
                console.log('🔄 SAVE SUCCESS - about to discard changes');
                console.log('🔄 SAVE SUCCESS - current editQueueElements count:', editQueueElements?.length);
                console.log('🔄 SAVE SUCCESS - freshData elements count:', freshData?.elements?.length);
                
                // CRITICAL FIX: Clear queue FIRST, then update with fresh data
                console.log('🔄 SAVE SUCCESS - clearing edit queue first');
                discardChanges();
                
                console.log('🔄 SAVE SUCCESS - updating with fresh data from backend');
                updateServerElements(freshData.elements || []);
                
                console.log('🔄 SAVE SUCCESS - refresh complete using fresh backend data');
            },
            onError: (error) => {
                console.error("Save error:", error);
            }
        });
        
        return result;
    }, [scriptId, pendingOperations, getToken, refetchScript, discardChanges]);

    const handleToggleAllGroups = useCallback(() => {
        if (!allEditQueueElements) return;

        // Use the new batch operations that will be saved to the edit queue
        if (buttonShowsOpen) {
            // Button shows "Open All" so we want to expand all groups
            expandAllGroups();
        } else {
            // Button shows "Close All" so we want to collapse all groups  
            collapseAllGroups();
        }

        // Update the button state to reflect the new state
        setButtonShowsOpen(!buttonShowsOpen);

        // Clear group overrides since we're now using the edit queue
        setGroupOverrides({});
    }, [allEditQueueElements, buttonShowsOpen, expandAllGroups, collapseAllGroups]);

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
    const activePreferences = useMemo(() => {
        const result = modalState.isOpen(MODAL_NAMES.OPTIONS) && previewPreferences
            ? previewPreferences
            : { darkMode, colorizeDepNames, showClockTimes, autoSortCues: currentAutoSortState, useMilitaryTime, dangerMode, autoSaveInterval };


        return result;
    }, [modalState, previewPreferences, darkMode, colorizeDepNames, showClockTimes, currentAutoSortState, useMilitaryTime, dangerMode, autoSaveInterval]);

    const { insertElement } = useElementActions(
        editQueueElements,
        activePreferences.autoSortCues,
        applyLocalChange  // Use regular applyLocalChange - no immediate websocket broadcast
    );

    const { activeMode, setActiveMode } = useScriptModes('view');

    // Script form synchronization hook - FIXED
    const { currentScript, hasChanges, handleInfoModeExit, clearPendingChanges } = useScriptFormSync({
        sourceScript,
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
                    old_value: currentScript.script_name,
                    new_value: form.formData.script_name
                },
                script_status: {
                    old_value: currentScript.script_status,
                    new_value: form.formData.script_status
                },
                start_time: {
                    old_value: currentScript.start_time,
                    new_value: convertLocalToUTC(form.formData.start_time)
                },
                end_time: {
                    old_value: currentScript.end_time,
                    new_value: (form.formData.end_time && form.formData.end_time.trim()) ? convertLocalToUTC(form.formData.end_time) : currentScript.end_time
                },
                script_notes: {
                    old_value: currentScript.script_notes || '',
                    new_value: form.formData.script_notes
                }
            };

            const actualChanges: any = {};
            for (const [field, values] of Object.entries(formChanges)) {
                if (values.old_value !== values.new_value) {
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
        script: sourceScript,
        scriptId,
        onUnsavedChangesDetected: (pendingPath: string) => {
            if (activePreferences.dangerMode) {
                // In danger mode, navigate directly without confirmation
                navigate(pendingPath, {
                    state: {
                        view: 'shows',
                        selectedShowId: sourceScript?.show_id,
                        selectedScriptId: scriptId,
                        returnFromManage: true
                    }
                });
            } else {
                modalHandlers.setPendingNavigation(pendingPath);
                modalState.openModal(MODAL_NAMES.UNSAVED_CHANGES);
            }
        }
    });

    // Memoize modal handlers config to prevent re-renders
    const modalHandlersConfig = useMemo(() => ({
        scriptId,
        script: sourceScript,
        hasUnsavedChanges,
        saveChanges,
        discardChanges,
        modalState,
        modalNames: MODAL_NAMES,
        activeMode,
        hasInfoChanges: hasChanges,
        captureInfoChanges,
        onSaveSuccess: () => {
            // Clear pending changes in info mode to prevent duplicate operations
            clearPendingChanges();
            setActiveMode('view');
        },
        sendSyncUpdate: (message: any) => {
            sendSyncUpdate(message);
            // Trigger websocket icon rotation for successful user transmission
            triggerRotation();
        },
        pendingOperations: pendingOperations,
        dangerMode: activePreferences.dangerMode
    }), [
        scriptId,
        sourceScript,
        hasUnsavedChanges,
        saveChanges,
        discardChanges,
        modalState,
        activeMode,
        hasChanges,
        captureInfoChanges,
        clearPendingChanges,
        setActiveMode,
        sendSyncUpdate,
        triggerRotation,
        pendingOperations,
        activePreferences.dangerMode
    ]);

    // Modal handlers hook
    const modalHandlers = useScriptModalHandlers(modalHandlersConfig);

    // Track EditMode's selection state reactively
    const [currentSelectedElementIds, setCurrentSelectedElementIds] = useState<string[]>([]);
    
    // Wrapper function to log selection changes
    const handleSelectionChange = useCallback((newSelectedIds: string[]) => {
        
        setCurrentSelectedElementIds(newSelectedIds);
    }, []);

    // Sharing state
    const [isSharing, setIsSharing] = useState(false);
    const [isHiding, setIsHiding] = useState(false);
    const [isScriptShared, setIsScriptShared] = useState(false);
    const [shareCount, setShareCount] = useState(0);

    // Department filtering state
    const [filteredDepartmentIds, setFilteredDepartmentIds] = useState<string[]>([]);
    const [hasUserSetFilter, setHasUserSetFilter] = useState(false);

    // Navigation
    const navigate = useNavigate();

    // Auto-save functionality - OPTIMIZED to prevent render loops
    const { isAutoSaving, secondsUntilNextSave, showSaveSuccess, isPaused, togglePause } = useAutoSave({
        autoSaveInterval: activePreferences.autoSaveInterval,
        hasUnsavedChanges,
        pendingOperations,
        saveChanges,
    });

    // Track what values are changing between renders - EXPANDED TRACKING
    const currentValues = {
        sourceScript: !!sourceScript,
        isLoadingScript,
        elementsLength: elementsToPass.length,
        autoSortCues,
        scriptId,
        activeMode,
        isSyncConnected,
        // Add more potential render triggers
        hasUnsavedChanges,
        pendingOperationsLength: pendingOperations.length,
        isAutoSaving,
        secondsUntilNextSave,
        showSaveSuccess,
        isPaused,
        hasChanges,
        currentScriptExists: !!currentScript,
        crewMembersLength: crewMembers.length
    };
    
    const prevValues = useRef<typeof currentValues>(currentValues);
    
    
    prevValues.current = currentValues;

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

    const toolbarContext = useMemo((): ToolbarContext => ({
        activeMode,
        scrollState,
        hasSelection: elementActions.selectedElementIds.length > 0,
        hasMultipleSelection: elementActions.selectedElementIds.length > 1,
        hasUnsavedChanges,
        pendingOperationsCount: pendingOperations.length,
        selectedElement,
        isScriptShared,
        groupsOpenToggle: buttonShowsOpen
    }), [activeMode, scrollState, elementActions.selectedElementIds.length, hasUnsavedChanges, pendingOperations.length, selectedElement, isScriptShared, buttonShowsOpen]);

    const toolButtons = useMemo(() => getToolbarButtons(toolbarContext), [toolbarContext]);

    // Clear selection when exiting edit mode
    useEffect(() => {
        if (activeMode !== 'edit') {
            editModeRef.current?.clearSelection();
            setCurrentSelectedElementIds([]);
        }
    }, [activeMode]);

    // Main mode change handler
    const handleModeChange = (modeId: string) => {
        // Handle TOGGLE ALL GROUPS button
        if (modeId === 'toggle-all-groups') {
            handleToggleAllGroups();
            return;
        }

        // Handle EXIT button
        if (modeId === 'exit') {
            navigation.handleCancel();
            return;
        }

        // Handle SHARE button
        if (modeId === 'share') {
            if (activePreferences.dangerMode) {
                handleShareConfirm();
            } else {
                modalState.openModal(MODAL_NAMES.SHARE_CONFIRMATION);
            }
            return;
        }

        // Handle HIDE button
        if (modeId === 'hide') {
            if (activePreferences.dangerMode) {
                handleFinalHideConfirm();
            } else {
                modalState.openModal(MODAL_NAMES.HIDE_SCRIPT);
            }
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
                    // Clear any selected elements before opening add modal
                    editModeRef.current?.clearSelection();
                    setCurrentSelectedElementIds([]);
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

    const handleAutoSortElements = useCallback(async () => {
        if (!scriptId) return;

        try {
            const currentElements = [...editQueueElements];
            const sortedElements = [...currentElements].sort((a, b) => a.offset_ms - b.offset_ms);

            const needsReordering = currentElements.some((element, index) => {
                return element.element_id !== sortedElements[index]?.element_id;
            });

            if (!needsReordering) {
                showSuccess('Auto-Sort Complete', 'Elements are already in correct time order.');
                return;
            }

            // Create resequenced elements array for the new format
            const resequencedElements = sortedElements.map((element, index) => ({
                element_id: element.element_id,
                old_sequence: element.sequence,
                new_sequence: index + 1
            }));

            const enableOperation = {
                type: 'ENABLE_AUTO_SORT' as const,
                element_id: 'auto-sort-preference',
                old_preference_value: false,
                new_preference_value: true,
                element_moves: resequencedElements,
                resequenced_elements: resequencedElements, // Keep both for backend compatibility
                total_elements: currentElements.length
            };

            applyLocalChange(enableOperation);

            showSuccess('Elements Auto-Sorted', `Reordered ${resequencedElements.length} elements by time offset. New elements will be automatically sorted.`);
        } catch (error) {
            showError(error instanceof Error ? error.message : 'Failed to enable auto-sort');
        }
    }, [scriptId, editQueueElements, applyLocalChange, showSuccess, showError]);

    // Checkpoint revert functionality

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
                // Script sharing status is now determined by the script.is_shared flag
                // which is already loaded in currentScript
                if (currentScript) {
                    setIsScriptShared(currentScript.is_shared || false);
                    // Share count is no longer tracked at script level
                    setShareCount(0);
                }
            } catch (error) {
                // Silently handle sharing status errors
            }
        };

        loadSharingStatus();
    }, [scriptId, currentScript, getToken]);

    // Sharing handlers
    const handleShareConfirm = async () => {
        if (!scriptId) return;

        setIsSharing(true);
        try {
            const token = await getToken();
            if (!token) throw new Error('Authentication required');

            // Update script to set is_shared = true
            const response = await fetch(`/api/scripts/${scriptId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_shared: true }),
            });

            if (!response.ok) {
                throw new Error('Failed to update script sharing status');
            }
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

            // Update script to set is_shared = false
            const response = await fetch(`/api/scripts/${scriptId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_shared: false }),
            });

            if (!response.ok) {
                throw new Error('Failed to update script sharing status');
            }
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

    // Export handler
    const handleExportScript = async () => {
        if (!scriptId || !sourceScript) return;

        try {
            const token = await getToken();
            if (!token) {
                throw new Error('Authentication token not available');
            }

            await exportScriptAsCSV(scriptId, token);
            showSuccess('Export Complete', `Script "${sourceScript.script_name}" exported successfully`);
        } catch (error) {
            console.error('Export failed:', error);
            showError('Export Failed', {
                description: error instanceof Error ? error.message : 'Failed to export script'
            });
        }
    };

    // Handle department filter application
    // Handle department filter application
    const handleApplyDepartmentFilter = useCallback((selectedDepartmentIds: string[]) => {
        setFilteredDepartmentIds(selectedDepartmentIds);
        setHasUserSetFilter(true);
    }, []);

    // Create filtered elements based on department selection
    const filteredEditQueueElements = useMemo(() => {

        if (filteredDepartmentIds.length === 0) {
            // If no departments selected, show only NOTEs and GROUPs
            return editQueueElements?.filter(element =>
                element.element_type === 'NOTE' || element.element_type === 'GROUP'
            ) || [];
        }

        const filtered = editQueueElements?.filter(element => {
            // Always show NOTEs and GROUPs regardless of department filter
            if (element.element_type === 'NOTE' || element.element_type === 'GROUP') {
                return true;
            }

            // Show elements that belong to selected departments
            return element.department_id && filteredDepartmentIds.includes(element.department_id);
        }) || [];

        return filtered;
    }, [editQueueElements, filteredDepartmentIds, editQueueElements?.map(el => el.sequence).join(',')]);

    const filteredAllEditQueueElements = useMemo(() => {
        if (filteredDepartmentIds.length === 0) {
            // If no departments selected, show only NOTEs and GROUPs
            return allEditQueueElements?.filter(element =>
                element.element_type === 'NOTE' || element.element_type === 'GROUP'
            ) || [];
        }

        return allEditQueueElements?.filter(element => {
            // Always show NOTEs and GROUPs regardless of department filter
            if (element.element_type === 'NOTE' || element.element_type === 'GROUP') {
                return true;
            }

            // Show elements that belong to selected departments
            return element.department_id && filteredDepartmentIds.includes(element.department_id);
        }) || [];
    }, [allEditQueueElements, filteredDepartmentIds, allEditQueueElements?.map(el => el.sequence).join(',')]);

    // Initialize department filter with all departments when elements first load (only if user hasn't set a filter)
    useEffect(() => {
        if (allEditQueueElements && filteredDepartmentIds.length === 0 && !hasUserSetFilter) {
            const allDepartmentIds = Array.from(new Set(
                allEditQueueElements
                    .filter(el => el.department_id && el.element_type !== 'NOTE' && el.element_type !== 'GROUP')
                    .map(el => el.department_id!)
            ));
            setFilteredDepartmentIds(allDepartmentIds);
        }
    }, [allEditQueueElements, filteredDepartmentIds.length, hasUserSetFilter]);

    // Configure actions menu using extracted config
    const actions = createActionMenuConfig({
        onOptionsClick: () => modalState.openModal(MODAL_NAMES.OPTIONS),
        onFilterDepartmentsClick: () => modalState.openModal(MODAL_NAMES.FILTER_DEPARTMENTS),
        onDuplicateClick: () => modalState.openModal(MODAL_NAMES.DUPLICATE),
        onExportClick: handleExportScript,
        onDeleteClick: modalHandlers.handleDeleteClick
    });

    // Calculate total changes count from actual pending operations
    const totalChangesCount = useMemo(() => {
        return pendingOperations.length;
    }, [pendingOperations.length]);

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
                        <HStack spacing={3} align="center">
                            {show?.show_name && (
                                <>
                                    <Heading as="h2" size="md">{show.show_name}</Heading>
                                    <AppIcon name="arrow-right" boxSize="16px" color="white" />
                                </>
                            )}
                            <Heading as="h2" size="md">{currentScript?.script_name || 'Script'}</Heading>
                            {(currentScript?.is_shared || isScriptShared) && (
                                <Badge variant="solid" colorScheme="green" fontSize="sm" ml={1} px={2}>
                                    SHARED
                                </Badge>
                            )}
                            {activePreferences.autoSaveInterval > 0 && (
                                <Badge
                                    variant="solid"
                                    colorScheme={showSaveSuccess ? "blue" : (isAutoSaving ? "blue" : isPaused ? "gray" : "red")}
                                    bg={showSaveSuccess ? "blue.500" : undefined}
                                    fontSize="sm"
                                    ml={1}
                                    px={2}
                                    cursor="pointer"
                                    onClick={togglePause}
                                    _hover={{
                                        bg: isPaused ? "gray.600" : "red.600"
                                    }}
                                    transition="background-color 0.2s"
                                    userSelect="none"
                                >
                                    {isAutoSaving
                                        ? "SAVING..."
                                        : isPaused 
                                            ? "AUTO SAVE • PAUSED"
                                            : `AUTO SAVE • ${hasUnsavedChanges && secondsUntilNextSave > 0 ? secondsUntilNextSave : activePreferences.autoSaveInterval}`
                                    }
                                </Badge>
                            )}
                        </HStack>
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
                                    onClick={() => {
                                        // Capture info changes first if in info mode
                                        if (activeMode === 'info' && hasChanges) {
                                            captureInfoChanges();
                                        }
                                        modalHandlers.handleShowSaveConfirmation();
                                    }}
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
                        {!isLoadingScript && !scriptError && sourceScript && (
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
                                    <ViewMode ref={viewModeRef} scriptId={scriptId || ''} colorizeDepNames={activePreferences.colorizeDepNames} showClockTimes={activePreferences.showClockTimes} autoSortCues={activePreferences.autoSortCues} useMilitaryTime={activePreferences.useMilitaryTime} onScrollStateChange={handleScrollStateChange} elements={filteredEditQueueElements} allElements={filteredAllEditQueueElements} script={currentScript} onToggleGroupCollapse={toggleGroupCollapse} groupOverrides={groupOverrides} />
                                )}
                                {activeMode === 'edit' && (
                                    <EditMode
                                        ref={editModeRef}
                                        scriptId={scriptId || ''}
                                        colorizeDepNames={activePreferences.colorizeDepNames}
                                        showClockTimes={activePreferences.showClockTimes}
                                        autoSortCues={activePreferences.autoSortCues}
                                        useMilitaryTime={activePreferences.useMilitaryTime}
                                        onAutoSortChange={handleAutoSortToggle}
                                        onScrollStateChange={handleScrollStateChange}
                                        onSelectionChange={handleSelectionChange}
                                        onToggleGroupCollapse={toggleGroupCollapse}
                                        script={currentScript}
                                        elements={filteredEditQueueElements}
                                        allElements={filteredAllEditQueueElements}
                                        onApplyLocalChange={applyLocalChange}
                                    />
                                )}
                                {activeMode === 'play' && <PlayMode />}
                                {activeMode === 'history' && <EditHistoryView operations={pendingOperations} allElements={filteredAllEditQueueElements} summary={EditQueueFormatter.formatOperationsSummary(pendingOperations)} onRevertToPoint={revertToPoint} onRevertSuccess={() => setActiveMode('edit')} />}
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
            <FloatingValidationErrorPanel fieldErrors={form.fieldErrors} />

            {/* All Script Modals - Consolidated */}
            <ScriptModals
                modalState={modalState}
                modalNames={MODAL_NAMES}
                script={currentScript}
                scriptId={scriptId || ''}
                selectedElement={elementActions.selectedElement}
                selectedElementIds={elementActions.selectedElementIds}
                selectedElementName={elementActions.selectedElementName}
                selectedElementTimeOffset={elementActions.selectedElementTimeOffset}
                pendingOperations={pendingOperations}
                totalChangesCount={totalChangesCount}
                isDeleting={modalHandlers.isDeleting}
                isDeletingCue={elementActions.isDeletingCue}
                isDuplicatingElement={elementActions.isDuplicatingElement}
                darkMode={activePreferences.darkMode}
                colorizeDepNames={activePreferences.colorizeDepNames}
                showClockTimes={activePreferences.showClockTimes}
                autoSortCues={activePreferences.autoSortCues}
                useMilitaryTime={activePreferences.useMilitaryTime}
                dangerMode={activePreferences.dangerMode}
                autoSaveInterval={activePreferences.autoSaveInterval}
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
                onColorizeChange={async (value: boolean) => { await updatePreference('colorizeDepNames', value); }}
                onClockTimesChange={async (value: boolean) => { await updatePreference('showClockTimes', value); }}
                onDangerModeChange={async (value: boolean) => { await updatePreference('dangerMode', value); }}
                onAutoSaveIntervalChange={async (value: number) => { await updatePreference('autoSaveInterval', value); }}
                onConfirmDeleteCue={elementActions.handleConfirmDeleteCue}
                onConfirmDuplicate={elementActions.handleConfirmDuplicate}
                onConfirmGroupElements={elementActions.handleConfirmGroupElements}
                onUnsavedChangesCancel={modalHandlers.handleUnsavedChangesCancel}
                onInitialUnsavedConfirm={modalHandlers.handleInitialUnsavedConfirm}
                onAbandonChangesConfirm={modalHandlers.handleAbandonChangesConfirm}
                onFinalSaveConfirm={modalHandlers.handleFinalSaveConfirm}
                onSaveCancel={modalHandlers.handleSaveCancel}
                onElementEdit={elementActions.handleElementEditSave}
                onGroupEdit={elementActions.handleGroupEditSave}
                allElements={allEditQueueElements}
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

            {/* Filter Departments Modal */}
            <FilterDepartmentsModal
                isOpen={modalState.isOpen(MODAL_NAMES.FILTER_DEPARTMENTS)}
                onClose={() => modalState.closeModal(MODAL_NAMES.FILTER_DEPARTMENTS)}
                elements={allEditQueueElements || []}
                selectedDepartmentIds={filteredDepartmentIds}
                onApplyFilter={handleApplyDepartmentFilter}
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
                changesCount={totalChangesCount}
            />

            {/* Mobile Drawer Menu */}
            <MobileScriptDrawer
                isOpen={isMenuOpen}
                onClose={onMenuClose}
                activeMode={activeMode}
                toolButtons={toolButtons}
                onModeChange={handleModeChange}
            />

            {/* Loading Modal - NO EMPTY TRUCKS */}
            <Modal
                isOpen={!dataReady}
                onClose={() => {}}
                closeOnOverlayClick={false}
                closeOnEsc={false}
            >
                <ModalOverlay />
                <ModalContent 
                    maxWidth="400px" 
                    mx="4"
                    bg="page.background"
                    border="2px solid"
                    borderColor="gray.600"
                >
                    <ModalBody py="8">
                        <VStack spacing={6} align="center">
                            <Box>
                                <Spinner
                                    size="xl"
                                    thickness="4px"
                                    speed="0.8s"
                                    color="blue.400"
                                />
                            </Box>
                            <VStack spacing={2} textAlign="center">
                                <Text
                                    fontSize="lg"
                                    fontWeight="semibold"
                                    color="gray.700"
                                    _dark={{ color: "gray.200" }}
                                >
                                    Loading Script
                                </Text>
                                <Text
                                    fontSize="sm"
                                    color="gray.600"
                                    _dark={{ color: "gray.400" }}
                                >
                                    Loading script data and elements...
                                </Text>
                            </VStack>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </ErrorBoundary>
    );
};

// Outer component that handles auth and passes getToken down
export const ManageScriptPage: React.FC<ManageScriptPageProps> = React.memo(({ isMenuOpen, onMenuClose }) => {
    const auth = useAuth();
    const authRef = useRef(auth);
    authRef.current = auth; // Keep ref up to date
    
    const getToken = useCallback(async () => {
        return await authRef.current.getToken();
    }, []); // Stable function reference
    
    return (
        <ManageScriptPageInner 
            isMenuOpen={isMenuOpen}
            onMenuClose={onMenuClose}
            getToken={getToken}
        />
    );
});