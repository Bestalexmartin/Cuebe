// frontend/src/features/script/hooks/useScriptModalHandlers.ts

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useEnhancedToast } from "../../../utils/toastUtils";
import { useDashboardNavigation } from "../../../hooks/useDashboardNavigation";

interface UseScriptModalHandlersParams {
  scriptId: string | undefined;
  script: any;
  hasUnsavedChanges: boolean;
  saveChanges: () => Promise<boolean>;
  discardChanges: () => void;
  modalState: {
    openModal: (name: string) => void;
    closeModal: (name: string) => void;
  };
  modalNames: {
    DELETE: string;
    FINAL_DELETE: string;
    UNSAVED_CHANGES: string;
    FINAL_UNSAVED_CHANGES: string;
    CLEAR_HISTORY: string;
    FINAL_CLEAR_HISTORY: string;
    SAVE_CONFIRMATION: string;
    FINAL_SAVE_CONFIRMATION: string;
    SAVE_PROCESSING: string;
  };
  // New parameters for Info mode
  activeMode: string;
  hasInfoChanges: boolean;
  captureInfoChanges: () => void;
  onSaveSuccess?: () => void; // Callback for when save completes successfully
  // WebSocket sync support
  sendSyncUpdate?: (message: {
    update_type: string;
    changes?: any;
    operation_id?: string;
  }) => void;
  pendingOperations?: any[]; // For targeted WebSocket broadcasts
  // Danger mode - skip confirmation dialogs
  dangerMode?: boolean;
}

