import { useMemo, useCallback } from 'react';
import { ScriptMode } from './useScriptModes';

interface UseScriptModalConfigProps {
    scriptId: string | undefined;
    sourceScript: any;
    hasUnsavedChanges: boolean;
    saveChanges: () => Promise<boolean>;
    discardChanges: () => void;
    modalState: any;
    modalNames: any;
    activeMode: ScriptMode;
    hasChanges: boolean;
    captureInfoChanges: () => void;
    clearPendingChanges: () => void;
    setActiveMode: (mode: ScriptMode) => void;
    sendSyncUpdate: (message: any) => any;
    triggerRotation: () => void;
    connectSync: () => void;
    pendingOperations: any[];
    dangerMode: boolean;
}

export const useScriptModalConfig = ({
    scriptId,
    sourceScript,
    hasUnsavedChanges,
    saveChanges,
    discardChanges,
    modalState,
    modalNames,
    activeMode,
    hasChanges,
    captureInfoChanges,
    clearPendingChanges,
    setActiveMode,
    sendSyncUpdate,
    triggerRotation,
    connectSync,
    pendingOperations,
    dangerMode
}: UseScriptModalConfigProps) => {

    const onSaveSuccess = useCallback(() => {
        // Clear pending changes in info mode to prevent duplicate operations
        clearPendingChanges();
        setActiveMode('edit');
    }, [clearPendingChanges, setActiveMode]);

    const sendSyncUpdateWithRotation = useCallback((message: any) => {
        const result = sendSyncUpdate(message);
        // Trigger websocket icon rotation for successful user transmission
        triggerRotation();
        return result;
    }, [sendSyncUpdate, triggerRotation]);

    const modalHandlersConfig = useMemo(() => ({
        scriptId,
        script: sourceScript,
        hasUnsavedChanges,
        saveChanges,
        discardChanges,
        modalState,
        modalNames,
        activeMode,
        hasInfoChanges: hasChanges,
        captureInfoChanges,
        onSaveSuccess,
        sendSyncUpdate: sendSyncUpdateWithRotation,
        connectSync,
        pendingOperations,
        dangerMode
    }), [
        scriptId,
        sourceScript,
        hasUnsavedChanges,
        saveChanges,
        discardChanges,
        modalState,
        modalNames,
        activeMode,
        hasChanges,
        captureInfoChanges,
        onSaveSuccess,
        sendSyncUpdateWithRotation,
        connectSync,
        pendingOperations,
        dangerMode
    ]);

    return modalHandlersConfig;
};