// frontend/src/features/script/components/ScriptModals.tsx

import React from 'react';
import { DeleteConfirmationModal } from '../../../components/modals/DeleteConfirmationModal';
import { FinalDeleteConfirmationModal } from '../../../components/modals/FinalDeleteConfirmationModal';
import { DuplicateScriptModal } from './modals/DuplicateScriptModal';
import { ProcessingModal } from './modals/ProcessingModal';
import { OptionsModal } from './modals/OptionsModal';
import { DeleteCueModal } from './modals/DeleteCueModal';
import { DuplicateElementModal } from './modals/DuplicateElementModal';
import { EditElementModal } from './modals/EditElementModal';
import { AddScriptElementModal } from './AddScriptElementModal';
import { ModalStateReturn } from '../../../hooks/useModalState';
import { UserPreferences } from '../../../hooks/useUserPreferences';

interface ScriptModalsProps {
    // Modal state management
    modalState: ModalStateReturn;
    modalNames: Record<string, string>;

    // Script and element data
    script?: any;
    scriptId: string;
    selectedElement: any;
    selectedElementName: string;
    selectedElementTimeOffset: number;
    pendingOperations: any[];

    // Processing states
    isDeleting: boolean;
    isDeletingCue: boolean;
    isDuplicatingElement: boolean;
    isSavingChanges: boolean;

    // Preferences
    previewPreferences: UserPreferences | null;
    darkMode: boolean;
    colorizeDepNames: boolean;
    showClockTimes: boolean;
    autoSortCues: boolean;

    // Event handlers
    onDeleteCancel: () => void;
    onInitialDeleteConfirm: () => void;
    onFinalDeleteConfirm: () => void;
    onClearHistoryCancel: () => void;
    onInitialClearHistoryConfirm: () => void;
    onFinalClearHistoryConfirm: () => void;
    onDuplicateClose: () => void;
    onDuplicateConfirm: (script_name: string, showId: string) => void;
    onElementCreated: (element: any) => void;
    onOptionsPreview: (preferences: UserPreferences) => void;
    onOptionsSave: (preferences: UserPreferences) => void;
    onAutoSortChange: (enabled: boolean) => void;
    onColorizeChange: (enabled: boolean) => void;
    onClockTimesChange: (enabled: boolean) => void;
    onConfirmDeleteCue: () => void;
    onConfirmDuplicate: (description: string, time_offset_ms: number) => void;
    onUnsavedChangesCancel: () => void;
    onInitialUnsavedConfirm: () => void;
    onSaveScriptChanges: () => void;
    onElementEdit: (changes: Record<string, { oldValue: any; newValue: any }>) => void;
}

/**
 * ScriptModals Component
 * 
 * Consolidates all modal components used in ManageScriptPage to reduce
 * the main component size and improve maintainability.
 */
