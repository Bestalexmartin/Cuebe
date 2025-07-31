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
import { useScript } from "../hooks/useScript";
import { useShow } from "../hooks/useShow";
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
import { useScriptElementsWithEditQueue } from '../hooks/useScriptElementsWithEditQueue';
import { EditQueueFormatter } from '../utils/editQueueFormatter';
import { useModalState } from '../hooks/useModalState';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';

// Import script-specific components
import { ScriptToolbar } from './script/components/ScriptToolbar';
import { InfoMode } from './script/components/modes/InfoMode';
import { ViewMode, ViewModeRef } from './script/components/modes/ViewMode';
import { EditMode, EditModeRef } from './script/components/modes/EditMode';
import { PlayMode } from './script/components/modes/PlayMode';
import { ShareMode } from './script/components/modes/ShareMode';
// AddScriptElementModal now handled by ScriptModals component
import { useScriptModes } from './script/hooks/useScriptModes';
import { ToolButton } from './script/types/tool-button';
import { ScriptModals } from './script/components/ScriptModals';
import { MobileScriptDrawer } from './script/components/MobileScriptDrawer';
import { getToolbarButtons, ToolbarContext } from './script/utils/toolbarConfig';

// Modal names for type safety and consistency
const MODAL_NAMES = {
    DELETE: 'delete',
    FINAL_DELETE: 'final-delete',
    DUPLICATE: 'duplicate',
    PROCESSING: 'processing',
    ADD_ELEMENT: 'add-element',
    OPTIONS: 'options',
    DELETE_CUE: 'delete-cue',
    DUPLICATE_ELEMENT: 'duplicate-element',
    UNSAVED_CHANGES: 'unsaved-changes',
    CLEAR_HISTORY: 'clear-history',
    FINAL_CLEAR_HISTORY: 'final-clear-history'
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
    const [isSavingChanges, setIsSavingChanges] = useState(false);

    // Element selection and refs
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
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
    const activePreferences = useMemo(() =>
        modalState.isOpen(MODAL_NAMES.OPTIONS) && previewPreferences
            ? previewPreferences
            : { darkMode, colorizeDepNames, showClockTimes, autoSortCues }
        , [modalState, previewPreferences, darkMode, colorizeDepNames, showClockTimes, autoSortCues]);

    // Navigation state
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

    // Scroll state for jump button ghosting
    const [scrollState, setScrollState] = useState({
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

    // Use applyLocalChange directly from the hook (already stable)

    // Active mode state using script-specific hook
    const { activeMode, setActiveMode } = useScriptModes('view');

    // Change detection for save button
    const initialData = script && show ? {
        scriptName: script.scriptName,
        showName: show.showName,
        scriptStatus: script.scriptStatus,
        startTime: convertLocalToUTC(convertUTCToLocal(script.startTime)), // Normalize the format
        endTime: convertLocalToUTC(convertUTCToLocal(script.endTime)), // Normalize the format
        scriptNotes: script.scriptNotes || ''
    } : null;

    const { hasChanges, updateOriginalData } = useChangeDetection(
        initialData,
        {
            scriptName: form.formData.scriptName,
            scriptStatus: form.formData.scriptStatus,
            startTime: convertLocalToUTC(form.formData.startTime),
            endTime: convertLocalToUTC(form.formData.endTime),
            scriptNotes: form.formData.scriptNotes
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
                endTime: convertUTCToLocal(script.endTime),
                scriptNotes: script.scriptNotes || ''
            });
        }
    }, [script, form.setFormData]);

    // Sync selected element ID with EditMode for toolbar updates
    React.useEffect(() => {
        if (activeMode === 'edit' && editModeRef.current) {
            const checkSelection = () => {
                const editModeSelection = editModeRef.current?.selectedElementId;
                if (editModeSelection !== selectedElementId) {
                    setSelectedElementId(editModeSelection || null);
                }
            };

            // Check immediately and then periodically
            checkSelection();
            const interval = setInterval(checkSelection, 100);

            return () => clearInterval(interval);
        } else {
            // Clear selection when not in edit mode
            setSelectedElementId(null);
        }
    }, [activeMode, selectedElementId]);

    // Handle browser beforeunload event (tab close, refresh, etc.)
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                event.preventDefault();
                event.returnValue = ''; // Required for Chrome
                return ''; // Required for some older browsers
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Custom navigation handler that checks for unsaved changes
    const handleNavigateWithGuard = (targetPath: string) => {
        if (hasUnsavedChanges) {
            setPendingNavigation(targetPath);
            modalState.openModal(MODAL_NAMES.UNSAVED_CHANGES);
        } else {
            navigate(targetPath);
        }
    };

    // Modal handlers
    const handleSaveAndContinue = async () => {
        setIsSavingChanges(true);
        try {
            const success = await saveChanges();
            if (success && pendingNavigation) {
                modalState.closeModal(MODAL_NAMES.UNSAVED_CHANGES);
                // Handle dashboard navigation with state
                if (pendingNavigation === '/dashboard') {
                    navigateWithCurrentContext(script, scriptId);
                } else {
                    navigate(pendingNavigation);
                }
                setPendingNavigation(null);
            }
        } finally {
            setIsSavingChanges(false);
        }
    };

    const handleDiscardChanges = () => {
        discardChanges();
        modalState.closeModal(MODAL_NAMES.UNSAVED_CHANGES);
        if (pendingNavigation) {
            // Handle dashboard navigation with state
            if (pendingNavigation === '/dashboard') {
                navigateWithCurrentContext(script, scriptId);
            } else {
                navigate(pendingNavigation);
            }
            setPendingNavigation(null);
        }
    };

    const handleCancelNavigation = () => {
        modalState.closeModal(MODAL_NAMES.UNSAVED_CHANGES);
        setPendingNavigation(null);
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
        hasUnsavedChanges
    };

    const toolButtons = getToolbarButtons(toolbarContext);

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

    const handleSave = async () => {
        if (!scriptId || activeMode !== 'info') return;

        try {
            // Prepare data for API
            const updateData = {
                scriptName: form.formData.scriptName,
                scriptStatus: form.formData.scriptStatus,
                startTime: convertLocalToUTC(form.formData.startTime),
                endTime: convertLocalToUTC(form.formData.endTime),
                scriptNotes: form.formData.scriptNotes || null
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
                startTime: convertLocalToUTC(form.formData.startTime),
                endTime: convertLocalToUTC(form.formData.endTime),
                scriptNotes: form.formData.scriptNotes
            });

        } catch (error) {
            // Error handling is done in submitForm
        }
    };

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

    const handleDeleteCancel = () => {
        modalState.closeModal(MODAL_NAMES.DELETE);
        modalState.closeModal(MODAL_NAMES.FINAL_DELETE);
    };

    const handleProcessingStart = () => {
        modalState.openModal(MODAL_NAMES.PROCESSING);
    };

    const handleScriptDuplicated = (newScriptId: string) => {
        modalState.closeModal(MODAL_NAMES.PROCESSING);
        // Navigate directly to the new script's manage page
        navigate(`/scripts/${newScriptId}/manage`);
    };

    const handleDuplicationError = () => {
        modalState.closeModal(MODAL_NAMES.PROCESSING);
        // Error toast will be shown by the form submission handler
    };

    // Element action handlers
    const handleElementCreated = async (elementData: any) => {
        // Handle auto-sort by finding correct position if enabled
        if (elementData._autoSort) {
            // Get current elements to find insertion position
            const currentElements = editQueueElements;

            // Find the position where this element should be inserted based on timeOffsetMs
            let insertIndex = currentElements.length; // Default to end

            for (let i = 0; i < currentElements.length; i++) {
                if (currentElements[i].timeOffsetMs > elementData.timeOffsetMs) {
                    insertIndex = i;
                    break;
                }
            }

            // Remove the auto-sort flag before storing
            const { _autoSort, ...cleanElementData } = elementData;

            // If inserting at the end, use CREATE_ELEMENT
            if (insertIndex === currentElements.length) {
                applyLocalChange({
                    type: 'CREATE_ELEMENT',
                    elementId: cleanElementData.elementID,
                    elementData: cleanElementData
                } as any);
            } else {
                // Insert at specific position using CREATE_ELEMENT_AT_INDEX
                applyLocalChange({
                    type: 'CREATE_ELEMENT_AT_INDEX',
                    elementId: cleanElementData.elementID,
                    elementData: cleanElementData,
                    insertIndex: insertIndex
                } as any);
            }
        } else {
            // No auto-sort, just add to the end
            const { _autoSort, ...cleanElementData } = elementData;
            applyLocalChange({
                type: 'CREATE_ELEMENT',
                elementId: cleanElementData.elementID,
                elementData: cleanElementData
            } as any);
        }

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

    // Create stable refs for callback dependencies
    const stableRefsRef = useRef({ updatePreference, scriptId, activePreferences, handleAutoSortElements });
    stableRefsRef.current = { updatePreference, scriptId, activePreferences, handleAutoSortElements };

    const handleAutoSortToggle = useCallback(async (value: boolean) => {
        const { updatePreference, scriptId, activePreferences, handleAutoSortElements } = stableRefsRef.current;
        await updatePreference('autoSortCues', value);

        // If auto-sort is being enabled, trigger immediate re-sort
        if (value && !activePreferences.autoSortCues && scriptId) {
            handleAutoSortElements();
        }
    }, []);

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
        const success = await updatePreferences(newPreferences);

        setPreviewPreferences(null);
    };

    const handleElementDuplicate = async () => {
        if (!selectedElementId) {
            showError('No script element selected for duplication');
            return;
        }

        // Fetch element details for the modal
        try {
            const token = await getToken();
            if (!token) {
                showError('Authentication required');
                return;
            }

            const response = await fetch(`/api/elements/${selectedElementId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch element details');
            }

            const elementData = await response.json();
            setSelectedElementName(elementData.description || 'Unknown Element');
            setSelectedElementTimeOffset(elementData.timeOffsetMs || 0);
            modalState.openModal(MODAL_NAMES.DUPLICATE_ELEMENT);

        } catch (error) {
            console.error('Error fetching element details:', error);
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
                elementID: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                // Remove server-only fields
                created_at: undefined,
                updated_at: undefined,
                is_deleted: undefined
            };

            // Handle auto-sort for duplicated element
            if (activePreferences.autoSortCues) {
                // Find the position where this element should be inserted based on timeOffsetMs
                let insertIndex = editQueueElements.length; // Default to end

                for (let i = 0; i < editQueueElements.length; i++) {
                    if (editQueueElements[i].timeOffsetMs > duplicateData.timeOffsetMs) {
                        insertIndex = i;
                        break;
                    }
                }

                // If inserting at the end, use CREATE_ELEMENT
                if (insertIndex === editQueueElements.length) {
                    applyLocalChange({
                        type: 'CREATE_ELEMENT',
                        elementId: duplicateData.elementID,
                        elementData: duplicateData
                    } as any);
                } else {
                    // Insert at specific position using CREATE_ELEMENT_AT_INDEX
                    applyLocalChange({
                        type: 'CREATE_ELEMENT_AT_INDEX',
                        elementId: duplicateData.elementID,
                        elementData: duplicateData,
                        insertIndex: insertIndex
                    } as any);
                }
            } else {
                // No auto-sort, just add to the end
                applyLocalChange({
                    type: 'CREATE_ELEMENT',
                    elementId: duplicateData.elementID,
                    elementData: duplicateData
                } as any);
            }

            showSuccess('Script Element Duplicated', 'Script element has been duplicated. Save to apply changes.');
            modalState.closeModal(MODAL_NAMES.DUPLICATE_ELEMENT);

        } catch (error) {
            console.error('Error duplicating element:', error);
            showError('Failed to duplicate script element. Please try again.');
        } finally {
            setIsDuplicatingElement(false);
        }
    };

    const handleElementGroup = () => {
        showError('Element grouping feature is under development');
    };

    const handleElementEdit = () => {
        showError('Element editing feature is under development');
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
                            {show?.showName && script?.scriptName ? `${show.showName} > ${script.scriptName}` : script?.scriptName || 'Script'}
                        </Heading>
                    </HStack>

                    {/* Right: Action Buttons positioned to align with scroll area */}
                    <Box flex={1} position="relative">
                        <Box
                            position="absolute"
                            right={isMobile ? "16px" : "106px"}
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
                            >
                                {/* Render active mode component */}
                                {activeMode === 'info' && <InfoMode form={form} />}
                                {activeMode === 'view' && (
                                    <ViewMode ref={viewModeRef} scriptId={scriptId || ''} colorizeDepNames={activePreferences.colorizeDepNames} showClockTimes={activePreferences.showClockTimes} onScrollStateChange={handleScrollStateChange} elements={editQueueElements} script={script} />
                                )}
                                {activeMode === 'edit' && (
                                    <EditMode ref={editModeRef} scriptId={scriptId || ''} colorizeDepNames={activePreferences.colorizeDepNames} showClockTimes={activePreferences.showClockTimes} autoSortCues={activePreferences.autoSortCues} onAutoSortChange={handleAutoSortToggle} onScrollStateChange={handleScrollStateChange} elements={editQueueElements} script={script} onApplyLocalChange={applyLocalChange} />
                                )}
                                {activeMode === 'play' && <PlayMode />}
                                {activeMode === 'share' && <ShareMode />}
                                {activeMode === 'history' && <EditHistoryView operations={pendingOperations} allElements={editQueueElements} summary={EditQueueFormatter.formatOperationsSummary(pendingOperations)} onRevertToPoint={revertToPoint} />}
                            </Box>
                        )}
                    </Box>

                    {/* Right: Tool Toolbar - Single Column with Border - Hidden on Mobile */}
                    {!isMobile && (
                        <Box
                            width="74px"
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
                selectedElementName={selectedElementName}
                selectedElementTimeOffset={selectedElementTimeOffset}
                pendingOperations={pendingOperations}
                isDeleting={isDeleting}
                isDeletingCue={isDeletingCue}
                isDuplicatingElement={isDuplicatingElement}
                isSavingChanges={isSavingChanges}
                previewPreferences={previewPreferences}
                darkMode={darkMode}
                colorizeDepNames={colorizeDepNames}
                showClockTimes={showClockTimes}
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
                onConfirmDeleteCue={handleConfirmDeleteCue}
                onConfirmDuplicate={handleConfirmDuplicate}
                onCancelNavigation={handleCancelNavigation}
                onSaveAndContinue={handleSaveAndContinue}
                onDiscardChanges={handleDiscardChanges}
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