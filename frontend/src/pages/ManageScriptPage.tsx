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
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from '@clerk/clerk-react';
import { useScript } from "../features/script/hooks/useScript";
import { useShow } from "../features/shows/hooks/useShow";
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AppIcon } from '../components/AppIcon';
import { ActionsMenu, ActionItem } from '../components/ActionsMenu';
// Modal imports now handled by ScriptModals component
import { useEnhancedToast } from '../utils/toastUtils';
import { useValidatedForm } from '../hooks/useValidatedForm';
import { ValidationRules, FormValidationConfig } from '../types/validation';
import { convertUTCToLocal, convertLocalToUTC } from '../utils/dateTimeUtils';
import { useChangeDetection } from '../hooks/useChangeDetection';
import { useUserPreferences, UserPreferences } from '../hooks/useUserPreferences';
import { EditHistoryView } from '../components/EditHistoryView';
import { useScriptElementsWithEditQueue } from '../features/script/hooks/useScriptElementsWithEditQueue';
import { EditQueueFormatter } from '../features/script/utils/editQueueFormatter';
import { UpdateElementOperation } from '../features/script/types/editQueue';
import { useModalState } from '../hooks/useModalState';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';
import { SaveConfirmationModal } from '../components/modals/SaveConfirmationModal';
import { SaveProcessingModal } from '../components/modals/SaveProcessingModal';

// Import script-specific components
import { ScriptToolbar } from '../features/script/components/ScriptToolbar';
import { InfoMode } from '../features/script/components/modes/InfoMode';
import { ViewMode, ViewModeRef } from '../features/script/components/modes/ViewMode';
import { EditMode, EditModeRef } from '../features/script/components/modes/EditMode';
import { PlayMode } from '../features/script/components/modes/PlayMode';
import { ShareMode } from '../features/script/components/modes/ShareMode';
// AddScriptElementModal now handled by ScriptModals component
import { useScriptModes } from '../features/script/hooks/useScriptModes';
import { useElementActions } from '../features/script/hooks/useElementActions';
import { ScriptModals } from '../features/script/components/ScriptModals';
import { MobileScriptDrawer } from '../features/script/components/MobileScriptDrawer';
import { getToolbarButtons, ToolbarContext } from '../features/script/utils/toolbarConfig';

// Modal names for type safety and consistency
const MODAL_NAMES = {
    DELETE: 'delete',
    FINAL_DELETE: 'final-delete',
    DUPLICATE: 'duplicate',
    PROCESSING: 'processing',
    ADD_ELEMENT: 'add-element',
    EDIT_ELEMENT: 'edit-element',
    OPTIONS: 'options',
    DELETE_CUE: 'delete-cue',
    DUPLICATE_ELEMENT: 'duplicate-element',
    UNSAVED_CHANGES: 'unsaved-changes',
    FINAL_UNSAVED_CHANGES: 'final-unsaved-changes',
    CLEAR_HISTORY: 'clear-history',
    FINAL_CLEAR_HISTORY: 'final-clear-history',
    SAVE_CONFIRMATION: 'save-confirmation',
    SAVE_PROCESSING: 'save-processing'
} as const;

interface ManageScriptPageProps {
    isMenuOpen: boolean;
    onMenuClose: () => void;
}

// TypeScript interfaces for script metadata form
interface ScriptFormData {
    scriptName: string;
    scriptStatus: string;
    startTime: string;
    endTime: string;
    scriptNotes: string;
}


const INITIAL_FORM_STATE: ScriptFormData = {
    scriptName: '',
    scriptStatus: 'DRAFT',
    startTime: '',
    endTime: '',
    scriptNotes: ''
};

const VALIDATION_CONFIG: FormValidationConfig = {
    scriptName: {
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
                code: 'REQUIRED_MIN_LENGTH'
            },
            ValidationRules.maxLength(100, 'Script name must be no more than 100 characters')
        ]
    },
    scriptNotes: {
        required: false,
        rules: [
            ValidationRules.maxLength(500, 'Notes must be no more than 500 characters')
        ]
    }
};


