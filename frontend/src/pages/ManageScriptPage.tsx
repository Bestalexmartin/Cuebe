// frontend/src/pages/ManageScriptPage.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Spinner,
    Flex,
    Button,
    Divider,
    Heading,
    useBreakpointValue,
    Drawer,
    DrawerBody,
    DrawerHeader,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton
} from "@chakra-ui/react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from '@clerk/clerk-react';
import { useScript } from "../hooks/useScript";
import { useShow } from "../hooks/useShow";
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AppIcon } from '../components/AppIcon';
import { ActionsMenu, ActionItem } from '../components/ActionsMenu';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import { FinalDeleteConfirmationModal } from '../components/modals/FinalDeleteConfirmationModal';
import { DuplicateScriptModal } from './script/components/modals/DuplicateScriptModal';
import { ProcessingModal } from './script/components/modals/ProcessingModal';
import { OptionsModal } from './script/components/modals/OptionsModal';
import { DeleteCueModal } from './script/components/modals/DeleteCueModal';
import { DuplicateElementModal } from './script/components/modals/DuplicateElementModal';
import { UnsavedChangesModal } from '../components/modals/UnsavedChangesModal';
import { useEnhancedToast } from '../utils/toastUtils';
import { useValidatedForm } from '../hooks/useValidatedForm';
import { ValidationRules, FormValidationConfig } from '../types/validation';
import { convertUTCToLocal, convertLocalToUTC } from '../utils/dateTimeUtils';
import { useChangeDetection } from '../hooks/useChangeDetection';
import { useUserPreferences, UserPreferences } from '../hooks/useUserPreferences';
import { EditHistoryView } from '../components/EditHistoryView';
import { useScriptElementsWithEditQueue } from '../hooks/useScriptElementsWithEditQueue';
import { EditQueueFormatter } from '../utils/editQueueFormatter';

// Import script-specific components
import { ScriptToolbar } from './script/components/ScriptToolbar';
import { InfoMode } from './script/components/modes/InfoMode';
import { ViewMode, ViewModeRef } from './script/components/modes/ViewMode';
import { EditMode, EditModeRef } from './script/components/modes/EditMode';
import { PlayMode } from './script/components/modes/PlayMode';
import { ShareMode } from './script/components/modes/ShareMode';
import { AddScriptElementModal } from './script/components/AddScriptElementModal';
import { useScriptModes } from './script/hooks/useScriptModes';

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

interface ToolButton {
    id: string;
    icon: 'view' | 'play' | 'info' | 'script-edit' | 'share' | 'dashboard' | 'add' | 'copy' | 'group' | 'delete' | 'element-edit' | 'jump-top' | 'jump-bottom' | 'history';
    label: string;
    description: string;
    isActive: boolean;
    isDisabled?: boolean;
}

