// frontend/src/features/script/hooks/useScriptModalHandlers.ts

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useEnhancedToast } from '../../../utils/toastUtils';
import { useDashboardNavigation } from '../../../hooks/useDashboardNavigation';

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
        SAVE_PROCESSING: string;
    };
    // New parameters for Info mode
    activeMode: string;
    hasInfoChanges: boolean;
    captureInfoChanges: () => void;
}

export const useScriptModalHandlers = ({
    scriptId,
    script,
    hasUnsavedChanges,
    saveChanges,
    discardChanges,
    modalState,
    modalNames,
    activeMode,
    hasInfoChanges,
    captureInfoChanges
}: UseScriptModalHandlersParams) => {
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const { showSuccess, showError } = useEnhancedToast();
    const { navigateWithCurrentContext } = useDashboardNavigation();
    
    // State for modal operations
    const [isDeleting, setIsDeleting] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

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

    const handleSaveScriptChanges = useCallback(async () => {
        modalState.closeModal(modalNames.SAVE_CONFIRMATION);
        modalState.closeModal(modalNames.FINAL_UNSAVED_CHANGES);
        modalState.openModal(modalNames.SAVE_PROCESSING);
        
        try {
            // Capture Info mode changes if we're in Info mode and have changes
            if (activeMode === 'info' && hasInfoChanges) {
                captureInfoChanges();
            }
            
            const success = await saveChanges();
            
            if (success) {
                await new Promise(resolve => setTimeout(resolve, 500));
                
                modalState.closeModal(modalNames.SAVE_PROCESSING);
                showSuccess('Changes Saved', 'All pending changes have been saved successfully.');
                
                if (pendingNavigation) {
                    if (pendingNavigation === '/dashboard') {
                        navigateWithCurrentContext(script, scriptId);
                    } else {
                        navigate(pendingNavigation);
                    }
                    setPendingNavigation(null);
                }
            } else {
                modalState.closeModal(modalNames.SAVE_PROCESSING);
                showError('Failed to save changes. Please try again.');
            }
        } catch (error) {
            console.error('Error saving changes:', error);
            modalState.closeModal(modalNames.saveProcessing);
            showError('An error occurred while saving changes.');
        }
    }, [modalState, modalNames, saveChanges, showSuccess, showError, pendingNavigation, navigateWithCurrentContext, script, scriptId, navigate, activeMode, hasInfoChanges, captureInfoChanges]);

    const handleShowSaveConfirmation = useCallback(() => {
        modalState.openModal(modalNames.SAVE_CONFIRMATION);
    }, [modalState, modalNames]);

    // Clear history functionality
    const handleClearHistory = useCallback(() => {
        modalState.openModal(modalNames.CLEAR_HISTORY);
    }, [modalState, modalNames]);

    const handleInitialClearHistoryConfirm = useCallback(() => {
        modalState.closeModal(modalNames.CLEAR_HISTORY);
        modalState.openModal(modalNames.FINAL_CLEAR_HISTORY);
    }, [modalState, modalNames]);

    const handleFinalClearHistoryConfirm = useCallback(() => {
        discardChanges();
        modalState.closeModal(modalNames.FINAL_CLEAR_HISTORY);
        showSuccess('Edit History Cleared', 'All changes have been discarded and the script has been restored to its original state.');
    }, [discardChanges, modalState, modalNames, showSuccess]);

    const handleClearHistoryCancel = useCallback(() => {
        modalState.closeModal(modalNames.CLEAR_HISTORY);
        modalState.closeModal(modalNames.FINAL_CLEAR_HISTORY);
    }, [modalState, modalNames]);

    // Delete functionality
    const handleDeleteClick = useCallback(() => {
        modalState.openModal(modalNames.DELETE);
    }, [modalState, modalNames]);

    const handleInitialDeleteConfirm = useCallback(() => {
        modalState.closeModal(modalNames.DELETE);
        modalState.openModal(modalNames.FINAL_DELETE);
    }, [modalState, modalNames]);

    const handleFinalDeleteConfirm = useCallback(async () => {
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

            showSuccess('Script Deleted', `"${script?.script_name}" has been permanently deleted`);

            navigate('/dashboard', {
                state: {
                    view: 'shows',
                    selectedShowId: script?.show_id,
                    returnFromManage: true
                }
            });

        } catch (error) {
            console.error('Error deleting script:', error);
            showError('Failed to delete script. Please try again.');
        } finally {
            setIsDeleting(false);
            modalState.closeModal(modalNames.FINAL_DELETE);
        }
    }, [scriptId, getToken, script, navigate, showSuccess, showError, modalState, modalNames]);

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
        handleSaveScriptChanges,
        handleShowSaveConfirmation,
        handleClearHistory,
        handleInitialClearHistoryConfirm,
        handleFinalClearHistoryConfirm,
        handleClearHistoryCancel,
        handleDeleteClick,
        handleInitialDeleteConfirm,
        handleFinalDeleteConfirm,
        handleDeleteCancel,
        
        // Setters for external use
        setPendingNavigation
    };
};