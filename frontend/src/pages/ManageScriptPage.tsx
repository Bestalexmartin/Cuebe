// frontend/src/pages/ManageScriptPage.tsx

import React, { useState, useRef } from 'react';
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
import { useParams, useNavigate } from "react-router-dom";
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
import { useEnhancedToast } from '../utils/toastUtils';
import { useValidatedForm } from '../hooks/useValidatedForm';
import { ValidationRules, FormValidationConfig } from '../types/validation';
import { convertUTCToLocal, convertLocalToUTC } from '../utils/dateTimeUtils';
import { useChangeDetection } from '../hooks/useChangeDetection';
import { useUserOptions, UserOptions } from '../hooks/useUserOptions';

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
    icon: 'view' | 'play' | 'info' | 'script-edit' | 'share' | 'dashboard' | 'add' | 'copy' | 'group' | 'delete' | 'element-edit' | 'jump-top' | 'jump-bottom';
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
    const [previewOptions, setPreviewOptions] = useState<UserOptions | null>(null);
    const { 
        options: { colorizeDepNames, showClockTimes, autoSortCues }, 
        updateOption,
        updateOptions
    } = useUserOptions();

    // Use preview options when modal is open, otherwise use saved options
    const activeOptions = isOptionsModalOpen && previewOptions 
        ? previewOptions 
        : { colorizeDepNames, showClockTimes, autoSortCues };

    // Delete cue state management  
    const [isDeleteCueModalOpen, setIsDeleteCueModalOpen] = useState(false);
    const [isDeletingCue, setIsDeletingCue] = useState(false);
    const [selectedElementName, setSelectedElementName] = useState<string>('');

    // Duplicate element state management
    const [isDuplicateElementModalOpen, setIsDuplicateElementModalOpen] = useState(false);
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

    // Tool buttons configuration - changes based on active mode
    const getToolButtons = (): ToolButton[] => {
        if (activeMode === 'edit') {
            // Check if an element is selected in edit mode
            const hasSelection = !!selectedElementId;
            
            // In edit mode, show element action buttons
            return [
                {
                    id: 'view',
                    icon: 'view',
                    label: 'View',
                    description: 'Switch to View Mode',
                    isActive: false,
                    isDisabled: false
                },
                {
                    id: 'jump-top',
                    icon: 'jump-top',
                    label: 'Top',
                    description: 'Jump to Top',
                    isActive: false,
                    isDisabled: false
                },
                {
                    id: 'jump-bottom',
                    icon: 'jump-bottom',
                    label: 'Bottom',
                    description: 'Jump to Bottom',
                    isActive: false,
                    isDisabled: false
                },
                {
                    id: 'add-element',
                    icon: 'add',
                    label: 'Add',
                    description: 'Add Script Element',
                    isActive: false,
                    isDisabled: false
                },
                {
                    id: 'edit-element',
                    icon: 'element-edit',
                    label: 'Edit',
                    description: 'Edit Selected Element',
                    isActive: false,
                    isDisabled: !hasSelection
                },
                {
                    id: 'duplicate-element',
                    icon: 'copy',
                    label: 'Duplicate',
                    description: 'Duplicate Selected Element',
                    isActive: false,
                    isDisabled: !hasSelection
                },
                {
                    id: 'group-elements',
                    icon: 'group',
                    label: 'Group',
                    description: 'Group Selected Elements',
                    isActive: false,
                    isDisabled: true
                },
                {
                    id: 'delete-element',
                    icon: 'delete',
                    label: 'Delete',
                    description: 'Delete Selected Element',
                    isActive: false,
                    isDisabled: !hasSelection
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
        } else {
            // In view, info, play, share modes, show mode switching buttons
            const availableModes = getAvailableModes();
            const buttons: ToolButton[] = [];
            
            // Add each mode button and insert jump buttons after VIEW
            availableModes.forEach(mode => {
                let icon: ToolButton['icon'];
                switch (mode.id) {
                    case 'view':
                        icon = 'view';
                        break;
                    case 'play':
                        icon = 'play';
                        break;
                    case 'info':
                        icon = 'info';
                        break;
                    case 'edit':
                        icon = 'script-edit';
                        break;
                    case 'share':
                        icon = 'share';
                        break;
                    default:
                        icon = 'view';
                        break;
                }
                
                buttons.push({
                    id: mode.id,
                    icon,
                    label: mode.label,
                    description: `${mode.label} Script`,
                    isActive: activeMode === mode.id,
                    isDisabled: mode.isDisabled
                });
                
                // Add jump buttons after VIEW mode
                if (mode.id === 'view') {
                    buttons.push({
                        id: 'jump-top',
                        icon: 'jump-top',
                        label: 'Top',
                        description: 'Jump to Top',
                        isActive: false,
                        isDisabled: false
                    });
                    buttons.push({
                        id: 'jump-bottom',
                        icon: 'jump-bottom',
                        label: 'Bottom',
                        description: 'Jump to Bottom',
                        isActive: false,
                        isDisabled: false
                    });
                }
            });
            
            // Add dashboard button at the end
            buttons.push({
                id: 'dashboard',
                icon: 'dashboard',
                label: 'Dashboard',
                description: 'Return to Dashboard',
                isActive: false,
                isDisabled: false
            });
            
            return buttons;
        }
    };

    const toolButtons = getToolButtons();

    const handleModeChange = (modeId: string) => {
        // Handle dashboard navigation separately
        if (modeId === 'dashboard') {
            handleCancel();
            return;
        }

        // Handle element actions in edit mode
        if (activeMode === 'edit') {
            switch (modeId) {
                case 'view':
                    setActiveMode('view');
                    return;
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
                case 'jump-top':
                    handleJumpToTop();
                    return;
                case 'jump-bottom':
                    handleJumpToBottom();
                    return;
            }
        }

        // Handle jump buttons for view, info, play, share modes
        if (modeId === 'jump-top') {
            handleJumpToTop();
            return;
        }
        if (modeId === 'jump-bottom') {
            handleJumpToBottom();
            return;
        }

        // Handle mode switching for view, info, play, share modes
        const tool = toolButtons.find(t => t.id === modeId);
        if (tool && !tool.isDisabled) {
            setActiveMode(modeId as any); // Type assertion for now, will be improved with better types
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
        navigate('/dashboard', {
            state: {
                view: 'shows',
                selectedShowId: script?.showID,
                selectedScriptId: scriptId,
                returnFromManage: true
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
    const handleElementCreated = async () => {
        // Close the modal and refetch elements to show the new cue in context
        setIsAddElementModalOpen(false);

        // Call refetch on the active mode (element is already in correct position)
        if (activeMode === 'view' && viewModeRef.current) {
            await viewModeRef.current.refetchElements();
        } else if (activeMode === 'edit' && editModeRef.current) {
            await editModeRef.current.refetchElements();
        }
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
            const token = await getToken();
            if (!token) {
                showError('Authentication required');
                return;
            }

            // First, get the original element data
            const elementResponse = await fetch(`/api/elements/${selectedElementId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!elementResponse.ok) {
                throw new Error('Failed to fetch element for duplication');
            }

            const elementData = await elementResponse.json();

            // Create duplicate with new description and time offset
            const duplicateData = {
                ...elementData,
                description,
                timeOffsetMs,
                // Remove fields that should not be duplicated
                elementID: undefined,
                created_at: undefined,
                updated_at: undefined,
                is_deleted: undefined
            };

            const response = await fetch(`/api/scripts/${scriptId}/elements`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(duplicateData)
            });

            if (!response.ok) {
                throw new Error('Failed to duplicate element');
            }

            showSuccess('Script Element Duplicated', 'Script element has been successfully duplicated');
            
            // Update local elements to show the new duplicate immediately
            await response.json(); // Parse response but don't store
            if (activeMode === 'edit' && editModeRef.current) {
                await editModeRef.current.refetchElements();
            }

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
            setIsDeleteCueModalOpen(true);

        } catch (error) {
            console.error('Error fetching element details:', error);
            showError('Failed to load element details. Please try again.');
        }
    };

    const handleConfirmDeleteCue = async () => {
        if (!selectedElementId) {
            return;
        }

        setIsDeletingCue(true);
        try {
            const token = await getToken();
            if (!token) {
                showError('Authentication required');
                return;
            }

            const response = await fetch(`/api/elements/${selectedElementId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete element');
            }

            showSuccess('Script Element Deleted', 'Script element has been successfully deleted');
            
            // Clear selection and refetch elements
            setSelectedElementId(null);
            if (activeMode === 'edit' && editModeRef.current) {
                await editModeRef.current.refetchElements();
            }

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
                        bg="white"
                        _dark={{ bg: "gray.700" }}
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
                                {activeMode === 'view' && <ViewMode ref={viewModeRef} scriptId={scriptId || ''} colorizeDepNames={activeOptions.colorizeDepNames} showClockTimes={activeOptions.showClockTimes} />}
                                {activeMode === 'edit' && <EditMode ref={editModeRef} scriptId={scriptId || ''} colorizeDepNames={activeOptions.colorizeDepNames} showClockTimes={activeOptions.showClockTimes} autoSortCues={activeOptions.autoSortCues} onAutoSortChange={async (value) => await updateOption('autoSortCues', value)} />}
                                {activeMode === 'play' && <PlayMode />}
                                {activeMode === 'share' && <ShareMode />}
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

            {/* Add Script Element Modal */}
            <AddScriptElementModal
                isOpen={isAddElementModalOpen}
                onClose={() => setIsAddElementModalOpen(false)}
                scriptId={scriptId || ''}
                onElementCreated={handleElementCreated}
                autoSortCues={activeOptions.autoSortCues}
            />

            {/* Options Modal */}
            <OptionsModal
                isOpen={isOptionsModalOpen}
                onClose={() => {
                    setIsOptionsModalOpen(false);
                    setPreviewOptions(null);
                }}
                initialOptions={{ colorizeDepNames, autoSortCues, showClockTimes }}
                onPreview={(options) => setPreviewOptions(options)}
                onSave={async (newOptions) => {
                    const success = await updateOptions(newOptions);
                    setPreviewOptions(null);
                    // If auto-sort is being enabled, trigger immediate re-sort
                    if (success && newOptions.autoSortCues && !autoSortCues && scriptId) {
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

            {/* Mobile Drawer Menu */}
            <Drawer isOpen={isMenuOpen} placement="right" onClose={onMenuClose}>
                <DrawerOverlay />
                <DrawerContent key={activeMode}>
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
                            {toolButtons.map((tool) => (
                                <Button
                                    key={tool.id}
                                    leftIcon={
                                        <AppIcon
                                            name={tool.icon}
                                            boxSize="20px"
                                        />
                                    }
                                    variant={tool.isActive ? "solid" : "outline"}
                                    colorScheme={tool.isActive ? "blue" : "gray"}
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
                                        bg: tool.isActive ? "orange.400" : "orange.500",
                                        color: "white",
                                        borderColor: "orange.300"
                                    }}
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