export const ManageScriptPage: React.FC<ManageScriptPageProps> = ({ isMenuOpen, onMenuClose }) => {
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

    // Element action state management
    const [isAddElementModalOpen, setIsAddElementModalOpen] = useState(false);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const viewModeRef = useRef<ViewModeRef>(null);
    const editModeRef = useRef<EditModeRef>(null);

    // Options state management
    const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
    const [previewPreferences, setPreviewPreferences] = useState<UserPreferences | null>(null);
    const { 
        preferences: { darkMode, colorizeDepNames, showClockTimes, autoSortCues }, 
        updatePreference,
        updatePreferences
    } = useUserPreferences();

    // Use preview preferences when modal is open, otherwise use saved preferences
    const activePreferences = isOptionsModalOpen && previewPreferences 
        ? previewPreferences 
        : { darkMode, colorizeDepNames, showClockTimes, autoSortCues };

    // Delete cue state management  
    const [isDeleteCueModalOpen, setIsDeleteCueModalOpen] = useState(false);
    const [isDeletingCue, setIsDeletingCue] = useState(false);

    // Scroll state for jump button ghosting
    const [scrollState, setScrollState] = useState({
        isAtTop: true,
        isAtBottom: false,
        allElementsFitOnScreen: true
    });
    const [selectedElementName, setSelectedElementName] = useState<string>('');

    // Duplicate element state management
    const [isDuplicateElementModalOpen, setIsDuplicateElementModalOpen] = useState(false);
    const [isUnsavedChangesModalOpen, setIsUnsavedChangesModalOpen] = useState(false);
    const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false);
    const [isFinalClearHistoryModalOpen, setIsFinalClearHistoryModalOpen] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
    const [isSavingChanges, setIsSavingChanges] = useState(false);
    const [isDuplicatingElement, setIsDuplicatingElement] = useState(false);
    const [selectedElementTimeOffset, setSelectedElementTimeOffset] = useState<number>(0);

    // Responsive breakpoint for mobile layout
    const isMobile = useBreakpointValue({ base: true, lg: false });

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

    // Edit queue for tracking changes
    const editQueueHook = useScriptElementsWithEditQueue(scriptId);
    const { 
        elements: editQueueElements, 
        pendingOperations, 
        hasUnsavedChanges,
        revertToPoint,
        applyLocalChange,
        discardChanges
    } = editQueueHook;

    // Active mode state using script-specific hook
    const { activeMode, setActiveMode, getAvailableModes } = useScriptModes('view');

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
            setIsUnsavedChangesModalOpen(true);
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
                setIsUnsavedChangesModalOpen(false);
                // Handle dashboard navigation with state
                if (pendingNavigation === '/dashboard') {
                    navigate(pendingNavigation, {
                        state: {
                            view: 'shows',
                            selectedShowId: script?.showID,
                            selectedScriptId: scriptId,
                            returnFromManage: true
                        }
                    });
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
        setIsUnsavedChangesModalOpen(false);
        if (pendingNavigation) {
            // Handle dashboard navigation with state
            if (pendingNavigation === '/dashboard') {
                navigate(pendingNavigation, {
                    state: {
                        view: 'shows',
                        selectedShowId: script?.showID,
                        selectedScriptId: scriptId,
                        returnFromManage: true
                    }
                });
            } else {
                navigate(pendingNavigation);
            }
            setPendingNavigation(null);
        }
    };

    const handleCancelNavigation = () => {
        setIsUnsavedChangesModalOpen(false);
        setPendingNavigation(null);
    };

    // Callback for child components to update scroll state
    const handleScrollStateChange = (newScrollState: {
        isAtTop: boolean;
        isAtBottom: boolean;
        allElementsFitOnScreen: boolean;
    }) => {
        setScrollState(newScrollState);
    };

    // Tool buttons configuration - separate view states from tools
    const getToolButtons = (): ToolButton[] => {
        const buttons: ToolButton[] = [];
        
        // NAVIGATION BUTTONS - At the very top
        buttons.push({
            id: 'jump-top',
            icon: 'jump-top',
            label: 'HEAD',
            description: 'Jump to Top',
            isActive: false,
            isDisabled: scrollState.allElementsFitOnScreen || scrollState.isAtTop
        });
        
        buttons.push({
            id: 'jump-bottom',
            icon: 'jump-bottom',
            label: 'TAIL',
            description: 'Jump to Bottom',
            isActive: false,
            isDisabled: scrollState.allElementsFitOnScreen || scrollState.isAtBottom
        });
        
        // VIEW STATES
        buttons.push({
            id: 'view',
            icon: 'view',
            label: 'VIEW',
            description: 'View Mode',
            isActive: activeMode === 'view',
            isDisabled: false
        });
        
        buttons.push({
            id: 'edit',
            icon: 'script-edit',
            label: 'EDIT',
            description: 'Edit Mode',
            isActive: activeMode === 'edit',
            isDisabled: false
        });
        
        buttons.push({
            id: 'info',
            icon: 'info',
            label: 'INFO',
            description: 'Script Information',
            isActive: activeMode === 'info',
            isDisabled: false
        });
        
        buttons.push({
            id: 'history',
            icon: 'history',
            label: 'HISTORY',
            description: 'View Edit History',
            isActive: activeMode === 'history',
            isDisabled: !hasUnsavedChanges
        });
        
        buttons.push({
            id: 'exit',
            icon: 'exit',
            label: 'EXIT',
            description: 'Return to Dashboard',
            isActive: false,
            isDisabled: false
        });
        
        // MODE-SPECIFIC TOOLS
        if (activeMode === 'view') {
            buttons.push({
                id: 'play',
                icon: 'play',
                label: 'PLAY',
                description: 'Performance Mode',
                isActive: false,
                isDisabled: false
            });
            
            buttons.push({
                id: 'share',
                icon: 'share',
                label: 'SHARE',
                description: 'Share Script',
                isActive: false,
                isDisabled: false
            });
        } else if (activeMode === 'history') {
            buttons.push({
                id: 'clear-history',
                icon: 'delete',
                label: 'CLEAR',
                description: 'Clear Edit History',
                isActive: false,
                isDisabled: !hasUnsavedChanges
            });
        } else if (activeMode === 'edit') {
            const hasSelection = !!selectedElementId;
            
            buttons.push({
                id: 'add-element',
                icon: 'add',
                label: 'ADD',
                description: 'Add Script Element',
                isActive: false,
                isDisabled: false
            });
            
            buttons.push({
                id: 'edit-element',
                icon: 'element-edit',
                label: 'MODIFY',
                description: 'Edit Selected Element',
                isActive: false,
                isDisabled: !hasSelection
            });
            
            buttons.push({
                id: 'duplicate-element',
                icon: 'copy',
                label: 'COPY',
                description: 'Duplicate Selected Element',
                isActive: false,
                isDisabled: !hasSelection
            });
            
            buttons.push({
                id: 'group-elements',
                icon: 'group',
                label: 'STACK',
                description: 'Group Selected Elements',
                isActive: false,
                isDisabled: true // Not implemented yet
            });
            
            buttons.push({
                id: 'delete-element',
                icon: 'delete',
                label: 'TRASH',
                description: 'Delete Selected Element',
                isActive: false,
                isDisabled: !hasSelection
            });
        }
        // INFO mode has no tools - just view states
        
        return buttons;
    };

    const toolButtons = getToolButtons();

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
            handleJumpToTop();
            return;
        }
        if (modeId === 'jump-bottom') {
            handleJumpToBottom();
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
                    setIsAddElementModalOpen(true);
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
            setIsUnsavedChangesModalOpen(true);
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
        setIsClearHistoryModalOpen(true);
    };

    const handleInitialClearHistoryConfirm = () => {
        setIsClearHistoryModalOpen(false);
        setIsFinalClearHistoryModalOpen(true);
    };

    const handleFinalClearHistoryConfirm = () => {
        // Clear the edit queue (restore to server state)
        discardChanges();
        setIsFinalClearHistoryModalOpen(false);
        setActiveMode('view'); // Return to view mode
        showSuccess('Edit History Cleared', 'All changes have been discarded and the script has been restored to its original state.');
    };

    const handleClearHistoryCancel = () => {
        setIsClearHistoryModalOpen(false);
        setIsFinalClearHistoryModalOpen(false);
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
                    returnFromManage: true
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
        // Navigate directly to the new script's manage page
        navigate(`/scripts/${newScriptId}/manage`);
    };

    const handleDuplicationError = () => {
        setIsProcessingModalOpen(false);
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
                });
            } else {
                // Insert at specific position using CREATE_ELEMENT_AT_INDEX
                applyLocalChange({
                    type: 'CREATE_ELEMENT_AT_INDEX',
                    elementId: cleanElementData.elementID,
                    elementData: cleanElementData,
                    insertIndex: insertIndex
                });
            }
        } else {
            // No auto-sort, just add to the end
            const { _autoSort, ...cleanElementData } = elementData;
            applyLocalChange({
                type: 'CREATE_ELEMENT',
                elementId: cleanElementData.elementID,
                elementData: cleanElementData
            });
        }
        
        setIsAddElementModalOpen(false);
        showSuccess('Script Element Created', 'New element added to script. Save to apply changes.');
    };

    const handleAutoSortElements = async () => {
        if (!scriptId) return;

        try {
            const token = await getToken();
            if (!token) {
                showError('Authentication required');
                return;
            }

            const response = await fetch(`/api/scripts/${scriptId}/auto-sort-elements`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Auto-sort endpoint error:', response.status, errorText);
                throw new Error(`Failed to auto-sort elements: ${response.status} - ${errorText}`);
            }

            // Refetch elements to show the updated order
            if (activeMode === 'view' && viewModeRef.current) {
                await viewModeRef.current.refetchElements();
            } else if (activeMode === 'edit' && editModeRef.current) {
                await editModeRef.current.refetchElements();
            }

        } catch (error) {
            console.error('Error auto-sorting elements:', error);
            showError('Failed to auto-sort elements. Please try again.');
        }
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
            setIsDuplicateElementModalOpen(true);

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
                    });
                } else {
                    // Insert at specific position using CREATE_ELEMENT_AT_INDEX
                    applyLocalChange({
                        type: 'CREATE_ELEMENT_AT_INDEX',
                        elementId: duplicateData.elementID,
                        elementData: duplicateData,
                        insertIndex: insertIndex
                    });
                }
            } else {
                // No auto-sort, just add to the end
                applyLocalChange({
                    type: 'CREATE_ELEMENT',
                    elementId: duplicateData.elementID,
                    elementData: duplicateData
                });
            }

            showSuccess('Script Element Duplicated', 'Script element has been duplicated. Save to apply changes.');
            setIsDuplicateElementModalOpen(false);

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

    const handleJumpToTop = () => {
        console.log('Jump to top clicked, active mode:', activeMode);
        
        // For edit and view modes, find the inner scrollable container (the one inside the mode component)
        // For other modes, use the main container
        let scrollContainer: HTMLElement | null = null;
        
        if (activeMode === 'edit' || activeMode === 'view') {
            // Look for the hide-scrollbar container that contains the script elements
            const hideScrollbarContainers = document.querySelectorAll('.hide-scrollbar');
            console.log(`Found ${hideScrollbarContainers.length} hide-scrollbar containers`);
            
            // Find the one that's scrollable and has the most content (likely the elements list)
            let maxScrollHeight = 0;
            for (const container of hideScrollbarContainers) {
                if (container instanceof HTMLElement && container.scrollHeight > container.clientHeight) {
                    console.log(`Container with scrollHeight: ${container.scrollHeight}, clientHeight: ${container.clientHeight}`);
                    if (container.scrollHeight > maxScrollHeight) {
                        maxScrollHeight = container.scrollHeight;
                        scrollContainer = container;
                    }
                }
            }
        } else {
            // For info, play, share modes, use the main edit-form-container
            const mainContainer = document.querySelector('.edit-form-container');
            if (mainContainer instanceof HTMLElement) {
                scrollContainer = mainContainer;
            }
        }
        
        if (scrollContainer) {
            console.log('Scrolling to top, container:', scrollContainer);
            scrollContainer.scrollTop = 0;
        } else {
            console.log('No scrollable container found');
        }
    };

    const handleJumpToBottom = () => {
        console.log('Jump to bottom clicked, active mode:', activeMode);
        
        // For edit and view modes, find the inner scrollable container (the one inside the mode component)
        // For other modes, use the main container
        let scrollContainer: HTMLElement | null = null;
        
        if (activeMode === 'edit' || activeMode === 'view') {
            // Look for the hide-scrollbar container that contains the script elements
            const hideScrollbarContainers = document.querySelectorAll('.hide-scrollbar');
            console.log(`Found ${hideScrollbarContainers.length} hide-scrollbar containers`);
            
            // Find the one that's scrollable and has the most content (likely the elements list)
            let maxScrollHeight = 0;
            for (const container of hideScrollbarContainers) {
                if (container instanceof HTMLElement && container.scrollHeight > container.clientHeight) {
                    console.log(`Container with scrollHeight: ${container.scrollHeight}, clientHeight: ${container.clientHeight}`);
                    if (container.scrollHeight > maxScrollHeight) {
                        maxScrollHeight = container.scrollHeight;
                        scrollContainer = container;
                    }
                }
            }
        } else {
            // For info, play, share modes, use the main edit-form-container
            const mainContainer = document.querySelector('.edit-form-container');
            if (mainContainer instanceof HTMLElement) {
                scrollContainer = mainContainer;
            }
        }
        
        if (scrollContainer) {
            console.log('Scrolling to bottom, container:', scrollContainer, 'scrollHeight:', scrollContainer.scrollHeight);
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        } else {
            console.log('No scrollable container found');
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
        setIsDeleteCueModalOpen(true);
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
            });

            showSuccess('Script Element Deleted', 'Script element has been deleted. Save to apply changes.');
            
            // Clear selection and close modal
            setSelectedElementId(null);
            setIsDeleteCueModalOpen(false);

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
            onClick: () => setIsOptionsModalOpen(true),
            isDestructive: false,
            isDisabled: false
        },
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
                                {activeMode === 'view' && <ViewMode ref={viewModeRef} scriptId={scriptId || ''} colorizeDepNames={activePreferences.colorizeDepNames} showClockTimes={activePreferences.showClockTimes} onScrollStateChange={handleScrollStateChange} elements={editQueueElements} />}
                                {activeMode === 'edit' && <EditMode ref={editModeRef} scriptId={scriptId || ''} colorizeDepNames={activePreferences.colorizeDepNames} showClockTimes={activePreferences.showClockTimes} autoSortCues={activePreferences.autoSortCues} onAutoSortChange={async (value) => await updatePreference('autoSortCues', value)} onScrollStateChange={handleScrollStateChange} elements={editQueueElements} onApplyLocalChange={editQueueHook.applyLocalChange} />}
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

            {/* Duplicate Script Modal */}
            <DuplicateScriptModal
                isOpen={isDuplicateModalOpen}
                onClose={() => setIsDuplicateModalOpen(false)}
                showId={script?.showID || ''}
                scriptId={script?.scriptID || ''}
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

            {/* Clear History Confirmation Modals */}
            <DeleteConfirmationModal
                isOpen={isClearHistoryModalOpen}
                onClose={handleClearHistoryCancel}
                onConfirm={handleInitialClearHistoryConfirm}
                entityType="Edit History"
                entityName={`${pendingOperations.length} unsaved changes`}
            />

            <FinalDeleteConfirmationModal
                isOpen={isFinalClearHistoryModalOpen}
                onClose={handleClearHistoryCancel}
                onConfirm={handleFinalClearHistoryConfirm}
                isLoading={false}
                entityType="Edit History"
                entityName="All unsaved changes"
                warningMessage="This will permanently discard all your unsaved changes and restore the script to its original loaded state. This action cannot be undone."
            />

            {/* Add Script Element Modal */}
            <AddScriptElementModal
                isOpen={isAddElementModalOpen}
                onClose={() => setIsAddElementModalOpen(false)}
                scriptId={scriptId || ''}
                onElementCreated={handleElementCreated}
                autoSortCues={activePreferences.autoSortCues}
            />

            {/* Options Modal */}
            <OptionsModal
                isOpen={isOptionsModalOpen}
                onClose={() => {
                    setIsOptionsModalOpen(false);
                    setPreviewPreferences(null);
                }}
                initialOptions={{ darkMode, colorizeDepNames, autoSortCues, showClockTimes }}
                onPreview={(preferences) => setPreviewPreferences(preferences)}
                onSave={async (newPreferences) => {
                    const success = await updatePreferences(newPreferences);
                    setPreviewPreferences(null);
                    // If auto-sort is being enabled, trigger immediate re-sort
                    if (success && newPreferences.autoSortCues && !autoSortCues && scriptId) {
                        handleAutoSortElements();
                    }
                }}
            />

            {/* Delete Cue Confirmation Modal */}
            <DeleteCueModal
                isOpen={isDeleteCueModalOpen}
                onClose={() => setIsDeleteCueModalOpen(false)}
                onConfirm={handleConfirmDeleteCue}
                cueName={selectedElementName}
                isDeleting={isDeletingCue}
            />

            {/* Duplicate Element Modal */}
            <DuplicateElementModal
                isOpen={isDuplicateElementModalOpen}
                onClose={() => setIsDuplicateElementModalOpen(false)}
                onConfirm={handleConfirmDuplicate}
                originalElementName={selectedElementName}
                originalTimeOffset={selectedElementTimeOffset}
                isProcessing={isDuplicatingElement}
            />

            <UnsavedChangesModal
                isOpen={isUnsavedChangesModalOpen}
                onClose={handleCancelNavigation}
                onSave={handleSaveAndContinue}
                onDiscard={handleDiscardChanges}
                changesCount={pendingOperations.length}
                isSaving={isSavingChanges}
            />

            {/* Mobile Drawer Menu */}
            <Drawer isOpen={isMenuOpen} placement="right" onClose={onMenuClose}>
                <DrawerOverlay />
                <DrawerContent key={activeMode} bg="page.background">
                    <DrawerCloseButton
                        borderRadius="full"
                        border="3px solid"
                        borderColor="blue.400"
                        bg="inherit"
                        _hover={{ borderColor: 'orange.400' }}
                    />
                    <DrawerHeader>Script Tools</DrawerHeader>
                    <DrawerBody>
                        <VStack spacing={4} align="stretch">
                            {/* Navigation buttons */}
                            {toolButtons
                                .filter(tool => tool.id === 'jump-top' || tool.id === 'jump-bottom')
                                .map((tool) => (
                                <Button
                                    key={tool.id}
                                    leftIcon={
                                        <AppIcon
                                            name={tool.icon}
                                            boxSize="20px"
                                        />
                                    }
                                    bg={tool.isActive && !tool.isDisabled ? "blue.400" : tool.isDisabled ? "button.disabled.bg" : "card.background"}
                                    color={tool.isActive && !tool.isDisabled ? "white" : tool.isDisabled ? "button.disabled.text" : "button.text"}
                                    border="1px solid"
                                    borderColor={tool.isActive && !tool.isDisabled ? "blue.400" : "container.border"}
                                    isDisabled={tool.isDisabled}
                                    onClick={() => {
                                        if (!tool.isDisabled) {
                                            handleModeChange(tool.id);
                                            onMenuClose();
                                        }
                                    }}
                                    justifyContent="flex-start"
                                    width="100%"
                                    _hover={tool.isDisabled ? {} : {
                                        bg: "orange.400",
                                        color: "white",
                                        borderColor: "orange.400"
                                    }}
                                    _active={tool.isDisabled ? {} : {
                                        transform: "scale(0.98)"
                                    }}
                                    transition="all 0.2s"
                                    cursor={tool.isDisabled ? "not-allowed" : "pointer"}
                                    opacity={tool.isDisabled ? 0.4 : 1}
                                >
                                    {tool.label}
                                </Button>
                            ))}
                            
                            {/* Separator after navigation */}
                            {toolButtons.some(tool => tool.id === 'jump-top' || tool.id === 'jump-bottom') && (
                                <Divider borderColor="container.border" />
                            )}
                            
                            {/* View state buttons */}
                            {toolButtons
                                .filter(tool => ['view', 'edit', 'info', 'history', 'exit'].includes(tool.id))
                                .map((tool) => (
                                <Button
                                    key={tool.id}
                                    leftIcon={
                                        <AppIcon
                                            name={tool.icon}
                                            boxSize="20px"
                                        />
                                    }
                                    bg={tool.isActive && !tool.isDisabled ? "blue.400" : tool.isDisabled ? "button.disabled.bg" : "card.background"}
                                    color={tool.isActive && !tool.isDisabled ? "white" : tool.isDisabled ? "button.disabled.text" : "button.text"}
                                    border="1px solid"
                                    borderColor={tool.isActive && !tool.isDisabled ? "blue.400" : "container.border"}
                                    isDisabled={tool.isDisabled}
                                    onClick={() => {
                                        if (!tool.isDisabled) {
                                            handleModeChange(tool.id);
                                            onMenuClose();
                                        }
                                    }}
                                    justifyContent="flex-start"
                                    width="100%"
                                    _hover={tool.isDisabled ? {} : {
                                        bg: "orange.400",
                                        color: "white",
                                        borderColor: "orange.400"
                                    }}
                                    _active={tool.isDisabled ? {} : {
                                        transform: "scale(0.98)"
                                    }}
                                    transition="all 0.2s"
                                    cursor={tool.isDisabled ? "not-allowed" : "pointer"}
                                    opacity={tool.isDisabled ? 0.4 : 1}
                                >
                                    {tool.label}
                                </Button>
                            ))}
                            
                            {/* Separator before tools */}
                            {toolButtons.some(tool => 
                                !['jump-top', 'jump-bottom', 'view', 'edit', 'info', 'history', 'exit'].includes(tool.id)
                            ) && activeMode !== 'info' && (
                                <Divider borderColor="container.border" />
                            )}
                            
                            {/* Tool buttons */}
                            {toolButtons
                                .filter(tool => 
                                    !['jump-top', 'jump-bottom', 'view', 'edit', 'info', 'history', 'exit'].includes(tool.id)
                                )
                                .map((tool) => (
                                <Button
                                    key={tool.id}
                                    leftIcon={
                                        <AppIcon
                                            name={tool.icon}
                                            boxSize="20px"
                                        />
                                    }
                                    bg={tool.isActive && !tool.isDisabled ? "blue.400" : tool.isDisabled ? "button.disabled.bg" : "card.background"}
                                    color={tool.isActive && !tool.isDisabled ? "white" : tool.isDisabled ? "button.disabled.text" : "button.text"}
                                    border="1px solid"
                                    borderColor={tool.isActive && !tool.isDisabled ? "blue.400" : "container.border"}
                                    isDisabled={tool.isDisabled}
                                    onClick={() => {
                                        if (!tool.isDisabled) {
                                            handleModeChange(tool.id);
                                            onMenuClose();
                                        }
                                    }}
                                    justifyContent="flex-start"
                                    width="100%"
                                    _hover={tool.isDisabled ? {} : {
                                        bg: "orange.400",
                                        color: "white",
                                        borderColor: "orange.400"
                                    }}
                                    _active={tool.isDisabled ? {} : {
                                        transform: "scale(0.98)"
                                    }}
                                    transition="all 0.2s"
                                    cursor={tool.isDisabled ? "not-allowed" : "pointer"}
                                    opacity={tool.isDisabled ? 0.4 : 1}
                                >
                                    {tool.label}
                                </Button>
                            ))}
                        </VStack>
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        </ErrorBoundary>
    );
};