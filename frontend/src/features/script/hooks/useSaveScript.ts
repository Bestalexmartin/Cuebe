// frontend/src/features/script/hooks/useSaveScript.ts

import { useCallback } from 'react';
import { saveScript } from '../../../utils/saveScript';

type ModalStateLike = {
  openModal: (name: string) => void;
  closeModal: (name: string) => void;
};

export interface UseSaveScriptParams {
  scriptId?: string;
  pendingOperations: any[];
  getToken: () => Promise<string | null>;
  discardChanges: () => void;
  updateServerElements: (freshElements: any[]) => void;
  modalState: ModalStateLike;
  processingModalName: string;
  failureModalName: string;
  setSaveErrorMessage: (message: string) => void;
  showError: (title: string, opts?: any) => void;
  onSuccess?: () => void;
  triggerRotation?: () => void;
  setSourceScript?: (fresh: any) => void;
  sendSyncUpdate?: (message: { update_type: string; changes?: any; operation_id?: string }) => boolean;
  connectSync?: () => void;
}

export function useSaveScript({
  scriptId,
  pendingOperations,
  getToken,
  discardChanges,
  updateServerElements,
  modalState,
  processingModalName,
  failureModalName,
  setSaveErrorMessage,
  showError,
  onSuccess,
  triggerRotation,
  setSourceScript,
  sendSyncUpdate,
  connectSync,
}: UseSaveScriptParams) {
  // Internal worker that performs snapshot -> broadcast (with retry) -> save
  const doSave = useCallback(async (opsOverride?: any[]): Promise<boolean> => {
    if (!scriptId || pendingOperations.length === 0) {
      return true;
    }

    // Build a consistent snapshot once per call
    const operationsToSave = opsOverride ?? [...pendingOperations];

    // Open processing modal visibly (unified for manual save and auto-save)
    modalState.openModal(processingModalName);

    // Optional: Retry helper for websocket sends with reconnect
    const retrySend = async (msg: any, attempts = 5, delayMs = 1500): Promise<boolean> => {
      if (!sendSyncUpdate) return true; // If no WS, treat as success
      for (let i = 0; i < attempts; i++) {
        const ok = sendSyncUpdate(msg);
        if (ok) return true;
        try { connectSync?.(); } catch {}
        await new Promise((r) => setTimeout(r, delayMs));
      }
      return false;
    };

    // Broadcast BEFORE save using same snapshot
    if (sendSyncUpdate && operationsToSave.length > 0) {
      const scriptInfoOps = operationsToSave.filter((op) => op.type === 'UPDATE_SCRIPT_INFO');
      const elementOps = operationsToSave.filter((op) => op.type !== 'UPDATE_SCRIPT_INFO');

      if (scriptInfoOps.length > 0) {
        const scriptChanges: Record<string, any> = {};
        scriptInfoOps.forEach((op: any) => Object.assign(scriptChanges, op.changes));
        const ok = await retrySend({
          update_type: 'script_info',
          changes: scriptChanges,
          operation_id: `save_script_info_${Date.now()}`,
        });
        if (!ok) {
          modalState.closeModal(failureModalName); // ensure closed if open
          modalState.closeModal(processingModalName);
          showError('Save Failed', { description: 'Unable to broadcast script info changes.' });
          modalState.openModal(failureModalName);
          return false;
        }
      }

      if (elementOps.length > 0) {
        const ok = await retrySend({
          update_type: 'elements_updated',
          changes: elementOps,
          operation_id: `save_elements_${Date.now()}`,
        });
        if (!ok) {
          modalState.closeModal(processingModalName);
          showError('Save Failed', { description: 'Unable to broadcast element changes.' });
          modalState.openModal(failureModalName);
          return false;
        }
      }
    }

    const result = await saveScript({
      scriptId,
      operations: operationsToSave,
      getToken,
      onSuccess: (freshData: any) => {
        // Immediately replace source script with the fresh server data
        setSourceScript?.(freshData);
        // Reset local state to fresh server data
        discardChanges();
        updateServerElements(freshData?.elements || []);

        // Trigger rotation to show save activity
        triggerRotation?.();

        // Ensure failure modal is closed and dismiss processing
        modalState.closeModal(failureModalName);
        modalState.closeModal(processingModalName);
        setSaveErrorMessage('');

        onSuccess?.();
      },
      onError: (error: any) => {
        const fullErrorMessage = error?.stack || error?.message || String(error);
        setSaveErrorMessage(fullErrorMessage);

        showError('🚨 SAVE FAILED', {
          duration: 8000,
          isClosable: true,
          description: 'Save operation failed. Choose Continue or Revert Data.',
        });

        // Preserve current UI state and show failure modal; close processing modal
        modalState.closeModal(processingModalName);
        modalState.openModal(failureModalName);
      },
    });

    return result;
  }, [
    scriptId,
    pendingOperations,
    getToken,
    discardChanges,
    updateServerElements,
    modalState,
    processingModalName,
    failureModalName,
    setSaveErrorMessage,
    showError,
    onSuccess,
    triggerRotation,
    setSourceScript,
    sendSyncUpdate,
    connectSync,
  ]);

  // Backwards-compatible API: simple save uses current queue
  const saveChanges = useCallback(() => doSave(), [doSave]);

  // New API: save with explicit snapshot
  const saveWithOps = useCallback((opsSnapshot: any[]) => doSave(opsSnapshot), [doSave]);

  return { saveChanges, saveWithOps };
}
