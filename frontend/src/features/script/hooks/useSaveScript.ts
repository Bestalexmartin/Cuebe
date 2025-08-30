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
  failureModalName: string;
  setSaveErrorMessage: (message: string) => void;
  showError: (title: string, opts?: any) => void;
  onSuccess?: () => void;
  triggerRotation?: () => void;
  setSourceScript?: (fresh: any) => void;
}

export function useSaveScript({
  scriptId,
  pendingOperations,
  getToken,
  discardChanges,
  updateServerElements,
  modalState,
  failureModalName,
  setSaveErrorMessage,
  showError,
  onSuccess,
  triggerRotation,
  setSourceScript,
}: UseSaveScriptParams) {
  const saveChanges = useCallback(async (): Promise<boolean> => {
    if (!scriptId || pendingOperations.length === 0) {
      return true;
    }

    const result = await saveScript({
      scriptId,
      operations: pendingOperations,
      getToken,
      onSuccess: (freshData: any) => {
        // Immediately replace source script with the fresh server data
        setSourceScript?.(freshData);
        // Reset local state to fresh server data
        discardChanges();
        updateServerElements(freshData?.elements || []);

        // Trigger rotation to show save activity
        triggerRotation?.();

        // Close any failure modal state
        modalState.closeModal(failureModalName);
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

        // Preserve current UI state and show failure modal
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
    failureModalName,
    setSaveErrorMessage,
    showError,
    onSuccess,
    triggerRotation,
    setSourceScript,
  ]);

  return { saveChanges };
}