export const ManageScriptPage: React.FC<ManageScriptPageProps> = ({ isMenuOpen, onMenuClose }) => {
    const { scriptId } = useParams<{ scriptId: string }>();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const { showSuccess, showError } = useEnhancedToast();

    // Modal state management using custom hook
    const modalState = useModalState(Object.values(MODAL_NAMES));

    // Dashboard navigation hook
    const { navigateWithCurrentContext } = useDashboardNavigation();

    // Processing states (separate from modal states)
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeletingCue, setIsDeletingCue] = useState(false);
    const [isDuplicatingElement, setIsDuplicatingElement] = useState(false);
    const [forceRender, setForceRender] = useState(0); // Used to force re-renders when edit operations complete

    // Element selection and refs
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [selectedElement, setSelectedElement] = useState<any>(null); // TODO: Type this properly with ScriptElement interface
    const [selectedElementName, setSelectedElementName] = useState<string>('');
    const [selectedElementTimeOffset, setSelectedElementTimeOffset] = useState<number>(0);
    const viewModeRef = useRef<ViewModeRef>(null);
    const editModeRef = useRef<EditModeRef>(null);

    // Options modal data management
    const [previewPreferences, setPreviewPreferences] = useState<UserPreferences | null>(null);
    const {
        preferences: { darkMode, colorizeDepNames, showClockTimes, autoSortCues },
        updatePreference,
        updatePreferences
    } = useUserPreferences();

    // Use preview preferences when options modal is open, otherwise use saved preferences  
    // Note: activePreferences is calculated after currentAutoSortState is defined

    // Navigation state
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

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

    // Responsive breakpoint for mobile layout
    const isMobile = useBreakpointValue({ base: true, lg: false });

    // Form management for INFO mode
    const formConfig = {
        validationConfig: VALIDATION_CONFIG,
        validateOnChange: true,
        validateOnBlur: true,
        showFieldErrorsInToast: false
    };

    const form = useValidatedForm<ScriptFormData>(INITIAL_FORM_STATE, formConfig);

    // Fetch the script data
    const { script: scriptFromHook, isLoading: isLoadingScript, error: scriptError } = useScript(scriptId);

    const script = scriptFromHook;

    // Fetch the show data using the script's showID
    const { show } = useShow(script?.showID);

    // Edit queue for tracking changes
    const editQueueHook = useScriptElementsWithEditQueue(scriptId);
    const {
        elements: editQueueElements,
        pendingOperations,
        hasUnsavedChanges,
        revertToPoint,
        applyLocalChange,
        discardChanges,
        saveChanges
    } = editQueueHook;

    // Calculate the current auto-sort state from edit queue operations
    const currentAutoSortState = useMemo(() => {
        // Start with the base preference value
        let currentState = autoSortCues;
        
        // Check for any ENABLE_AUTO_SORT or DISABLE_AUTO_SORT operations in the pending operations
        for (const operation of pendingOperations) {
            if (operation.type === 'ENABLE_AUTO_SORT' || operation.type === 'DISABLE_AUTO_SORT') {
                currentState = (operation as any).newPreferenceValue;
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

    // Debug logging for stability
    // useEffect(() => {
    //     console.log('🔍 ManageScriptPage: editQueueElements changed:', editQueueElements.length);
    // }, [editQueueElements]);
    
    // useEffect(() => {
    //     console.log('🔍 ManageScriptPage: activePreferences.autoSortCues changed:', activePreferences.autoSortCues);
    // }, [activePreferences.autoSortCues]);
    
    // useEffect(() => {
    //     console.log('🔍 ManageScriptPage: applyLocalChange changed, identity:', applyLocalChange.toString().slice(0, 50));
    // }, [applyLocalChange]);

    // Use applyLocalChange directly from the hook (already stable)

    // Active mode state using script-specific hook
    const { activeMode, setActiveMode } = useScriptModes('view');
    
    // Log mode transitions
    // useEffect(() => {
    //     console.log(`🔄 ManageScriptPage: Mode changed to "${activeMode}"`);
    // }, [activeMode]);

    // Calculate current script including all edit queue changes (this becomes the "truth")
    const currentScript = useMemo(() => {
        if (!script) return null;
        
        // Start with server data
        let current = { ...script };
        
        // Apply all script info operations from edit queue
        for (const operation of pendingOperations) {
            if (operation.type === 'UPDATE_SCRIPT_INFO') {
                const changes = (operation as any).changes;
                for (const [field, change] of Object.entries(changes)) {
                    const changeData = change as { oldValue: any; newValue: any };
                    if (field === 'scriptName') {
                        current.scriptName = changeData.newValue;
                    } else if (field === 'scriptStatus') {
                        current.scriptStatus = changeData.newValue;
                    } else if (field === 'startTime') {
                        // Ensure we store as Date object consistently
                        current.startTime = typeof changeData.newValue === 'string' 
                            ? new Date(changeData.newValue) 
                            : changeData.newValue;
                    } else if (field === 'endTime') {
                        // Ensure we store as Date object consistently
                        current.endTime = typeof changeData.newValue === 'string' 
                            ? new Date(changeData.newValue) 
                            : changeData.newValue;
                    } else if (field === 'scriptNotes') {
                        current.scriptNotes = changeData.newValue;
                    }
                }
            }
        }
        
        return current;
    }, [script, pendingOperations]);


    // Data for change detection should compare current state (including edit queue) vs form changes
    const changeDetectionBaseData = currentScript && show ? {
        scriptName: currentScript.scriptName,
        showName: show.showName,
        scriptStatus: currentScript.scriptStatus,
        startTime: convertLocalToUTC(convertUTCToLocal(currentScript.startTime)), // Normalize the format
        endTime: convertLocalToUTC(convertUTCToLocal(currentScript.endTime)), // Normalize the format
        scriptNotes: currentScript.scriptNotes || ''
    } : null;

    const { hasChanges } = useChangeDetection(
        changeDetectionBaseData,
        {
            scriptName: form.formData.scriptName,
            scriptStatus: form.formData.scriptStatus,
            startTime: convertLocalToUTC(form.formData.startTime),
            endTime: convertLocalToUTC(form.formData.endTime),
            scriptNotes: form.formData.scriptNotes
        },
        activeMode === 'info'
    );

    // Populate form when script data loads or edit queue changes
    React.useEffect(() => {
        if (currentScript) {
            form.setFormData({
                scriptName: currentScript.scriptName || '',
                scriptStatus: currentScript.scriptStatus || 'DRAFT',
                startTime: convertUTCToLocal(currentScript.startTime),
                endTime: convertUTCToLocal(currentScript.endTime),
                scriptNotes: currentScript.scriptNotes || ''
            });
        }
    }, [currentScript, form.setFormData]);

    const handleSelectionChange = useCallback((id: string | null) => {
        setSelectedElementId(id);
    }, []);

    useEffect(() => {
        if (activeMode !== 'edit') {
            setSelectedElementId(null);
        }
    }, [activeMode]);

    // Handle browser beforeunload event (tab close, refresh, etc.)
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                event.preventDefault();
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore - returnValue is deprecated but required for Chrome compatibility
                event.returnValue = ''; // Required for Chrome
                return ''; // Required for some older browsers
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Push initial history state to enable popstate detection
    useEffect(() => {
        window.history.pushState({ manageScript: true }, '', window.location.pathname);
    }, []);

    // Handle browser back/forward button using popstate
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (hasUnsavedChanges) {
                event.preventDefault();
                // Push current state back to history to "block" the navigation
                window.history.pushState({ manageScript: true }, '', window.location.pathname);
                setPendingNavigation('/dashboard'); // Default to dashboard on back
                modalState.openModal(MODAL_NAMES.UNSAVED_CHANGES);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [hasUnsavedChanges, modalState]);


    // Unsaved Changes Modal handlers (two-tier pattern)
    const handleUnsavedChangesCancel = () => {
        modalState.closeModal(MODAL_NAMES.UNSAVED_CHANGES);
        modalState.closeModal(MODAL_NAMES.FINAL_UNSAVED_CHANGES);
        setPendingNavigation(null);
    };

    const handleInitialUnsavedConfirm = () => {
        modalState.closeModal(MODAL_NAMES.UNSAVED_CHANGES);
        modalState.openModal(MODAL_NAMES.FINAL_UNSAVED_CHANGES);
    };

    const handleSaveScriptChanges = async () => {
        // Close confirmation modal and show processing modal
        modalState.closeModal(MODAL_NAMES.SAVE_CONFIRMATION);
        modalState.closeModal(MODAL_NAMES.FINAL_UNSAVED_CHANGES);
        modalState.openModal(MODAL_NAMES.SAVE_PROCESSING);
        
        try {
            // Save all pending changes using the comprehensive save function
            const success = await saveChanges();
            
            if (success) {
                // Wait a brief moment to ensure everything is stable
                await new Promise(resolve => setTimeout(resolve, 500));
                
                modalState.closeModal(MODAL_NAMES.SAVE_PROCESSING);
                showSuccess('Changes Saved', 'All pending changes have been saved successfully.');
                
                if (pendingNavigation) {
                    // Handle dashboard navigation with state
                    if (pendingNavigation === '/dashboard') {
                        navigateWithCurrentContext(script, scriptId);
                    } else {
                        navigate(pendingNavigation);
                    }
                    setPendingNavigation(null);
                }
            } else {
                modalState.closeModal(MODAL_NAMES.SAVE_PROCESSING);
                showError('Failed to save changes. Please try again.');
            }
        } catch (error) {
            console.error('Error saving changes:', error);
            modalState.closeModal(MODAL_NAMES.SAVE_PROCESSING);
            showError('An error occurred while saving changes.');
        }
    };

    const handleShowSaveConfirmation = () => {
        modalState.openModal(MODAL_NAMES.SAVE_CONFIRMATION);
    };

    // Callback for child components to update scroll state
    const handleScrollStateChange = useCallback((newScrollState: {
        isAtTop: boolean;
        isAtBottom: boolean;
        allElementsFitOnScreen: boolean;
    }) => {
        setScrollState(newScrollState);
    }, []);

    // Tool buttons configuration using extracted utility
    const toolbarContext: ToolbarContext = {
        activeMode,
        scrollState,
        hasSelection: !!selectedElementId,
        hasUnsavedChanges,
        pendingOperationsCount: pendingOperations.length
    };

    const toolButtons = getToolbarButtons(toolbarContext);

    // Handle exiting Info mode with unsaved changes - add to edit history
    const handleInfoModeExit = (targetModeId: string) => {
        if (!hasChanges || !changeDetectionBaseData) {
            // No changes to save, proceed with mode change
            setActiveMode(targetModeId as any);
            return;
        }

        // Create a collective operation for all form changes
        const formChanges = {
            scriptName: {
                oldValue: changeDetectionBaseData.scriptName,
                newValue: form.formData.scriptName
            },
            scriptStatus: {
                oldValue: changeDetectionBaseData.scriptStatus,
                newValue: form.formData.scriptStatus
            },
            startTime: {
                oldValue: changeDetectionBaseData.startTime,
                newValue: convertLocalToUTC(form.formData.startTime)
            },
            endTime: {
                oldValue: changeDetectionBaseData.endTime,
                newValue: convertLocalToUTC(form.formData.endTime)
            },
            scriptNotes: {
                oldValue: changeDetectionBaseData.scriptNotes,
                newValue: form.formData.scriptNotes
            }
        };

        // Filter out fields that haven't actually changed
        const actualChanges: any = {};
        for (const [field, values] of Object.entries(formChanges)) {
            if (values.oldValue !== values.newValue) {
                actualChanges[field] = values;
            }
        }

        // Only create operation if there are actual changes
        if (Object.keys(actualChanges).length > 0) {
            const infoFormOperation = {
                type: 'UPDATE_SCRIPT_INFO' as const,
                elementId: 'script-info',
                changes: actualChanges
            };

            applyLocalChange(infoFormOperation);

            // Update the original data to reflect the new state - this will be handled
            // automatically by the currentScript calculation, no need to manually update
        }

        // Proceed with the mode change
        setActiveMode(targetModeId as any);
    };

    const handleModeChange = (modeId: string) => {
        // Handle EXIT button (replaces dashboard)
        if (modeId === 'exit') {
            handleCancel();
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
                handleInfoModeExit(modeId);
                return;
            }
            
            setActiveMode(modeId);
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
                    setActiveMode('play');
                    return;
                case 'share':
                    setActiveMode('share');
                    return;
            }
        }

        // Handle HISTORY mode tools
        if (activeMode === 'history') {
            switch (modeId) {
                case 'clear-history':
                    handleClearHistory();
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
                    handleElementEdit();
                    return;
                case 'duplicate-element':
                    handleElementDuplicate();
                    return;
                case 'group-elements':
                    handleElementGroup();
                    return;
                case 'delete-element':
                    handleElementDelete();
                    return;
            }
        }
    };

    // NOTE: This function is currently unused - functionality moved to handleInfoModeExit
    // Removed to clean up TypeScript warnings

    const handleCancel = () => {
        const dashboardPath = '/dashboard';
        if (hasUnsavedChanges) {
            setPendingNavigation(dashboardPath);
            modalState.openModal(MODAL_NAMES.UNSAVED_CHANGES);
        } else {
            navigate(dashboardPath, {
                state: {
                    view: 'shows',
                    selectedShowId: script?.showID,
                    selectedScriptId: scriptId,
                    returnFromManage: true
                }
            });
        }
    };

    // Clear history functionality
    const handleClearHistory = () => {
        modalState.openModal(MODAL_NAMES.CLEAR_HISTORY);
    };

    const handleInitialClearHistoryConfirm = () => {
        modalState.closeModal(MODAL_NAMES.CLEAR_HISTORY);
        modalState.openModal(MODAL_NAMES.FINAL_CLEAR_HISTORY);
    };

    const handleFinalClearHistoryConfirm = () => {
        // Clear the edit queue (restore to server state)
        discardChanges();
        modalState.closeModal(MODAL_NAMES.FINAL_CLEAR_HISTORY);
        setActiveMode('view'); // Return to view mode
        showSuccess('Edit History Cleared', 'All changes have been discarded and the script has been restored to its original state.');
    };

    const handleClearHistoryCancel = () => {
        modalState.closeModal(MODAL_NAMES.CLEAR_HISTORY);
        modalState.closeModal(MODAL_NAMES.FINAL_CLEAR_HISTORY);
    };

    // Delete functionality
    const handleDeleteClick = () => {
        modalState.openModal(MODAL_NAMES.DELETE);
    };

    const handleInitialDeleteConfirm = () => {
        modalState.closeModal(MODAL_NAMES.DELETE);
        modalState.openModal(MODAL_NAMES.FINAL_DELETE);
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
                    returnFromManage: true
                }
            });

        } catch (error) {
            console.error('Error deleting script:', error);
            showError('Failed to delete script. Please try again.');
        } finally {
            setIsDeleting(false);
            modalState.closeModal(MODAL_NAMES.FINAL_DELETE);
        }
    };

    const handleDeleteCancel = useCallback(() => {
        modalState.closeModal(MODAL_NAMES.DELETE);
        modalState.closeModal(MODAL_NAMES.FINAL_DELETE);
    }, [modalState]);


    // Element action handlers
    const handleElementCreated = async (elementData: any) => {
        insertElement(elementData);

        modalState.closeModal(MODAL_NAMES.ADD_ELEMENT);
        showSuccess('Script Element Created', 'New element added to script. Save to apply changes.');
    };

    const handleAutoSortElements = useCallback(async () => {
        if (!scriptId) {
            return;
        }

        try {
            // Get current elements from edit queue
            const currentElements = [...editQueueElements];

            // Sort elements by timeOffsetMs (create a copy to avoid mutating original)
            const sortedElements = [...currentElements].sort((a, b) => a.timeOffsetMs - b.timeOffsetMs);

            // Check if any reordering is needed
            const needsReordering = currentElements.some((element, index) => {
                const sortedElement = sortedElements[index];
                const matches = element.elementID === sortedElement.elementID;
                return !matches;
            });

            if (!needsReordering) {
                showSuccess('Auto-Sort Complete', 'Elements are already in correct time order.');
                return;
            }

            // Create bulk reorder operation for all elements that changed position
            const elementChanges: any[] = [];
            for (let newIndex = 0; newIndex < sortedElements.length; newIndex++) {
                const element = sortedElements[newIndex];
                const oldIndex = currentElements.findIndex(el => el.elementID === element.elementID);

                if (oldIndex !== newIndex) {
                    elementChanges.push({
                        elementId: element.elementID,
                        oldIndex: oldIndex,
                        newIndex: newIndex,
                        oldSequence: oldIndex + 1,
                        newSequence: newIndex + 1
                    });
                }
            }

            // Apply as compound operation: preference change + resulting sort
            applyLocalChange({
                type: 'ENABLE_AUTO_SORT',
                elementId: 'auto-sort-preference',
                oldPreferenceValue: false,
                newPreferenceValue: true,
                elementMoves: elementChanges
            } as any);
            showSuccess('Elements Auto-Sorted', `Reordered ${elementChanges.length} elements by time offset. Save to apply changes.`);
        } catch (error) {
            console.error('Error auto-sorting elements:', error);
            showError(error instanceof Error ? error.message : 'Failed to auto-sort elements');
        }
    }, [scriptId, editQueueElements, applyLocalChange, showSuccess, showError]);

    const handleAutoSortToggle = useCallback(
        async (value: boolean) => {
            if (value && !activePreferences.autoSortCues && scriptId) {
                // Enabling auto-sort - this will create the ENABLE_AUTO_SORT operation
                handleAutoSortElements();
            } else if (!value && activePreferences.autoSortCues) {
                // Disabling auto-sort - create a disable operation for edit history
                const disableOperation = {
                    type: 'DISABLE_AUTO_SORT' as const,
                    elementId: 'auto-sort-preference',
                    oldPreferenceValue: true,
                    newPreferenceValue: false
                };
                applyLocalChange(disableOperation);
            }
            
            // Update the preference after creating the operation
            await updatePreference('autoSortCues', value);
        },
        [updatePreference, scriptId, activePreferences.autoSortCues, handleAutoSortElements, applyLocalChange]
    );

    // Handle immediate auto-sort when checkbox is clicked in modal
    const handleAutoSortCheckboxChange = async (newAutoSortValue: boolean) => {


        // Update the preference immediately
        await updatePreference('autoSortCues', newAutoSortValue);

        // If auto-sort is being enabled, trigger immediate re-sort
        if (newAutoSortValue && !autoSortCues && scriptId) {
            handleAutoSortElements();
        } else {
            // Not triggering auto-sort immediately
        }
    };

    const handleOptionsModalSave = async (newPreferences: any) => {
        // Just save the preferences - auto-sort was already handled by checkbox change
        await updatePreferences(newPreferences);

        setPreviewPreferences(null);
    };

    const handleElementDuplicate = async () => {
        if (!selectedElementId) {
            showError('No script element selected for duplication');
            return;
        }

        // Find element in current edit queue elements (includes pending changes)
        try {
            const elementData = editQueueElements.find(el => el.elementID === selectedElementId);
            
            if (!elementData) {
                showError('Selected element not found');
                return;
            }

            setSelectedElementName(elementData.description || 'Unknown Element');
            setSelectedElementTimeOffset(elementData.timeOffsetMs || 0);
            modalState.openModal(MODAL_NAMES.DUPLICATE_ELEMENT);

        } catch (error) {
            console.error('Error finding element details:', error);
            showError('Failed to load element details. Please try again.');
        }
    };

    const handleConfirmDuplicate = async (description: string, timeOffsetMs: number) => {
        if (!selectedElementId || !scriptId) {
            return;
        }

        setIsDuplicatingElement(true);
        try {
            // Find the original element in the current elements
            const originalElement = editQueueElements.find(el => el.elementID === selectedElementId);
            if (!originalElement) {
                throw new Error('Original element not found');
            }

            // Create duplicate with new description and time offset
            const duplicateData = {
                ...originalElement,
                description,
                timeOffsetMs,
                // Generate a temporary ID for the duplicate (will be replaced by server)
                elementID: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                // Remove server-only fields
                created_at: undefined,
                updated_at: undefined,
                is_deleted: undefined
            };

            insertElement(duplicateData);

            showSuccess('Script Element Duplicated', 'Script element has been duplicated. Save to apply changes.');
            modalState.closeModal(MODAL_NAMES.DUPLICATE_ELEMENT);

        } catch (error) {
            console.error('Error duplicating element:', error);
            showError('Failed to duplicate script element. Please try again.');
        } finally {
            setIsDuplicatingElement(false);
        }
    };

    const handleElementEditSave = async (changes: Record<string, { oldValue: any; newValue: any }>) => {
        if (!selectedElement) {
            return;
        }

        try {
            // Create single UPDATE_ELEMENT operation for all changes
            applyLocalChange({
                type: 'UPDATE_ELEMENT',
                elementId: selectedElement.elementID,
                changes: changes,
                description: `Updated element "${selectedElement.description}"`
            } as UpdateElementOperation);

            // Force a re-render to ensure UI updates immediately
            setForceRender(prev => prev + 1);

            modalState.closeModal(MODAL_NAMES.EDIT_ELEMENT);
            showSuccess('Element Updated', 'Element changes have been applied. Save to persist changes.');
        } catch (error) {
            console.error('Error updating element:', error);
            showError('Failed to update script element. Please try again.');
        }
    };

    const handleElementGroup = () => {
        showError('Element grouping feature is under development');
    };

    const handleElementEdit = () => {
        if (!selectedElementId) {
            showError('Please select an element to edit');
            return;
        }
        
        // Find the selected element in the current elements
        const elementToEdit = editQueueElements.find(el => el.elementID === selectedElementId);
        if (!elementToEdit) {
            showError('Selected element not found');
            return;
        }
        
        setSelectedElement(elementToEdit);
        modalState.openModal(MODAL_NAMES.EDIT_ELEMENT);
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

    const handleElementDelete = async () => {
        if (!selectedElementId) {
            showError('No script element selected for deletion');
            return;
        }

        // Find element details in the local edit queue instead of fetching from API
        const elementToDelete = editQueueElements.find(el => el.elementID === selectedElementId);
        if (!elementToDelete) {
            showError('Selected element not found in current script');
            return;
        }

        setSelectedElementName(elementToDelete.description || 'Unknown Element');
        modalState.openModal(MODAL_NAMES.DELETE_CUE);
    };

    const handleConfirmDeleteCue = async () => {
        if (!selectedElementId) {
            return;
        }

        setIsDeletingCue(true);
        try {
            // Find the element to delete in the current elements
            const elementToDelete = editQueueElements.find(el => el.elementID === selectedElementId);
            if (!elementToDelete) {
                throw new Error('Element to delete not found');
            }

            // Add the delete operation to the edit queue
            applyLocalChange({
                type: 'DELETE_ELEMENT',
                elementId: selectedElementId,
                elementData: elementToDelete
            } as any);

            showSuccess('Script Element Deleted', 'Script element has been deleted. Save to apply changes.');

            // Clear selection and close modal
            setSelectedElementId(null);
            modalState.closeModal(MODAL_NAMES.DELETE_CUE);

        } catch (error) {
            console.error('Error deleting element:', error);
            showError('Failed to delete script element. Please try again.');
        } finally {
            setIsDeletingCue(false);
        }
    };

    // Configure actions menu
    const actions: ActionItem[] = [
        {
            id: 'options',
            label: 'Options',
            onClick: () => modalState.openModal(MODAL_NAMES.OPTIONS),
            isDestructive: false,
            isDisabled: false
        },
        {
            id: 'duplicate-script',
            label: 'Duplicate Script',
            onClick: () => modalState.openModal(MODAL_NAMES.DUPLICATE),
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
                            {show?.showName && currentScript?.scriptName ? `${show.showName} > ${currentScript.scriptName}` : currentScript?.scriptName || 'Script'}
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
                                    onClick={handleCancel}
                                    _hover={{ bg: 'gray.100' }}
                                    _dark={{ _hover: { bg: 'gray.700' } }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="xs"
                                    bg="blue.400"
                                    color="white"
                                    onClick={handleShowSaveConfirmation}
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
                                    <ViewMode ref={viewModeRef} scriptId={scriptId || ''} colorizeDepNames={activePreferences.colorizeDepNames} showClockTimes={activePreferences.showClockTimes} onScrollStateChange={handleScrollStateChange} elements={editQueueElements} script={script} />
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
                                        onSelectionChange={handleSelectionChange}
                                        elements={editQueueElements}
                                        script={currentScript}
                                        onApplyLocalChange={applyLocalChange}
                                    />
                                )}
                                {activeMode === 'play' && <PlayMode />}
                                {activeMode === 'share' && <ShareMode />}
                                {activeMode === 'history' && <EditHistoryView operations={pendingOperations} allElements={editQueueElements} summary={EditQueueFormatter.formatOperationsSummary(pendingOperations)} onRevertToPoint={revertToPoint} onRevertSuccess={() => setActiveMode('edit')} />}
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
                selectedElement={selectedElement}
                selectedElementName={selectedElementName}
                selectedElementTimeOffset={selectedElementTimeOffset}
                pendingOperations={pendingOperations}
                isDeleting={isDeleting}
                isDeletingCue={isDeletingCue}
                isDuplicatingElement={isDuplicatingElement}
                isSavingChanges={false} // TODO: Re-enable when save logic is implemented
                previewPreferences={previewPreferences}
                darkMode={activePreferences.darkMode}
                colorizeDepNames={activePreferences.colorizeDepNames}
                showClockTimes={activePreferences.showClockTimes}
                autoSortCues={activePreferences.autoSortCues}
                onDeleteCancel={handleDeleteCancel}
                onInitialDeleteConfirm={handleInitialDeleteConfirm}
                onFinalDeleteConfirm={handleFinalDeleteConfirm}
                onClearHistoryCancel={handleClearHistoryCancel}
                onInitialClearHistoryConfirm={handleInitialClearHistoryConfirm}
                onFinalClearHistoryConfirm={handleFinalClearHistoryConfirm}
                onDuplicateClose={() => modalState.closeModal(MODAL_NAMES.DUPLICATE)}
                onDuplicateConfirm={(scriptName: string, showId: string) => {
                    // Handle script duplication - placeholder for actual implementation
                    console.log('Script duplication:', scriptName, showId);
                    modalState.closeModal(MODAL_NAMES.DUPLICATE);
                }}
                onElementCreated={handleElementCreated}
                onOptionsPreview={(preferences) => setPreviewPreferences(preferences)}
                onOptionsSave={handleOptionsModalSave}
                onAutoSortChange={handleAutoSortCheckboxChange}
                onColorizeChange={async (value: boolean) => await updatePreference('colorizeDepNames', value)}
                onClockTimesChange={async (value: boolean) => await updatePreference('showClockTimes', value)}
                onConfirmDeleteCue={handleConfirmDeleteCue}
                onConfirmDuplicate={handleConfirmDuplicate}
                onUnsavedChangesCancel={handleUnsavedChangesCancel}
                onInitialUnsavedConfirm={handleInitialUnsavedConfirm}
                onSaveScriptChanges={handleSaveScriptChanges}
                onElementEdit={handleElementEditSave}
            />

            {/* Save Confirmation Modal */}
            <SaveConfirmationModal
                isOpen={modalState.isOpen(MODAL_NAMES.SAVE_CONFIRMATION)}
                onClose={() => modalState.closeModal(MODAL_NAMES.SAVE_CONFIRMATION)}
                onConfirm={handleSaveScriptChanges}
                changesCount={pendingOperations.length}
                isSaving={false} // No longer needed since we have dedicated processing modal
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