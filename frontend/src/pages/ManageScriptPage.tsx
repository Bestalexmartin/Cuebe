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
import { useScript } from "../features/script/hooks/useSimpleScript";
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
import { usePlayContext, PlayProvider } from '../contexts/PlayContext';
// Save flow extracted into hook
import { useSaveScript } from '../features/script/hooks/useSaveScript';
import { EditQueueFormatter } from '../features/script/utils/editQueueFormatter';
import { useModalState } from '../hooks/useModalState';
import { SaveConfirmationModal } from '../components/modals/SaveConfirmationModal';
import { BaseModal } from '../components/base/BaseModal';
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

// Unified timing hook using requestAnimationFrame for efficient updates
const useUnifiedTiming = () => {
    const [timestamp, setTimestamp] = useState(Date.now());
    const lastSecondRef = useRef<number>(-1);

    useEffect(() => {
        let rafId: number;
        
        const updateTime = () => {
            const now = Date.now();
            const currentSecond = Math.floor(now / 1000);
            
            // Only update state when the second actually changes
            if (currentSecond !== lastSecondRef.current) {
                lastSecondRef.current = currentSecond;
                setTimestamp(now);
            }
            
            rafId = requestAnimationFrame(updateTime);
        };

        rafId = requestAnimationFrame(updateTime);

        return () => {
            cancelAnimationFrame(rafId);
        };
    }, []);

    return timestamp;
};

// Time and Status Components
const RealtimeClock: React.FC<{ useMilitaryTime: boolean; timestamp: number }> = ({ useMilitaryTime, timestamp }) => {
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const hours = useMilitaryTime ? date.getHours() : date.getHours() % 12 || 12;
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };

    return (
        <Box 
            bg="transparent" 
            color="gray.300" 
            pl="16px" pr="8px" py="2px" 
            borderRadius="none" 
            fontSize="2xl" 
            fontFamily="mono"
            minWidth="100px"
            textAlign="center"
        >
            {formatTime(timestamp)}
        </Box>
    );
};

const ShowTimer: React.FC<{ script: any; playbackState: string; timestamp: number }> = ({ script, playbackState, timestamp }) => {
    const calculateTMinusTime = useCallback((timestamp: number) => {
        if (!script?.start_time) {
            return "00:00:00";
        }

        const scriptStart = new Date(script.start_time);
        
        // Time difference between now and script start time
        const diffMs = scriptStart.getTime() - timestamp;
        const diffSeconds = Math.round(diffMs / 1000);
        
        const hours = Math.floor(Math.abs(diffSeconds) / 3600);
        const minutes = Math.floor((Math.abs(diffSeconds) % 3600) / 60);
        const seconds = Math.abs(diffSeconds) % 60;
        
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        return diffSeconds < 0 ? timeStr : `–${timeStr}`;
    }, [script?.start_time]);

    const tMinusTime = calculateTMinusTime(timestamp);


    return (
        <Box 
            bg="transparent" 
            color="red.500" 
            px="8px" py="2px" 
            borderRadius="none" 
            fontSize="2xl" 
            fontFamily="mono"
            minWidth="110px"
            textAlign="center"
        >
            {tMinusTime}
        </Box>
    );
};

const PlaybackStatus: React.FC<{ playbackState: string }> = ({ playbackState }) => {
    if (playbackState === 'STOPPED') return null;

    const getStatusColor = () => {
        if (playbackState === 'SAFETY') return 'orange.500';
        return 'red.500';
    };

    return (
        <Box 
            bg="transparent" 
            color={getStatusColor()} 
            px="8px" py="2px" 
            borderRadius="none" 
            fontSize="2xl" 
            fontFamily="mono"
            fontWeight="bold"
            minWidth="100px"
            textAlign="center"
            animation={playbackState === 'PAUSED' ? "flash 1s infinite" : undefined}
            sx={playbackState === 'PAUSED' ? {
                "@keyframes flash": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.3 }
                }
            } : {}}
            pr={playbackState === 'PLAYING' ? "14px" : "8px"}
        >
            {playbackState}
        </Box>
    );
};