export const useScriptModalHandlers = ({
  scriptId,
  script,
  // hasUnsavedChanges, // Currently unused
  saveChanges,
  discardChanges,
  modalState,
  modalNames,
  activeMode,
  hasInfoChanges,
  captureInfoChanges,
  onSaveSuccess,
  sendSyncUpdate,
  pendingOperations = [],
  dangerMode = false,
}: UseScriptModalHandlersParams) => {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { showSuccess, showError } = useEnhancedToast();
  const { navigateWithCurrentContext } = useDashboardNavigation();

  // State for modal operations
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );

  // Unsaved Changes Modal handlers
  const handleUnsavedChangesCancel = useCallback(() => {
    modalState.closeModal(modalNames.UNSAVED_CHANGES);
    modalState.closeModal(modalNames.FINAL_UNSAVED_CHANGES);
    setPendingNavigation(null);
  }, [modalState, modalNames]);

  const handleInitialUnsavedConfirm = useCallback(() => {
    modalState.closeModal(modalNames.UNSAVED_CHANGES);
    modalState.openModal(modalNames.FINAL_UNSAVED_CHANGES);
  }, [modalState, modalNames]);

  const handleAbandonChangesConfirm = useCallback(() => {
    discardChanges();
    modalState.closeModal(modalNames.FINAL_UNSAVED_CHANGES);
    showSuccess(
      "Changes Abandoned",
      "All unsaved changes have been discarded.",
    );

    if (pendingNavigation) {
      if (pendingNavigation === "/dashboard") {
        navigateWithCurrentContext(script, scriptId);
      } else {
        navigate(pendingNavigation);
      }
      setPendingNavigation(null);
    }
  }, [
    discardChanges,
    modalState,
    modalNames,
    showSuccess,
    pendingNavigation,
    navigateWithCurrentContext,
    script,
    scriptId,
    navigate,
  ]);

  const handleFinalSaveConfirm = useCallback(async () => {
    modalState.closeModal(modalNames.FINAL_SAVE_CONFIRMATION);
    modalState.openModal(modalNames.SAVE_PROCESSING);

    try {
      const success = await saveChanges();

      if (success) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Broadcast targeted script info changes via WebSocket (same logic as auto-save)
        if (sendSyncUpdate && scriptId && pendingOperations.length > 0) {
          try {
            // Send targeted updates for script info changes only (the working part)
            const scriptInfoOps = pendingOperations.filter(
              (op) => op.type === "UPDATE_SCRIPT_INFO",
            );
            if (scriptInfoOps.length > 0) {
              // Extract the actual script info changes to broadcast
              const scriptChanges = {};
              scriptInfoOps.forEach((op) => {
                Object.assign(scriptChanges, op.changes);
              });

              sendSyncUpdate({
                update_type: "script_info",
                changes: scriptChanges,
                operation_id: `manual_save_script_info_${Date.now()}`,
              });
            }
            // Note: Only script_info changes are broadcast - element changes require full refresh for now
          } catch (error) {
            console.error("🔄 Manual Save: WebSocket broadcast error:", error);
          }
        }

        modalState.closeModal(modalNames.SAVE_PROCESSING);
        showSuccess(
          "Changes Saved",
          "All pending changes have been saved successfully.",
        );

        // For regular saves, stay in the current page and go to View mode
        // Only navigate if there was pending navigation (abandon flow)
        if (pendingNavigation) {
          if (pendingNavigation === "/dashboard") {
            navigateWithCurrentContext(script, scriptId);
          } else {
            navigate(pendingNavigation);
          }
          setPendingNavigation(null);
        } else {
          // Regular save - call success callback to change to View mode
          onSaveSuccess?.();
        }
      } else {
        modalState.closeModal(modalNames.SAVE_PROCESSING);
        showError("Failed to save changes. Please try again.");
      }
    } catch (error) {
      modalState.closeModal(modalNames.SAVE_PROCESSING);
      showError("An error occurred while saving changes.");
    }
  }, [
    modalState,
    modalNames,
    saveChanges,
    showSuccess,
    showError,
    pendingNavigation,
    navigateWithCurrentContext,
    script,
    scriptId,
    navigate,
    activeMode,
    hasInfoChanges,
    captureInfoChanges,
  ]);

  // Legacy handler for unsaved changes flow that needs to save before navigation
  const handleSaveScriptChanges = useCallback(async () => {
    modalState.closeModal(modalNames.SAVE_CONFIRMATION);
    modalState.closeModal(modalNames.FINAL_UNSAVED_CHANGES);
    modalState.openModal(modalNames.SAVE_PROCESSING);

    try {
      const success = await saveChanges();

      if (success) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        modalState.closeModal(modalNames.SAVE_PROCESSING);
        showSuccess(
          "Changes Saved",
          "All pending changes have been saved successfully.",
        );

        if (pendingNavigation) {
          if (pendingNavigation === "/dashboard") {
            navigateWithCurrentContext(script, scriptId);
          } else {
            navigate(pendingNavigation);
          }
          setPendingNavigation(null);
        }
      } else {
        modalState.closeModal(modalNames.SAVE_PROCESSING);
        showError("Failed to save changes. Please try again.");
      }
    } catch (error) {
      modalState.closeModal(modalNames.SAVE_PROCESSING);
      showError("An error occurred while saving changes.");
    }
  }, [
    modalState,
    modalNames,
    saveChanges,
    showSuccess,
    showError,
    pendingNavigation,
    navigateWithCurrentContext,
    script,
    scriptId,
    navigate,
    activeMode,
    hasInfoChanges,
    captureInfoChanges,
  ]);

  const handleShowSaveConfirmation = useCallback(() => {
    modalState.openModal(modalNames.SAVE_CONFIRMATION);
  }, [modalState, modalNames]);

  const handleInitialSaveConfirm = useCallback(() => {
    modalState.closeModal(modalNames.SAVE_CONFIRMATION);
    if (dangerMode) {
      handleFinalSaveConfirm();
    } else {
      modalState.openModal(modalNames.FINAL_SAVE_CONFIRMATION);
    }
  }, [modalState, modalNames, dangerMode, handleFinalSaveConfirm]);

  const handleSaveCancel = useCallback(() => {
    modalState.closeModal(modalNames.SAVE_CONFIRMATION);
    modalState.closeModal(modalNames.FINAL_SAVE_CONFIRMATION);
  }, [modalState, modalNames]);

  // Clear history functionality
  const handleClearHistory = useCallback(() => {
    if (dangerMode) {
      // Skip confirmation in danger mode - go directly to clear history
      discardChanges();
      showSuccess(
        "Edit History Cleared",
        "All changes have been discarded and the script has been restored to its original state.",
      );
    } else {
      modalState.openModal(modalNames.CLEAR_HISTORY);
    }
  }, [modalState, modalNames, dangerMode, discardChanges, showSuccess]);

  const handleInitialClearHistoryConfirm = useCallback(() => {
    modalState.closeModal(modalNames.CLEAR_HISTORY);
    modalState.openModal(modalNames.FINAL_CLEAR_HISTORY);
  }, [modalState, modalNames]);

  const handleFinalClearHistoryConfirm = useCallback(() => {
    discardChanges();
    modalState.closeModal(modalNames.FINAL_CLEAR_HISTORY);
    showSuccess(
      "Edit History Cleared",
      "All changes have been discarded and the script has been restored to its original state.",
    );
  }, [discardChanges, modalState, modalNames, showSuccess]);

  const handleClearHistoryCancel = useCallback(() => {
    modalState.closeModal(modalNames.CLEAR_HISTORY);
    modalState.closeModal(modalNames.FINAL_CLEAR_HISTORY);
  }, [modalState, modalNames]);

  // Delete functionality
  const performDelete = useCallback(async () => {
    if (!scriptId) return;

    setIsDeleting(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Authentication token not available");
      }

      const response = await fetch(`/api/scripts/${scriptId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete script");
      }

      showSuccess(
        "Script Deleted",
        `"${script?.script_name}" has been permanently deleted`,
      );
      modalState.closeModal(modalNames.FINAL_DELETE);

      // Navigate to dashboard after successful deletion
      navigate("/dashboard", {
        state: {
          view: "shows",
          selectedShowId: script?.show_id,
          returnFromManage: true,
        },
      });
    } catch (error) {
      showError("Failed to delete script. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }, [
    scriptId,
    getToken,
    showSuccess,
    showError,
    modalState,
    modalNames,
    navigateWithCurrentContext,
    script,
  ]);

  const handleDeleteClick = useCallback(() => {
    if (dangerMode) {
      // Skip confirmation in danger mode - go directly to delete
      performDelete();
    } else {
      modalState.openModal(modalNames.DELETE);
    }
  }, [modalState, modalNames, dangerMode, performDelete]);

  const handleInitialDeleteConfirm = useCallback(() => {
    modalState.closeModal(modalNames.DELETE);
    modalState.openModal(modalNames.FINAL_DELETE);
  }, [modalState, modalNames]);

  const handleFinalDeleteConfirm = useCallback(() => {
    performDelete();
  }, [performDelete]);

  const handleDeleteCancel = useCallback(() => {
    modalState.closeModal(modalNames.DELETE);
    modalState.closeModal(modalNames.FINAL_DELETE);
  }, [modalState, modalNames]);

  return {
    // State
    isDeleting,
    pendingNavigation,

    // Handlers
    handleUnsavedChangesCancel,
    handleInitialUnsavedConfirm,
    handleAbandonChangesConfirm,
    handleSaveScriptChanges,
    handleShowSaveConfirmation,
    handleInitialSaveConfirm,
    handleFinalSaveConfirm,
    handleSaveCancel,
    handleClearHistory,
    handleInitialClearHistoryConfirm,
    handleFinalClearHistoryConfirm,
    handleClearHistoryCancel,
    handleDeleteClick,
    handleInitialDeleteConfirm,
    handleFinalDeleteConfirm,
    handleDeleteCancel,

    // Setters for external use
    setPendingNavigation,
  };
};
