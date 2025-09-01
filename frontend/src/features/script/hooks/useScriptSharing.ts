import { useCallback } from 'react';
import { ScriptMode } from './useScriptModes';

interface UseScriptSharingProps {
    scriptId: string | undefined;
    getToken: () => Promise<string | null>;
    modalState: any;
    modalNames: any;
    setActiveMode: (mode: ScriptMode) => void;
    setIsSharing: (isSharing: boolean) => void;
    setIsHiding: (isHiding: boolean) => void;
    setIsScriptShared: (isShared: boolean) => void;
    setShareCount: (count: number) => void;
    showSuccess: (title: string, description: string) => void;
    showError: (title: string, options: { description: string }) => void;
}

export const useScriptSharing = ({
    scriptId,
    getToken,
    modalState,
    modalNames,
    setActiveMode,
    setIsSharing,
    setIsHiding,
    setIsScriptShared,
    setShareCount,
    showSuccess,
    showError
}: UseScriptSharingProps) => {

    const handleShareConfirm = useCallback(async () => {
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
            modalState.closeModal(modalNames.SHARE_CONFIRMATION);
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
    }, [scriptId, getToken, modalState, modalNames, setActiveMode, setIsSharing, setIsScriptShared, showSuccess, showError]);

    const handleInitialHideConfirm = useCallback(() => {
        modalState.closeModal(modalNames.HIDE_SCRIPT);
        modalState.openModal(modalNames.FINAL_HIDE_SCRIPT);
    }, [modalState, modalNames]);

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
            modalState.closeModal(modalNames.FINAL_HIDE_SCRIPT);
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
    }, [scriptId, getToken, modalState, modalNames, setActiveMode, setIsHiding, setIsScriptShared, setShareCount, showSuccess, showError]);

    const handleHideCancel = useCallback(() => {
        modalState.closeModal(modalNames.HIDE_SCRIPT);
        modalState.closeModal(modalNames.FINAL_HIDE_SCRIPT);
    }, [modalState, modalNames]);

    return {
        handleShareConfirm,
        handleInitialHideConfirm,
        handleFinalHideConfirm,
        handleHideCancel
    };
};