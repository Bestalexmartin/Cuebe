// frontend/src/pages/ManageScriptPage.tsx

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    VStack,
    Text,
    Spinner,
    Flex,
    useBreakpointValue,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalBody
} from "@chakra-ui/react";
import { useParams, useNavigate } from "react-router-dom";
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useValidatedFormSchema } from '../components/forms/ValidatedForm';
import { useEnhancedToast } from '../utils/toastUtils';
import { convertLocalToUTC } from '../utils/timeUtils';
import { useUserPreferences, UserPreferences } from '../hooks/useUserPreferences';
import { useScriptSync } from '../hooks/useScriptSync';
import { useScriptSyncContext } from '../contexts/ScriptSyncContext';
import { ShowTimeEngineProvider, useShowTimeControls } from '../contexts/ShowTimeEngineProvider';
// Save flow extracted into hook
import { useSaveScript } from '../features/script/hooks/useSaveScript';
import { EditQueueFormatter } from '../features/script/utils/editQueueFormatter';
import { SaveConfirmationModal } from '../components/modals/SaveConfirmationModal';
import { BaseModal } from '../components/base/BaseModal';
import { PlaybackOverlay } from '../features/script/components/PlaybackOverlay';
import { ScriptHeader } from '../features/script/components/ScriptHeader';
import { ScriptDataProvider, useScriptData } from '../contexts/ScriptDataContext';
import { ModalProvider, useModalContext } from '../contexts/ModalContext';
import { useAuth } from '@clerk/clerk-react';

import { ScriptToolbar } from '../features/script/components/ScriptToolbar';
import { useAutoSave } from '../hooks/useAutoSave';
import { ViewMode, ViewModeRef } from '../features/script/components/modes/ViewMode';
import { EditMode, EditModeRef } from '../features/script/components/modes/EditMode';
import { useScriptModes } from '../features/script/hooks/useScriptModes';
import { useElementActions } from '../features/script/hooks/useElementActions';
import { ScriptModals } from '../features/script/components/ScriptModals';
import { FilterDepartmentsModal } from '../features/script/components/modals/FilterDepartmentsModal';
import { MobileScriptDrawer } from '../features/script/components/MobileScriptDrawer';
import { getToolbarButtons, ToolbarContext } from '../features/script/utils/toolbarConfig';
import { InfoMode } from '../features/script/components/modes/InfoMode';
import { EditHistoryView } from '../components/EditHistoryView';

import { useElementModalActions } from '../features/script/hooks/useElementModalActions';
import { useScriptModalHandlers } from '../features/script/hooks/useScriptModalHandlers';

