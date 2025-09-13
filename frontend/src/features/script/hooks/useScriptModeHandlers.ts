import { useCallback } from 'react';
import { ScriptMode } from './useScriptModes';

interface UseScriptModeHandlersProps {
    activeMode: ScriptMode;
    setActiveMode: (mode: ScriptMode) => void;
    playbackState: string;
    isPlaybackPlaying: boolean;
    isPlaybackPaused: boolean;
    isPlaybackSafety: boolean;
    startPlayback: () => void;
    pausePlayback: () => void;
    stopPlayback: () => void;
    modalState: any;
    modalNames: any;
    navigation: any;
    activePreferences: any;
    hasChanges: boolean;
    handleInfoModeExit: (mode: ScriptMode) => void;
    handleToggleAllGroups: () => void;
    handleShareConfirm?: () => void;
    handleFinalHideConfirm?: () => void;
    modalHandlers: any;
    elementActions: any;
    editModeRef: React.RefObject<any>;
    setCurrentSelectedElementIds: (ids: string[]) => void;
    sendPlaybackCommand?: (command: string) => void; // Function to send playback commands via WebSocket
    script?: { start_time?: string };
    totalPauseTime?: number;
}

export const useScriptModeHandlers = ({
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
    modalNames,
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
    sendPlaybackCommand,
    script,
    totalPauseTime
}: UseScriptModeHandlersProps) => {
    
    const handleJump = useCallback((direction: 'top' | 'bottom') => {
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
    }, [activeMode]);

    const handleModeChange = useCallback((modeId: string) => {
        // Handle TOGGLE ALL GROUPS button
        if (modeId === 'toggle-all-groups') {
            handleToggleAllGroups();
            return;
        }

        // Handle EXIT button
        if (modeId === 'exit') {
            if (playbackState !== 'STOPPED') {
                modalState.openModal(modalNames.EMERGENCY_EXIT);
            } else {
                navigation.handleCancel();
            }
            return;
        }

        // Handle SHARE button
        if (modeId === 'share') {
            if (activePreferences.dangerMode) {
                handleShareConfirm?.();
            } else {
                modalState.openModal(modalNames.SHARE_CONFIRMATION);
            }
            return;
        }

        // Handle HIDE button
        if (modeId === 'hide') {
            if (activePreferences.dangerMode) {
                handleFinalHideConfirm?.();
            } else {
                modalState.openModal(modalNames.HIDE_SCRIPT);
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
                        // Don't send show time - let scoped side calculate its own based on start_time and pause time
                        sendPlaybackCommand?.('PLAY', undefined, script?.start_time, totalPauseTime);
                    } else if (playbackState === 'PLAYING') {
                        pausePlayback();
                        sendPlaybackCommand?.('PAUSE');
                    } else if (playbackState === 'PAUSED') {
                        startPlayback();
                        sendPlaybackCommand?.('PLAY', undefined, script?.start_time, totalPauseTime);
                    } else if (playbackState === 'SAFETY') {
                        startPlayback();
                        sendPlaybackCommand?.('PLAY', undefined, script?.start_time, totalPauseTime);
                    } else if (playbackState === 'COMPLETE') {
                        stopPlayback();
                        sendPlaybackCommand?.('STOP');
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
                    modalState.openModal(modalNames.ADD_ELEMENT);
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
    }, [
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
        modalNames,
        navigation,
        activePreferences.dangerMode,
        hasChanges,
        handleInfoModeExit,
        handleToggleAllGroups,
        handleShareConfirm,
        handleFinalHideConfirm,
        modalHandlers,
        elementActions,
        editModeRef,
        setCurrentSelectedElementIds,
        handleJump
    ]);

    return {
        handleModeChange,
        handleJump
    };
};
