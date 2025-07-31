// frontend/src/pages/script/components/ScriptModals.tsx

import React from 'react';
import { DeleteConfirmationModal } from '../../../components/modals/DeleteConfirmationModal';
import { FinalDeleteConfirmationModal } from '../../../components/modals/FinalDeleteConfirmationModal';
import { DuplicateScriptModal } from './modals/DuplicateScriptModal';
import { ProcessingModal } from './modals/ProcessingModal';
import { OptionsModal } from './modals/OptionsModal';
import { DeleteCueModal } from './modals/DeleteCueModal';
import { DuplicateElementModal } from './modals/DuplicateElementModal';
import { UnsavedChangesModal } from '../../../components/modals/UnsavedChangesModal';
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
    onDuplicateConfirm: (scriptName: string, showId: string) => void;
    onElementCreated: (element: any) => void;
    onOptionsPreview: (preferences: UserPreferences) => void;
    onOptionsSave: (preferences: UserPreferences) => void;
    onAutoSortChange: (enabled: boolean) => void;
    onConfirmDeleteCue: () => void;
    onConfirmDuplicate: (description: string, timeOffsetMs: number) => void;
    onCancelNavigation: () => void;
    onSaveAndContinue: () => void;
    onDiscardChanges: () => void;
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
    onConfirmDeleteCue,
    onConfirmDuplicate,
    onCancelNavigation,
    onSaveAndContinue,
    onDiscardChanges
}) => {
    return (
        <>
            {/* Script Duplicate Modal */}
            <DuplicateScriptModal
                isOpen={modalState.isOpen(modalNames.DUPLICATE)}
                onClose={onDuplicateClose}
                onConfirm={onDuplicateConfirm}
                scriptName={script?.scriptName || ''}
                showId={script?.showID || ''}
            />

            {/* Processing Modal */}
            <ProcessingModal isOpen={modalState.isOpen(modalNames.PROCESSING)} />

            {/* Delete Script Confirmation Modals */}
            <DeleteConfirmationModal
                isOpen={modalState.isOpen(modalNames.DELETE)}
                onClose={onDeleteCancel}
                onConfirm={onInitialDeleteConfirm}
                entityType="Script"
                entityName={script?.scriptName || ''}
            />

            <FinalDeleteConfirmationModal
                isOpen={modalState.isOpen(modalNames.FINAL_DELETE)}
                onClose={onDeleteCancel}
                onConfirm={onFinalDeleteConfirm}
                isLoading={isDeleting}
                entityType="Script"
                entityName={script?.scriptName || ''}
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

            {/* Options Modal */}
            <OptionsModal
                isOpen={modalState.isOpen(modalNames.OPTIONS)}
                onClose={() => {
                    modalState.closeModal(modalNames.OPTIONS);
                    // Clear preview preferences when closing
                    onOptionsPreview(null as any);
                }}
                initialOptions={{ darkMode, colorizeDepNames, autoSortCues, showClockTimes }}
                onPreview={onOptionsPreview}
                onSave={onOptionsSave}
                onAutoSortChange={onAutoSortChange}
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

            {/* Unsaved Changes Modal */}
            <UnsavedChangesModal
                isOpen={modalState.isOpen(modalNames.UNSAVED_CHANGES)}
                onClose={onCancelNavigation}
                onSave={onSaveAndContinue}
                onDiscard={onDiscardChanges}
                changesCount={pendingOperations.length}
                isSaving={isSavingChanges}
            />
        </>
    );
};