// Component to update ShowTimeEngine when script changes
const ScriptAwareShowTimeEngineUpdater: React.FC<{ script: any; children: React.ReactNode }> = ({ script, children }) => {
    const { engine } = useShowTimeControls();
    
    useEffect(() => {
        if (script?.start_time) {
            engine.setScript(script.start_time);
        }
    }, [engine, script?.start_time]);
    
    return <>{children}</>;
};
import { useScriptNavigation } from '../hooks/useScriptNavigation';
import { useScriptFormSync } from '../features/script/hooks/useScriptFormSync';
import { useScriptUIState } from '../features/script/hooks/useScriptUIState';
import { useScriptModeHandlers } from '../features/script/hooks/useScriptModeHandlers';
import { useScriptSharing } from '../features/script/hooks/useScriptSharing';
import { useScriptModalConfig } from '../features/script/hooks/useScriptModalConfig';
import { createActionMenuConfig } from '../features/script/config/actionMenuConfig';
import { FloatingValidationErrorPanel } from '../components/base/FloatingValidationErrorPanel';
import { exportScriptAsCSV } from '../features/script/export/utils/csvExporter';



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
const ManageScriptPageInner: React.FC<ManageScriptPageProps & { getToken: () => Promise<string | null> }> = React.memo(({ 
    isMenuOpen, 
    onMenuClose, 
    getToken 
}) => {

    const contentAreaRef = useRef<HTMLDivElement>(null);
    const [contentAreaBounds, setContentAreaBounds] = useState<DOMRect | null>(null);
    const { showSuccess, showError } = useEnhancedToast();
    const [saveErrorMessage, setSaveErrorMessage] = useState<string>('');

    const viewModeRef = useRef<ViewModeRef>(null);
    const editModeRef = useRef<EditModeRef>(null);

    const isMobile = useBreakpointValue({ base: true, lg: false }) ?? false;

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

    // Modal state from context
    const { modalNames: MODAL_NAMES, ...modalState } = useModalContext();

    // Script data from context
    const {
        scriptId,
        sourceScript,
        currentScript: contextCurrentScript,
        isLoadingScript,
        scriptError,
        setSourceScript,
        show,
        crewMembers,
        elements,
        allEditQueueElements,
        hasUnsavedChanges,
        pendingOperations,
        applyLocalChange: contextApplyLocalChange,
        discardChanges,
        updateServerElements,
        toggleGroupCollapse,
        expandAllGroups,
        collapseAllGroups,
        revertToPoint
    } = useScriptData();

    // Coordinated data refresh function will be defined after editQueueHook

    // Moved this hook call after preferences are defined

    // Ref to hold the actual rotation function from the icon
    const triggerRotationRef = useRef<(() => void) | null>(null);
    
    // Function to trigger rotation
    const triggerRotation = useCallback(() => {
        triggerRotationRef.current?.();
    }, []);

    // Real-time sync for collaborative editing
    const scriptSyncOptions = {
        onConnect: () => { },
        onDisconnect: () => { },
        onDataReceived: () => {
            triggerRotation(); // Trigger rotation for ping/pong
        }
    };

    // Real-time sync for collaborative editing - RESTORED
    const {
        isConnected: isSyncConnected,
        isConnecting: isSyncConnecting,
        connectionCount: syncConnectionCount,
        connectionError: syncConnectionError,
        sendUpdate: sendSyncUpdate,
        sendPlaybackCommand: sendSyncPlaybackCommand,
        sendPlaybackStatus: sendSyncPlaybackStatus,
        connect: connectSync
    } = useScriptSync(
        scriptId || '',
        undefined, // shareToken
        scriptSyncOptions
    );

    // Update ScriptSyncContext so header icon and counts work
    const { setSyncData } = useScriptSyncContext();
    // Only update sync context when values actually change to avoid update loops
    const lastSyncKeyRef = useRef<string>("");
    useEffect(() => {
        if (!scriptId) return;
        const key = [
            scriptId,
            isSyncConnected ? 1 : 0,
            isSyncConnecting ? 1 : 0,
            syncConnectionCount ?? 0,
            syncConnectionError ?? ''
        ].join('|');
        if (key !== lastSyncKeyRef.current) {
            lastSyncKeyRef.current = key;
            setSyncData({
                scriptId,
                isConnected: isSyncConnected,
                isConnecting: isSyncConnecting,
                connectionCount: syncConnectionCount,
                connectionError: syncConnectionError,
                userType: 'stage_manager' as const,
                triggerRotation: triggerRotationRef
            } as any);
        }
    }, [scriptId, isSyncConnected, isSyncConnecting, syncConnectionCount, syncConnectionError, setSyncData]);

    // Clear sync data only on unmount
    useEffect(() => {
        return () => {
            setSyncData(null);
        };
    }, [setSyncData]);


    // applyLocalChangeWithSync will be defined after editQueueHook

    const [previewPreferences, setPreviewPreferences] = useState<UserPreferences | null>(null);
    
    // Selection state (managed locally, used by elementActions)
    const [currentSelectedElementIds, setCurrentSelectedElementIds] = useState<string[]>([]);
    
    // UI state management (non-selection)
    const {
        isSharing,
        setIsSharing,
        isHiding,
        setIsHiding,
        isScriptShared,
        setIsScriptShared,
        shareCount,
        setShareCount,
        filteredDepartmentIds,
        setFilteredDepartmentIds,
        hasUserSetFilter,
        handleApplyDepartmentFilter,
        isHighlightingEnabled,
        handleHighlightingToggle,
        buttonShowsOpen,
        setButtonShowsOpen,
        groupOverrides,
        setGroupOverrides,
        scrollState,
        handleScrollStateChange
    } = useScriptUIState();

    // Derived selection state
    const hasSelection = currentSelectedElementIds.length > 0;
    const hasMultipleSelection = currentSelectedElementIds.length > 1;
    const selectedElement = useMemo(() => {
        if (currentSelectedElementIds.length === 1) {
            return elements?.find(el => el.element_id === currentSelectedElementIds[0]);
        }
        return undefined;
    }, [elements, currentSelectedElementIds]);

    // handleToggleAllGroups will be defined after editQueueHook

    const {
        preferences: { darkMode, colorizeDepNames, showClockTimes, autoSortCues, useMilitaryTime, dangerMode, autoSaveInterval, lookaheadSeconds, playHeartbeatIntervalSec },
        updatePreference,
        updatePreferences
    } = useUserPreferences();

    // Memoize elements array to prevent unnecessary re-renders
    // Use sourceScript object reference as dependency
    const elementsToPass = useMemo(() => 
        (sourceScript as any)?.elements || [], 
        [sourceScript]
    );

    // Always call hooks (React requirement), but conditionally process data
    const dataReady = sourceScript && !isLoadingScript;
    
    // Edit queue data now comes from context (reverted - not the culprit)
    const editQueueElements = elements;

    // Unified save function via hook (auto-save and manual save use this)
    const { saveChanges } = useSaveScript({
        scriptId,
        pendingOperations,
        getToken,
        discardChanges,
        updateServerElements,
        modalState,
        processingModalName: MODAL_NAMES.SAVE_PROCESSING,
        failureModalName: MODAL_NAMES.SAVE_FAILURE,
        setSaveErrorMessage,
        showError,
        triggerRotation,
        onSuccess: () => {
            // Optional additional success side-effects can be added here
        },
        setSourceScript,
        sendSyncUpdate: (message) => sendSyncUpdate(message),
        connectSync,
    });

    const handleToggleAllGroups = useCallback(() => {
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
    }, [buttonShowsOpen, expandAllGroups, collapseAllGroups]);

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

    // Check options modal state for preferences
    const isOptionsModalOpen = modalState.isOpen(MODAL_NAMES.OPTIONS);

    // Memoize individual preference values for stable EditMode props
    const editModeColorizeDepNames = useMemo(() => {
        return isOptionsModalOpen && previewPreferences ? previewPreferences.colorizeDepNames : colorizeDepNames;
    }, [isOptionsModalOpen, previewPreferences, colorizeDepNames]);

    const editModeShowClockTimes = useMemo(() => {
        return isOptionsModalOpen && previewPreferences ? previewPreferences.showClockTimes : showClockTimes;
    }, [isOptionsModalOpen, previewPreferences, showClockTimes]);

    const editModeAutoSortCues = useMemo(() => {
        return isOptionsModalOpen && previewPreferences ? previewPreferences.autoSortCues : currentAutoSortState;
    }, [isOptionsModalOpen, previewPreferences, currentAutoSortState]);

    const editModeUseMilitaryTime = useMemo(() => {
        return isOptionsModalOpen && previewPreferences ? previewPreferences.useMilitaryTime : useMilitaryTime;
    }, [isOptionsModalOpen, previewPreferences, useMilitaryTime]);

    // Memoize ViewMode preference props for stability
    const viewModeColorizeDepNames = editModeColorizeDepNames; // Same logic
    const viewModeShowClockTimes = editModeShowClockTimes; // Same logic
    const viewModeAutoSortCues = editModeAutoSortCues; // Same logic
    const viewModeUseMilitaryTime = editModeUseMilitaryTime; // Same logic

    const viewModeLookaheadSeconds = useMemo(() => {
        return isOptionsModalOpen && previewPreferences ? previewPreferences.lookaheadSeconds : lookaheadSeconds;
    }, [isOptionsModalOpen, previewPreferences, lookaheadSeconds]);

    // Use preview preferences when options modal is open, otherwise use saved preferences
    const activePreferences = useMemo(() => {
        return isOptionsModalOpen && previewPreferences
            ? previewPreferences
            : { darkMode, colorizeDepNames, showClockTimes, autoSortCues: currentAutoSortState, useMilitaryTime, dangerMode, autoSaveInterval, lookaheadSeconds, playHeartbeatIntervalSec };
    }, [isOptionsModalOpen, previewPreferences, darkMode, colorizeDepNames, showClockTimes, currentAutoSortState, useMilitaryTime, dangerMode, autoSaveInterval, lookaheadSeconds, playHeartbeatIntervalSec]);

    // Debug: Check if activePreferences is changing frequently
    const renderCountRef = useRef(0);
    const prevValuesRef = useRef<{ activePreferences?: any }>({});

    renderCountRef.current++;

    if (prevValuesRef.current.activePreferences) {
        const changed = JSON.stringify(prevValuesRef.current.activePreferences) !== JSON.stringify(activePreferences);
        if (changed) {
            console.log('🔄 activePreferences changed:', {
                prev: prevValuesRef.current.activePreferences,
                new: activePreferences,
                renderCount: renderCountRef.current
            });
        }
    }
    prevValuesRef.current.activePreferences = activePreferences;

    const { activeMode, setActiveMode } = useScriptModes('view');
    
    const applyLocalChange = contextApplyLocalChange;

    const { insertElement } = useElementActions(
        editQueueElements,
        activePreferences.autoSortCues,
        applyLocalChange  // Use wrapped applyLocalChange that blocks during VIEW mode
    );
    
    // Play state from ShowTimeEngine
    const { 
        playbackState, 
        isPlaybackPlaying, 
        isPlaybackPaused, 
        isPlaybackSafety, 
        isPlaybackComplete, 
        startPlayback, 
        pausePlayback, 
        stopPlayback, 
        safetyStop,
        setElementBoundaries, 
        engine
    } = useShowTimeControls();



    // Memoize playback-related props to prevent cascade re-renders
    const playbackProps = useMemo(() => ({
        playbackState,
        isPlaybackPlaying,
        isPlaybackPaused,
        isPlaybackSafety,
        isPlaybackComplete
    }), [playbackState, isPlaybackPlaying, isPlaybackPaused, isPlaybackSafety, isPlaybackComplete]);


    // Wipe edit history when entering COMPLETE state
    useEffect(() => {
        if (playbackState === 'COMPLETE') {
            discardChanges();
        }
    }, [playbackState, discardChanges]);

    // Script form synchronization hook - FIXED  
    const { currentScript, hasChanges, handleInfoModeExit, clearPendingChanges } = useScriptFormSync({
        sourceScript,
        pendingOperations,
        form,
        activeMode,
        applyLocalChange,
        setActiveMode
    });

    // Use form sync result or context fallback
    const effectiveCurrentScript = currentScript || contextCurrentScript;


    // Playback synchronization for scoped sides - using scriptSync's sendPlaybackCommand
    const sendPlaybackCommand = useCallback((command: string) => {
        if (sendSyncPlaybackCommand) {
            sendSyncPlaybackCommand(command);
            try {
                // Also send current cumulative pause so late joiners have accurate delay
                sendSyncPlaybackStatus?.(engine.totalPauseTime || 0);
            } catch {}
        }
    }, [sendSyncPlaybackCommand, sendSyncPlaybackStatus, engine]);

    // Late-joiner handshake: when connection (re)establishes, broadcast current state
    const prevConnectedRef = useRef<boolean>(false);
    useEffect(() => {
        if (isSyncConnected && !prevConnectedRef.current) {
            const stateToCommand = (state: string): 'PLAY' | 'PAUSE' | 'SAFETY' | 'COMPLETE' | 'STOP' => {
                switch (state) {
                    case 'PLAYING': return 'PLAY';
                    case 'PAUSED': return 'PAUSE';
                    case 'SAFETY': return 'SAFETY';
                    case 'COMPLETE': return 'COMPLETE';
                    default: return 'STOP';
                }
            };
            const cmd = stateToCommand(playbackState);
            try { sendPlaybackCommand(cmd); } catch {}
            try { sendSyncPlaybackStatus?.(engine.totalPauseTime || 0); } catch {}
        }
        prevConnectedRef.current = isSyncConnected;
    }, [isSyncConnected, playbackState, sendPlaybackCommand, sendSyncPlaybackStatus, engine]);



    // Safety stop handler
    const handleSafetyStop = useCallback(() => {
        safetyStop();
        sendPlaybackCommand('SAFETY');
    }, [safetyStop, sendPlaybackCommand]);

    // Note: Playback timing adjustments now handled internally by ShowTimeEngine


    // Crew data now comes from context

    // Function to capture Info mode changes without changing mode
    const captureInfoChanges = useCallback(() => {
        if (activeMode === 'info' && hasChanges && effectiveCurrentScript) {
            // Use the same logic as handleInfoModeExit but don't change mode
            const formChanges = {
                script_name: {
                    old_value: effectiveCurrentScript.script_name,
                    new_value: form.formData.script_name
                },
                script_status: {
                    old_value: effectiveCurrentScript.script_status,
                    new_value: form.formData.script_status
                },
                start_time: {
                    old_value: effectiveCurrentScript.start_time,
                    new_value: convertLocalToUTC(form.formData.start_time)
                },
                end_time: {
                    old_value: effectiveCurrentScript.end_time,
                    new_value: (form.formData.end_time && form.formData.end_time.trim()) ? convertLocalToUTC(form.formData.end_time) : effectiveCurrentScript.end_time
                },
                script_notes: {
                    old_value: effectiveCurrentScript.script_notes || '',
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
    }, [activeMode, hasChanges, effectiveCurrentScript, form.formData, applyLocalChange]);

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


    // Modal handlers configuration hook
    const modalHandlersConfig = useScriptModalConfig({
        scriptId,
        sourceScript,
        hasUnsavedChanges,
        saveChanges,
        discardChanges,
        modalState,
        modalNames: MODAL_NAMES,
        activeMode,
        hasChanges,
        captureInfoChanges,
        clearPendingChanges,
        setActiveMode,
        sendSyncUpdate,
        triggerRotation,
        connectSync,
        pendingOperations,
        dangerMode: activePreferences.dangerMode
    });

    // Modal handlers hook
    const modalHandlers = useScriptModalHandlers(modalHandlersConfig);

    // Track EditMode's selection state reactively


    

    // Navigation
    const navigate = useNavigate();

    // Emergency exit handler - defined after navigate
    const handleEmergencyExit = useCallback(() => {
        modalState.closeModal(MODAL_NAMES.EMERGENCY_EXIT);
        
        // Send STOP to guests before exiting, then stop locally
        if (playbackState !== 'STOPPED') {
            try {
                sendPlaybackCommand('STOP');
            } catch {}
            stopPlayback();
        }
        
        // Navigate directly without going through handleCancel to avoid double modal
        navigate('/dashboard', {
            state: {
                view: 'shows',
                selectedShowId: sourceScript?.show_id,
                selectedScriptId: scriptId,
                returnFromManage: true
            }
        });
    }, [modalState, navigate, playbackState, stopPlayback, sourceScript, scriptId]);


    // Auto-save functionality - re-enabled (not the culprit)
    const { isAutoSaving, secondsUntilNextSave, showSaveSuccess, isPaused, togglePause } = useAutoSave({
        autoSaveInterval: activeMode === 'view' ? 0 : activePreferences.autoSaveInterval, // Disable during VIEW mode
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
        currentScriptExists: !!effectiveCurrentScript,
        crewMembersLength: crewMembers.length
    };
    
    const prevValues = useRef<typeof currentValues>(currentValues);
    
    
    prevValues.current = currentValues;

    // Memoized callbacks for elementActions stability
    const clearSelection = useCallback(() => {
        editModeRef.current?.clearSelection();
        setCurrentSelectedElementIds([]);
    }, []);

    const setSelectedElementIds = useCallback((ids: string[]) => {
        setCurrentSelectedElementIds(ids);
        // EditMode manages its own selection state
    }, []);

    // Element modal actions hook
    const elementActions = useElementModalActions({
        scriptId,
        editQueueElements,
        applyLocalChange,
        insertElement,
        modalState,
        modalNames: MODAL_NAMES,
        selectedElementIds: currentSelectedElementIds,
        clearSelection,
        setSelectedElementIds
    });
    
    const handleSelectionChange = useCallback((ids: string[]) => {
        setSelectedElementIds(ids);
    }, [setSelectedElementIds]);

    // Sharing operations hook
    const { 
        handleShareConfirm,
        handleInitialHideConfirm,
        handleFinalHideConfirm,
        handleHideCancel
    } = useScriptSharing({
        scriptId,
        getToken,
        modalState,
        modalNames: MODAL_NAMES,
        setActiveMode,
        setIsSharing,
        setIsHiding,
        setIsScriptShared,
        setShareCount,
        showSuccess,
        showError
    });

    // Mode handlers hook - extracts complex mode switching logic
    const { handleModeChange } = useScriptModeHandlers({
        activeMode,
        setActiveMode,
        playbackState,
        isPlaybackPlaying,
        isPlaybackPaused,
        isPlaybackSafety,
        startPlayback,
        pausePlayback,
        stopPlayback,
        modalState,
        modalNames: MODAL_NAMES,
        navigation,
        activePreferences,
        hasChanges,
        handleInfoModeExit,
        handleToggleAllGroups,
        handleShareConfirm,
        handleFinalHideConfirm,
        modalHandlers,
        elementActions,
        editModeRef,
        setCurrentSelectedElementIds,
        sendPlaybackCommand
    });


    const toolbarContext = useMemo((): ToolbarContext => ({
        activeMode,
        scrollState,
        hasSelection,
        hasMultipleSelection,
        hasUnsavedChanges,
        pendingOperationsCount: pendingOperations.length,
        selectedElement,
        isScriptShared,
        groupsOpenToggle: buttonShowsOpen,
        isPlaying: isPlaybackPlaying,
        isPaused: isPlaybackPaused,
        isSafety: isPlaybackSafety,
        isComplete: isPlaybackComplete
    }), [activeMode, scrollState, hasSelection, hasMultipleSelection, hasUnsavedChanges, pendingOperations.length, selectedElement, isScriptShared, buttonShowsOpen, isPlaybackPlaying, isPlaybackPaused, isPlaybackSafety, isPlaybackComplete]);

    const toolButtons = getToolbarButtons(toolbarContext);

    // Clear selection when exiting edit mode
    useEffect(() => {
        if (activeMode !== 'edit') {
            editModeRef.current?.clearSelection();
            setCurrentSelectedElementIds([]);
        }
    }, [activeMode]);


    // Update content area bounds for overlay positioning
    useEffect(() => {
        if ((isPlaybackPlaying || isPlaybackPaused || isPlaybackSafety || isPlaybackComplete) && contentAreaRef.current) {
            const updateBounds = () => {
                if (contentAreaRef.current) {
                    setContentAreaBounds(contentAreaRef.current.getBoundingClientRect());
                }
            };

            updateBounds();
            window.addEventListener('resize', updateBounds);
            window.addEventListener('scroll', updateBounds);

            return () => {
                window.removeEventListener('resize', updateBounds);
                window.removeEventListener('scroll', updateBounds);
            };
        } else {
            setContentAreaBounds(null);
        }
    }, [isPlaybackPlaying, isPlaybackPaused, isPlaybackSafety, isPlaybackComplete]);


    // Handle browser events during playback
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isPlaybackPlaying || isPlaybackPaused || isPlaybackSafety) {
                e.preventDefault();
                modalState.openModal(MODAL_NAMES.EMERGENCY_EXIT);
                return 'This will end playback of this script.';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isPlaybackPlaying, isPlaybackPaused, isPlaybackSafety, modalState]);



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
            // Prevent disabling auto-sort while in view mode
            if (!value && activeMode === 'view') {
                return;
            }
            
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
        [updatePreference, scriptId, activePreferences.autoSortCues, handleAutoSortElements, applyLocalChange, editQueueElements, activeMode]
    );

    const handleAutoSortCheckboxChange = async (newAutoSortValue: boolean) => {
        // Use the same logic as handleAutoSortToggle
        await handleAutoSortToggle(newAutoSortValue);
    };

    const handleClockTimesCheckboxChange = async (newClockTimesValue: boolean) => {
        await updatePreference('showClockTimes', newClockTimesValue);
    };
    
    // Handle auto-sort and clock times activation when entering view mode
    const handleViewModeActivation = useCallback(async () => {
        const needsAutoSort = !activePreferences.autoSortCues;
        const needsClockTimes = !activePreferences.showClockTimes;
        
        
        if (needsAutoSort) {
            await handleAutoSortToggle(true);
        }
        if (needsClockTimes) {
            await updatePreference('showClockTimes', true);
        }
        
        if (needsAutoSort || needsClockTimes) {
            modalState.openModal(MODAL_NAMES.AUTO_SORT_ACTIVATED);
            setTimeout(() => {
                modalState.closeModal(MODAL_NAMES.AUTO_SORT_ACTIVATED);
            }, 2000);
        }
    }, [activePreferences.autoSortCues, activePreferences.showClockTimes, handleAutoSortToggle, updatePreference, modalState]);

    const handleOptionsModalSave = async (newPreferences: UserPreferences) => {
        const ok = await updatePreferences(newPreferences);
        setPreviewPreferences(null);
        if (ok) {
            showSuccess('Preferences Updated', 'Your settings have been saved successfully.');
        } else {
            showError('Failed to save preferences', { description: 'Your changes could not be saved. Please try again.' });
        }
    };

    // Load initial sharing status
    useEffect(() => {
        const loadSharingStatus = async () => {
            if (!scriptId) return;

            try {
                // Script sharing status is now determined by the script.is_shared flag
                // which is already loaded in currentScript
                if (effectiveCurrentScript) {
                    setIsScriptShared(effectiveCurrentScript.is_shared || false);
                    // Share count is no longer tracked at script level
                    setShareCount(0);
                }
            } catch (error) {
                // Silently handle sharing status errors
            }
        };

        loadSharingStatus();
    }, [scriptId, effectiveCurrentScript, getToken]);

    // Sharing handlers

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
            // Export failed
            showError('Export Failed', {
                description: error instanceof Error ? error.message : 'Failed to export script'
            });
        }
    };


    // Create filtered elements based on department selection
    const departmentFilteredElements = useMemo(() => {

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
    }, [editQueueElements, filteredDepartmentIds]);

    const departmentFilteredAllElements = useMemo(() => {
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
    }, [allEditQueueElements, filteredDepartmentIds]);

    // Set up timing boundaries when elements or lookahead changes
    useEffect(() => {
        if (departmentFilteredElements.length > 0) {
            const lookaheadMs = lookaheadSeconds * 1000;
            setElementBoundaries(departmentFilteredElements, lookaheadMs);
        }
    }, [departmentFilteredElements, lookaheadSeconds, setElementBoundaries]);

    // Timing boundaries are now handled by PlaybackTimingProvider

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
    const totalChangesCount = pendingOperations.length;

    return (
        <ScriptAwareShowTimeEngineUpdater script={effectiveCurrentScript}>
            <ErrorBoundary context="Script Management Page">
            <Flex width="100%" height="100%" p="2rem" flexDirection="column" boxSizing="border-box">
                <ScriptHeader
                    currentScript={effectiveCurrentScript}
                    show={show}
                    isScriptShared={isScriptShared}
                    activeMode={activeMode}
                    hasChanges={hasChanges}
                    hasUnsavedChanges={hasUnsavedChanges}
                    isFormValid={form.isValid}
                    playbackState={playbackProps.playbackState}
                    isPlaybackPlaying={playbackProps.isPlaybackPlaying}
                    isPlaybackPaused={playbackProps.isPlaybackPaused}
                    isPlaybackSafety={playbackProps.isPlaybackSafety}
                    isPlaybackComplete={playbackProps.isPlaybackComplete}
                    activePreferences={activePreferences}
                    showSaveSuccess={showSaveSuccess}
                    isAutoSaving={isAutoSaving}
                    isPaused={isPaused}
                    secondsUntilNextSave={secondsUntilNextSave}
                    isHighlightingEnabled={isHighlightingEnabled}
                    isMobile={isMobile}
                    actions={actions}
                    navigation={navigation}
                    modalState={modalState}
                    modalNames={MODAL_NAMES}
                    modalHandlers={modalHandlers}
                    captureInfoChanges={captureInfoChanges}
                    handleHighlightingToggle={handleHighlightingToggle}
                    togglePause={togglePause}
                />

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
                        borderColor={playbackProps.isPlaybackPlaying || playbackProps.isPlaybackPaused || playbackProps.isPlaybackSafety || playbackProps.isPlaybackComplete ? "transparent" : "container.border"}
                        ref={contentAreaRef}
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
                                    <ViewMode
                                        ref={viewModeRef}
                                        scriptId={scriptId || ''}
                                        colorizeDepNames={viewModeColorizeDepNames}
                                        showClockTimes={viewModeShowClockTimes}
                                        autoSortCues={viewModeAutoSortCues}
                                        useMilitaryTime={viewModeUseMilitaryTime}
                                        onScrollStateChange={handleScrollStateChange}
                                        elements={departmentFilteredElements}
                                        allElements={departmentFilteredAllElements}
                                        script={effectiveCurrentScript}
                                        onToggleGroupCollapse={toggleGroupCollapse}
                                        groupOverrides={groupOverrides}
                                        onViewModeActivation={handleViewModeActivation}
                                        isHighlightingEnabled={isHighlightingEnabled}
                                        lookaheadSeconds={viewModeLookaheadSeconds}
                                    />
                                )}
                                {activeMode === 'edit' && (
                                    <EditMode
                                        ref={editModeRef}
                                        scriptId={scriptId || ''}
                                        colorizeDepNames={editModeColorizeDepNames}
                                        showClockTimes={editModeShowClockTimes}
                                        autoSortCues={editModeAutoSortCues}
                                        useMilitaryTime={editModeUseMilitaryTime}
                                        onAutoSortChange={handleAutoSortToggle}
                                        onScrollStateChange={handleScrollStateChange}
                                        onSelectionChange={handleSelectionChange}
                                        onToggleGroupCollapse={toggleGroupCollapse}
                                        script={effectiveCurrentScript}
                                        elements={departmentFilteredElements}
                                        allElements={departmentFilteredAllElements}
                                        onApplyLocalChange={applyLocalChange}
                                    />
                                )}
                                {activeMode === 'history' && <EditHistoryView operations={pendingOperations} allElements={departmentFilteredAllElements} summary={EditQueueFormatter.formatOperationsSummary(pendingOperations)} onRevertToPoint={revertToPoint} onRevertSuccess={() => setActiveMode('edit')} />}
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
                                playbackState={playbackProps.playbackState}
                            />

                            {/* Safety Stop Button - visible during playback, ghosted in safety mode, hidden in complete mode */}
                            {(playbackProps.isPlaybackPlaying || playbackProps.isPlaybackPaused || playbackProps.isPlaybackSafety) && !playbackProps.isPlaybackComplete && (
                                <Box
                                width="100%"
                                height="50px"
                                mt="4"
                                position="relative"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                cursor={playbackProps.isPlaybackSafety ? "not-allowed" : "pointer"}
                                transition="all 0.2s"
                                onClick={playbackProps.isPlaybackSafety ? undefined : handleSafetyStop}
                                opacity={playbackProps.isPlaybackSafety ? 0.4 : 1}
                                _hover={playbackProps.isPlaybackSafety ? {} : {
                                    "& .safety-stripes": {
                                        background: `repeating-linear-gradient(
                                            -45deg,
                                            #FEF08A 0px,
                                            #FEF08A 8px,
                                            #000000 8px,
                                            #000000 16px
                                        )`
                                    },
                                    "& .safety-text": {
                                        color: "#FCD34D",
                                        textShadow: "0 0 3px #FCD34D, 0 0 6px #FCD34D"
                                    }
                                }}
                            >
                                {/* Striped border background */}
                                <Box
                                    className="safety-stripes"
                                    position="absolute"
                                    top="0"
                                    left="0"
                                    right="0"
                                    bottom="0"
                                    background={`repeating-linear-gradient(
                                        -45deg,
                                        #EAB308 0px,
                                        #EAB308 8px,
                                        #000000 8px,
                                        #000000 16px
                                    )`}
                                    borderRadius="none"
                                />
                                
                                {/* Inner content background */}
                                <Box
                                    position="absolute"
                                    top="4px"
                                    left="4px"
                                    right="4px"
                                    bottom="4px"
                                    background="gray.50"
                                    _dark={{ background: "gray.900" }}
                                    borderRadius="none"
                                />
                                
                                {/* Text */}
                                <Text
                                    className="safety-text"
                                    fontSize="sm"
                                    fontWeight="bold"
                                    color="#EAB308"
                                    position="relative"
                                    zIndex="1"
                                >
                                    SAFETY STOP
                                </Text>
                            </Box>
                            )}
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
                script={effectiveCurrentScript}
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
                lookaheadSeconds={activePreferences.lookaheadSeconds}
                activeMode={activeMode}
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
                onClockTimesChange={handleClockTimesCheckboxChange}
                onDangerModeChange={async (value: boolean) => { await updatePreference('dangerMode', value); }}
                onAutoSaveIntervalChange={async (value: number) => { await updatePreference('autoSaveInterval', value); }}
                onPlayHeartbeatIntervalChange={async (value: number) => { await updatePreference('playHeartbeatIntervalSec', value as number); }}
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
                saveErrorMessage={saveErrorMessage}
                scriptName={effectiveCurrentScript?.script_name || 'Script'}
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

            {/* Save Processing Modal (standardized via BaseModal) */}
            <BaseModal
                isOpen={modalState.isOpen(MODAL_NAMES.SAVE_PROCESSING)}
                onClose={() => {}}
                variant="processing"
                processingTitle="Saving Changes"
                processingMessage={`Applying ${totalChangesCount} change${totalChangesCount !== 1 ? 's' : ''}...`}
                isCentered
            />

            {/* Emergency Exit Modal */}
            <BaseModal
                isOpen={modalState.isOpen(MODAL_NAMES.EMERGENCY_EXIT)}
                onClose={() => modalState.closeModal(MODAL_NAMES.EMERGENCY_EXIT)}
                variant="danger"
                warningLevel="final"
                title="EXIT SCRIPT PLAYBACK"
                mainText="This will end playbook of this script."
                primaryAction={{
                    label: "Exit Script",
                    onClick: handleEmergencyExit,
                    variant: "danger"
                }}
                secondaryAction={{
                    label: "Cancel",
                    onClick: () => modalState.closeModal(MODAL_NAMES.EMERGENCY_EXIT),
                    variant: "secondary"
                }}
                isCentered={false}
                closeOnOverlayClick={false}
                closeOnEsc={false}
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
                                    fontSize="2xl"
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

            {/* Playback overlay with border and time displays */}
            {(playbackProps.isPlaybackPlaying || playbackProps.isPlaybackPaused || playbackProps.isPlaybackSafety || playbackProps.isPlaybackComplete) && contentAreaBounds && (
                <PlaybackOverlay
                    contentAreaBounds={contentAreaBounds}
                    script={effectiveCurrentScript}
                    playbackState={playbackProps.playbackState}
                    isPlaybackPlaying={playbackProps.isPlaybackPlaying}
                    isPlaybackComplete={playbackProps.isPlaybackComplete}
                    isPlaybackPaused={playbackProps.isPlaybackPaused}
                    isPlaybackSafety={playbackProps.isPlaybackSafety}
                    useMilitaryTime={activePreferences.useMilitaryTime}
                />
            )}
        </ErrorBoundary>
        </ScriptAwareShowTimeEngineUpdater>
    );
});

// Outer component that handles auth and passes getToken down
export const ManageScriptPage: React.FC<ManageScriptPageProps> = React.memo(({ isMenuOpen, onMenuClose }) => {
    const auth = useAuth();
    const authRef = useRef(auth);
    authRef.current = auth; // Keep ref up to date
    
    const getToken = useCallback(async () => {
        return await authRef.current.getToken();
    }, []); // Stable function reference
    
    const { scriptId } = useParams<{ scriptId: string }>();
    
    return (
        <ModalProvider>
            <ShowTimeEngineProvider>
                <ScriptDataProvider 
                    scriptId={scriptId}
                    elementsToPass={undefined}
                    editQueueOptions={undefined}
                >
                    <ManageScriptPageInner 
                        isMenuOpen={isMenuOpen}
                        onMenuClose={onMenuClose}
                        getToken={getToken}
                    />
                </ScriptDataProvider>
            </ShowTimeEngineProvider>
        </ModalProvider>
    );
});