export const ScriptModals: React.FC<ScriptModalsProps> = ({
    modalState,
    modalNames,
    script,
    scriptId,
    selectedElement,
    selectedElementName,
    selectedElementTimeOffset,
    pendingOperations,
    isDeleting,
    isDeletingCue,
    isDuplicatingElement,
    isSavingChanges,
    previewPreferences,
    darkMode,
    colorizeDepNames,
    showClockTimes,
    autoSortCues,
    onDeleteCancel,
    onInitialDeleteConfirm,
    onFinalDeleteConfirm,
    onClearHistoryCancel,
    onInitialClearHistoryConfirm,
    onFinalClearHistoryConfirm,
    onDuplicateClose,
    onDuplicateConfirm,
    onElementCreated,
    onOptionsPreview,
    onOptionsSave,
    onAutoSortChange,
    onColorizeChange,
    onClockTimesChange,
    onConfirmDeleteCue,
    onConfirmDuplicate,
    onUnsavedChangesCancel,
    onInitialUnsavedConfirm,
    onSaveScriptChanges,
    onElementEdit
}) => {
    return (
        <>
            {/* Script Duplicate Modal */}
            <DuplicateScriptModal
                isOpen={modalState.isOpen(modalNames.DUPLICATE)}
                onClose={onDuplicateClose}
                onConfirm={onDuplicateConfirm}
                scriptName={script?.script_name || ''}
                showId={script?.show_id || ''}
            />

            {/* Processing Modal */}
            <ProcessingModal isOpen={modalState.isOpen(modalNames.PROCESSING)} />

            {/* Delete Script Confirmation Modals */}
            <DeleteConfirmationModal
                isOpen={modalState.isOpen(modalNames.DELETE)}
                onClose={onDeleteCancel}
                onConfirm={onInitialDeleteConfirm}
                entityType="Script"
                entityName={script?.script_name || ''}
            />

            <FinalDeleteConfirmationModal
                isOpen={modalState.isOpen(modalNames.FINAL_DELETE)}
                onClose={onDeleteCancel}
                onConfirm={onFinalDeleteConfirm}
                isLoading={isDeleting}
                entityType="Script"
                entityName={script?.script_name || ''}
                warningMessage="Deleting this script will permanently remove all script elements and cannot be undone."
            />

            {/* Clear History Confirmation Modals */}
            <DeleteConfirmationModal
                isOpen={modalState.isOpen(modalNames.CLEAR_HISTORY)}
                onClose={onClearHistoryCancel}
                onConfirm={onInitialClearHistoryConfirm}
                entityType="Edit History"
                entityName={`${pendingOperations.length} unsaved changes`}
            />

            <FinalDeleteConfirmationModal
                isOpen={modalState.isOpen(modalNames.FINAL_CLEAR_HISTORY)}
                onClose={onClearHistoryCancel}
                onConfirm={onFinalClearHistoryConfirm}
                isLoading={false}
                entityType="Edit History"
                entityName="All unsaved changes"
                warningMessage="This will permanently discard all your unsaved changes and restore the script to its original loaded state. This action cannot be undone."
            />

            {/* Add Script Element Modal */}
            <AddScriptElementModal
                isOpen={modalState.isOpen(modalNames.ADD_ELEMENT)}
                onClose={() => modalState.closeModal(modalNames.ADD_ELEMENT)}
                scriptId={scriptId}
                onElementCreated={onElementCreated}
                autoSortCues={autoSortCues}
            />

            {/* Edit Script Element Modal */}
            <EditElementModal
                isOpen={modalState.isOpen(modalNames.EDIT_ELEMENT)}
                onClose={() => modalState.closeModal(modalNames.EDIT_ELEMENT)}
                element={selectedElement}
                onSave={onElementEdit}
            />

            {/* Options Modal */}
            <OptionsModal
                isOpen={modalState.isOpen(modalNames.OPTIONS)}
                onClose={() => {
                    modalState.closeModal(modalNames.OPTIONS);
                    // Clear preview preferences when closing
                    onOptionsPreview(null as any);
                }}
                initialOptions={{
                    darkMode,
                    colorizeDepNames,
                    autoSortCues,
                    showClockTimes
                }}
                onPreview={onOptionsPreview}
                onSave={onOptionsSave}
                onAutoSortChange={onAutoSortChange}
                onColorizeChange={onColorizeChange}
                onClockTimesChange={onClockTimesChange}
            />

            {/* Delete Cue Confirmation Modal */}
            <DeleteCueModal
                isOpen={modalState.isOpen(modalNames.DELETE_CUE)}
                onClose={() => modalState.closeModal(modalNames.DELETE_CUE)}
                onConfirm={onConfirmDeleteCue}
                cueName={selectedElementName}
                isDeleting={isDeletingCue}
            />

            {/* Duplicate Element Modal */}
            <DuplicateElementModal
                isOpen={modalState.isOpen(modalNames.DUPLICATE_ELEMENT)}
                onClose={() => modalState.closeModal(modalNames.DUPLICATE_ELEMENT)}
                onConfirm={onConfirmDuplicate}
                originalElementName={selectedElementName}
                originalTimeOffset={selectedElementTimeOffset}
                isProcessing={isDuplicatingElement}
            />

            {/* Unsaved Changes Confirmation Modals (Two-tier pattern) */}
            <DeleteConfirmationModal
                isOpen={modalState.isOpen(modalNames.UNSAVED_CHANGES)}
                onClose={onUnsavedChangesCancel}
                onConfirm={onInitialUnsavedConfirm}
                entityType="Changes"
                entityName=""
                actionWord="Abandon"
                customQuestion={`Are you sure you want to abandon the ${pendingOperations.length} change${pendingOperations.length !== 1 ? 's' : ''} made since your last save?`}
                customWarning={`${pendingOperations.length} unsaved change${pendingOperations.length !== 1 ? 's' : ''} will be permanently removed.\nThis action cannot be undone.`}
            />

            <FinalDeleteConfirmationModal
                isOpen={modalState.isOpen(modalNames.FINAL_UNSAVED_CHANGES)}
                onClose={onUnsavedChangesCancel}
                onConfirm={onSaveScriptChanges}
                isLoading={isSavingChanges}
                entityType="Changes"
                entityName=""
                actionWord="Abandon"
                customMainText={`${pendingOperations.length} change${pendingOperations.length !== 1 ? 's' : ''} will be permanently deleted.`}
                warningMessage="Leaving without saving will permanently discard all your unsaved changes and cannot be undone."
            />
        </>
    );
};