const DelayTimer: React.FC<{ 
    playbackState: string; 
    onOffsetAdjustment: (delayMs: number, currentTimeMs: number) => void;
    timestamp: number;
}> = ({ playbackState, onOffsetAdjustment, timestamp }) => {
    const [currentSessionStart, setCurrentSessionStart] = useState<number | null>(null);
    const { currentTime: playContextTime } = usePlayContext();

    useEffect(() => {
        if (playbackState === 'PAUSED' || playbackState === 'SAFETY') {
            if (!currentSessionStart) {
                setCurrentSessionStart(Date.now());
            }
        } else if (playbackState === 'PLAYING' && currentSessionStart) {
            // When transitioning from paused to playing, apply offset adjustments
            const sessionDurationMs = Date.now() - currentSessionStart;
            onOffsetAdjustment(sessionDurationMs, playContextTime || 0);
            setCurrentSessionStart(null);
        } else if (playbackState === 'STOPPED') {
            setCurrentSessionStart(null);
        }
    }, [playbackState, currentSessionStart, playContextTime, onOffsetAdjustment]);

    if (playbackState !== 'PAUSED' && playbackState !== 'SAFETY') return null;

    // Calculate delay seconds based on unified timestamp
    const totalDelaySeconds = currentSessionStart ? Math.floor((timestamp - currentSessionStart) / 1000) : 0;
    const minutes = Math.floor(totalDelaySeconds / 60);
    const seconds = totalDelaySeconds % 60;
    const displayTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return (
        <Box 
            bg="transparent" 
            color={playbackState === 'SAFETY' ? 'orange.500' : 'red.500'} 
            pl="8px" pr="16px" py="2px" 
            borderRadius="none" 
            fontSize="2xl" 
            fontFamily="mono"
            fontWeight="bold"
            minWidth="80px"
            textAlign="center"
            animation={playbackState === 'PAUSED' ? "flash 1s infinite" : undefined}
            sx={playbackState === 'PAUSED' ? {
                "@keyframes flash": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.3 }
                }
            } : {}}
        >
            {displayTime}
        </Box>
    );
};

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
    SAVE_FAILURE: 'save_failure',
    SHARE_CONFIRMATION: 'share_confirmation',
    HIDE_SCRIPT: 'hide_script',
    FINAL_HIDE_SCRIPT: 'final_hide_script',
    AUTO_SORT_ACTIVATED: 'auto_sort_activated',
    EMERGENCY_EXIT: 'emergency_exit'
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
    const contentAreaRef = useRef<HTMLDivElement>(null);
    const [contentAreaBounds, setContentAreaBounds] = useState<DOMRect | null>(null);
    const [safetyStopTime, setSafetyStopTime] = useState<number | null>(null);
    const { scriptId } = useParams<{ scriptId: string }>();
    const { showSuccess, showError } = useEnhancedToast();
    const [saveErrorMessage, setSaveErrorMessage] = useState<string>('');

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
    const { script: sourceScript, isLoading: isLoadingScript, error: scriptError, setScript: setSourceScript } = useScript(scriptId);
    const { show } = useShow(sourceScript?.show_id);

    // Removed debug watcher for script name

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
        sendUpdate: sendSyncUpdate,
        connect: connectSync
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
    
    // Play state from context
    const { playbackState, isPlaybackPlaying, isPlaybackPaused, isPlaybackSafety, startPlayback, pausePlayback, stopPlayback, safetyStop } = usePlayContext();

    // Unified timing for synchronized clocks
    const unifiedTimestamp = useUnifiedTiming();

    // Safety stop handler
    const handleSafetyStop = useCallback(() => {
        setSafetyStopTime(Date.now());
        safetyStop();
    }, [safetyStop]);

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

    // Emergency exit handler - defined after navigation
    const handleEmergencyExit = useCallback(() => {
        modalState.closeModal();
        
        // Stop playback first, then exit
        if (playbackState !== 'STOPPED') {
            stopPlayback();
        }
        
        navigation.handleCancel();
    }, [modalState, navigation, playbackState, stopPlayback]);

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
            setActiveMode('edit');
        },
        sendSyncUpdate: (message: any) => {
            const result = sendSyncUpdate(message);
            // Trigger websocket icon rotation for successful user transmission
            triggerRotation();
            return result;
        },
        connectSync,
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
        connectSync,
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
        groupsOpenToggle: buttonShowsOpen,
        isPlaying: isPlaybackPlaying,
        isPaused: isPlaybackPaused,
        isSafety: isPlaybackSafety
    }), [activeMode, scrollState, elementActions.selectedElementIds.length, hasUnsavedChanges, pendingOperations.length, selectedElement, isScriptShared, buttonShowsOpen, isPlaybackPlaying, isPlaybackPaused, isPlaybackSafety]);

    const toolButtons = useMemo(() => getToolbarButtons(toolbarContext), [toolbarContext]);

    // Clear selection when exiting edit mode
    useEffect(() => {
        if (activeMode !== 'edit') {
            editModeRef.current?.clearSelection();
            setCurrentSelectedElementIds([]);
        }
    }, [activeMode]);

    // Update content area bounds for overlay positioning
    useEffect(() => {
        if ((isPlaybackPlaying || isPlaybackPaused || isPlaybackSafety) && contentAreaRef.current) {
            const updateBounds = () => {
                setContentAreaBounds(contentAreaRef.current!.getBoundingClientRect());
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
    }, [isPlaybackPlaying, isPlaybackPaused, isPlaybackSafety]);

    // Handle browser events during playback
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isPlaybackPlaying || isPlaybackPaused || isPlaybackSafety) {
                e.preventDefault();
                e.returnValue = 'This will end playback of this script.';
                modalState.openModal(MODAL_NAMES.EMERGENCY_EXIT);
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isPlaybackPlaying, isPlaybackPaused, isPlaybackSafety, modalState]);

    // Main mode change handler
    const handleModeChange = (modeId: string) => {
        // Handle TOGGLE ALL GROUPS button
        if (modeId === 'toggle-all-groups') {
            handleToggleAllGroups();
            return;
        }

        // Handle EXIT button
        if (modeId === 'exit') {
            if (isPlaybackPlaying || isPlaybackPaused || isPlaybackSafety) {
                modalState.openModal(MODAL_NAMES.EMERGENCY_EXIT);
            } else {
                navigation.handleCancel();
            }
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
                    if (playbackState === 'STOPPED') {
                        startPlayback();
                    } else if (playbackState === 'PLAYING') {
                        pausePlayback();
                    } else if (playbackState === 'PAUSED') {
                        startPlayback();
                    } else if (playbackState === 'SAFETY') {
                        startPlayback();
                    }
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
            setActiveMode('edit' as ScriptMode); // Return to edit mode
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
            setActiveMode('edit' as ScriptMode); // Return to edit mode
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

    // Offset adjustment handler for playback delays - defined after filtered elements
    const handleOffsetAdjustment = useCallback((delayMs: number, currentTimeMs: number) => {
        if (!scriptId || delayMs <= 0 || !currentScript) return;
        
        // Round delay up to nearest second for synchronized timing
        const roundedDelayMs = Math.ceil(delayMs / 1000) * 1000;
        
        console.log(`[OFFSET ADJUSTMENT] Raw delay: ${delayMs}ms, Rounded: ${roundedDelayMs}ms, Current time: ${currentTimeMs}ms`);
        
        // Check if we're before the show has actually started
        const now = new Date();
        const scriptStartTime = new Date(currentScript.start_time);
        const isBeforeShowStart = now < scriptStartTime;
        
        console.log(`[OFFSET ADJUSTMENT] Is before show start: ${isBeforeShowStart}`);
        
        if (isBeforeShowStart) {
            // Pre-show delay: adjust the actual script start_time
            const newStartTime = new Date(scriptStartTime.getTime() + roundedDelayMs);
            console.log(`[OFFSET ADJUSTMENT] Adjusting script start time: ${scriptStartTime.toISOString()} -> ${newStartTime.toISOString()}`);
            
            // Create script info update operation
            const scriptUpdateOperation = {
                type: 'UPDATE_SCRIPT_INFO' as const,
                element_id: scriptId,
                changes: {
                    start_time: {
                        old_value: currentScript.start_time,
                        new_value: newStartTime.toISOString()
                    }
                }
            };
            
            applyLocalChange(scriptUpdateOperation);
        } else {
            // Mid-show delay: adjust individual element offsets
            const unplayedElements = filteredEditQueueElements.filter(element => 
                element.offset_ms >= currentTimeMs
            );
            
            console.log(`[OFFSET ADJUSTMENT] Found ${unplayedElements.length} unplayed elements:`, 
                unplayedElements.map(el => `${el.element_name} (${el.offset_ms}ms)`));
            
            if (unplayedElements.length === 0) return;
            
            const adjustmentOperation = {
                type: 'BULK_OFFSET_ADJUSTMENT' as const,
                element_id: 'playback-delay-adjustment',
                delay_ms: roundedDelayMs,
                affected_element_ids: unplayedElements.map(el => el.element_id),
                current_time_ms: currentTimeMs
            };
            
            console.log('[OFFSET ADJUSTMENT] Applying element offset operation:', adjustmentOperation);
            applyLocalChange(adjustmentOperation);
        }
    }, [scriptId, filteredEditQueueElements, applyLocalChange, currentScript]);

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
                                    onClick={() => {
                                        if (isPlaybackPlaying || isPlaybackPaused || isPlaybackSafety) {
                                            modalState.openModal(MODAL_NAMES.EMERGENCY_EXIT);
                                        } else {
                                            navigation.handleCancel();
                                        }
                                    }}
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
                        borderColor={isPlaybackPlaying || isPlaybackPaused || isPlaybackSafety ? "transparent" : "container.border"}
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
                                    <ViewMode ref={viewModeRef} scriptId={scriptId || ''} colorizeDepNames={activePreferences.colorizeDepNames} showClockTimes={activePreferences.showClockTimes} autoSortCues={activePreferences.autoSortCues} useMilitaryTime={activePreferences.useMilitaryTime} onScrollStateChange={handleScrollStateChange} elements={filteredEditQueueElements} allElements={filteredAllEditQueueElements} script={currentScript} onToggleGroupCollapse={toggleGroupCollapse} groupOverrides={groupOverrides} onAutoSortActivation={handleViewModeActivation} />
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
                                playbackState={playbackState}
                            />
                            
                            {/* Safety Stop Button - visible during playback, ghosted in safety mode */}
                            {(isPlaybackPlaying || isPlaybackPaused || isPlaybackSafety) && (
                                <Box
                                width="100%"
                                height="50px"
                                mt="4"
                                position="relative"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                cursor={isPlaybackSafety ? "not-allowed" : "pointer"}
                                transition="all 0.2s"
                                onClick={isPlaybackSafety ? undefined : handleSafetyStop}
                                opacity={isPlaybackSafety ? 0.4 : 1}
                                _hover={isPlaybackSafety ? {} : {
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
                onClose={() => modalState.closeModal()}
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
            {(isPlaybackPlaying || isPlaybackPaused || isPlaybackSafety) && contentAreaBounds && (
                <>
                    {/* Border overlay */}
                    <Box
                        position="fixed"
                        top={`${contentAreaBounds.top - 1}px`}
                        left={`${contentAreaBounds.left - 1}px`}
                        width={`${contentAreaBounds.width + 2}px`}
                        height={`${contentAreaBounds.height + 2}px`}
                        border="2px solid"
                        borderColor={isPlaybackSafety ? "#EAB308" : "red.500"}
                        borderRadius="md"
                        pointerEvents="none"
                        zIndex={1000}
                        animation={isPlaybackPaused ? "flash 1s infinite" : undefined}
                        sx={isPlaybackPaused ? {
                            "@keyframes flash": {
                                "0%, 100%": { opacity: 1 },
                                "50%": { opacity: 0.3 }
                            }
                        } : {}}
                    />
                    
                    {/* Time and Status Display - positioned at top center */}
                    <Box
                        position="fixed"
                        top="16px"
                        left="50%"
                        transform="translateX(-50%)"
                        zIndex={1001}
                        pointerEvents="none"
                    >
                        <Box border="2px solid" borderColor="gray.700" bg="#0F0F0F">
                            <HStack spacing={0} align="center">
                                {/* Realtime Clock */}
                                <RealtimeClock useMilitaryTime={activePreferences.useMilitaryTime} timestamp={unifiedTimestamp} />
                                
                                {/* Bullet separator */}
                                <Box bg="#0F0F0F" px="4px" py="2px">
                                    <Text fontSize="2xl" color="gray.500" fontFamily="mono">•</Text>
                                </Box>
                                
                                {/* Show Timer */}
                                <ShowTimer 
                                    script={currentScript}
                                    playbackState={playbackState}
                                    timestamp={unifiedTimestamp}
                                />
                                
                                {/* Bullet separator */}
                                <Box bg="#0F0F0F" px="4px" py="2px">
                                    <Text fontSize="2xl" color="gray.500" fontFamily="mono">•</Text>
                                </Box>
                                
                                {/* Playback Status */}
                                <PlaybackStatus playbackState={playbackState} />
                                
                                {/* Bullet separator for paused/safety mode */}
                                {(playbackState === 'PAUSED' || playbackState === 'SAFETY') && (
                                    <Box 
                                        bg="transparent" 
                                        px="2px" py="2px"
                                        animation={playbackState === 'PAUSED' ? "flash 1s infinite" : undefined}
                                        sx={playbackState === 'PAUSED' ? {
                                            "@keyframes flash": {
                                                "0%, 100%": { opacity: 1 },
                                                "50%": { opacity: 0.3 }
                                            }
                                        } : {}}
                                    >
                                        <Text fontSize="2xl" color={playbackState === 'SAFETY' ? 'orange.500' : 'red.500'} fontFamily="mono">•</Text>
                                    </Box>
                                )}
                                
                                {/* Delay Timer - in PAUSED and SAFETY modes */}
                                <DelayTimer playbackState={playbackState} onOffsetAdjustment={handleOffsetAdjustment} timestamp={unifiedTimestamp} />
                            </HStack>
                        </Box>
                    </Box>
                </>
            )}
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
