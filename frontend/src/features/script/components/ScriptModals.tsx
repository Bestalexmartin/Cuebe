// frontend/src/features/script/components/ScriptModals.tsx

import React from 'react';
import { DeleteConfirmationModal } from '../../../components/modals/DeleteConfirmationModal';
import { FinalDeleteConfirmationModal } from '../../../components/modals/FinalDeleteConfirmationModal';
import { FinalSaveConfirmationModal } from '../../../components/modals/FinalSaveConfirmationModal';
import { AbandonChangesModal } from '../../../components/modals/AbandonChangesModal';
import { DuplicateScriptModal } from './modals/DuplicateScriptModal';
import { ProcessingModal } from './modals/ProcessingModal';
import { OptionsModal } from './modals/OptionsModal';
import { DeleteCueModal } from './modals/DeleteCueModal';
import { DuplicateElementModal } from './modals/DuplicateElementModal';
import { EditElementModal } from './modals/EditElementModal';
import { EditGroupModal } from './modals/EditGroupModal';
import { AddScriptElementModal } from './AddScriptElementModal';
import { GroupElementsModal } from './modals/GroupElementsModal';
import { ShareConfirmationModal } from './modals/ShareConfirmationModal';
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
    selectedElementIds: string[];
    selectedElementName: string;
    selectedElementTimeOffset: number;
    pendingOperations: any[];
    totalChangesCount: number;

    // Processing states
    isDeleting: boolean;
    isDeletingCue: boolean;
    isDuplicatingElement: boolean;

    // Preferences
    darkMode: boolean;
    colorizeDepNames: boolean;
    showClockTimes: boolean;
    autoSortCues: boolean;
    useMilitaryTime: boolean;
    dangerMode: boolean;
    autoSaveInterval: number;

    // Event handlers
    onDeleteCancel: () => void;
    onInitialDeleteConfirm: () => void;
    onFinalDeleteConfirm: () => void;
    onClearHistoryCancel: () => void;
    onInitialClearHistoryConfirm: () => void;
    onFinalClearHistoryConfirm: () => void;
    onDuplicateClose: () => void;
    onDuplicateConfirm: () => void;
    onElementCreated: (element: any) => void;
    onOptionsPreview: (preferences: UserPreferences) => void;
    onOptionsSave: (preferences: UserPreferences) => void;
    onAutoSortChange: (enabled: boolean) => void;
    onColorizeChange: (enabled: boolean) => void;
    onClockTimesChange: (enabled: boolean) => void;
    onDangerModeChange: (enabled: boolean) => void;
    onAutoSaveIntervalChange: (interval: number) => void;
    onConfirmDeleteCue: () => void;
    onConfirmDuplicate: (element_name: string, offset_ms: number) => void;
    onConfirmGroupElements: (groupName: string, backgroundColor: string) => void;
    
    // Script sharing
    scriptName: string;
    crewCount: number;
    shareCount: number;
    isSharing: boolean;
    isHiding: boolean;
    onShareConfirm: () => void;
    onInitialHideConfirm: () => void;
    onFinalHideConfirm: () => void;
    onHideCancel: () => void;
    
    onUnsavedChangesCancel: () => void;
    onInitialUnsavedConfirm: () => void;
    onAbandonChangesConfirm: () => void;
    onFinalSaveConfirm: () => void;
    onSaveCancel: () => void;
    onElementEdit: (changes: Record<string, { old_value: any; new_value: any }>) => void;
    onGroupEdit: (changes: Record<string, { old_value: any; new_value: any }>, offsetDelta: number, affectedChildren: string[]) => void;
    allElements: any[]; // For group calculations
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
    selectedElementIds,
    selectedElementName,
    selectedElementTimeOffset,
    totalChangesCount,
    isDeleting,
    isDeletingCue,
    isDuplicatingElement,
    darkMode,
    colorizeDepNames,
    showClockTimes,
    autoSortCues,
    useMilitaryTime,
    dangerMode,
    autoSaveInterval,
    scriptName,
    crewCount,
    shareCount,
    isSharing,
    isHiding,
    onShareConfirm,
    onInitialHideConfirm,
    onFinalHideConfirm,
    onHideCancel,
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
    onDangerModeChange,
    onAutoSaveIntervalChange,
    onConfirmDeleteCue,
    onConfirmDuplicate,
    onConfirmGroupElements,
    onUnsavedChangesCancel,
    onInitialUnsavedConfirm,
    onAbandonChangesConfirm,
    onFinalSaveConfirm,
    onSaveCancel,
    onElementEdit,
    onGroupEdit,
    allElements
}) => {
    return (
        <>
            {/* Script Duplicate Modal */}
            <DuplicateScriptModal
                isOpen={modalState.isOpen(modalNames.DUPLICATE)}
                onClose={onDuplicateClose}
                showId={script?.show_id || ''}
                scriptId={scriptId}
                originalScriptName={script?.script_name || ''}
                onScriptDuplicated={() => {
                    // Close processing modal and handle duplicate completion
                    modalState.closeModal(modalNames.PROCESSING);
                    onDuplicateConfirm();
                }}
                onProcessingStart={() => modalState.openModal(modalNames.PROCESSING)}
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
                entityName={`${totalChangesCount} unsaved changes`}
            />

            <AbandonChangesModal
                isOpen={modalState.isOpen(modalNames.FINAL_CLEAR_HISTORY)}
                onClose={onClearHistoryCancel}
                onConfirm={onFinalClearHistoryConfirm}
                isLoading={false}
                changesCount={totalChangesCount}
                customMainText="All unsaved changes will be permanently discarded."
                warningMessage="This will restore the script to its original loaded state and cannot be undone."
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
                isOpen={modalState.isOpen(modalNames.EDIT_CUE)}
                onClose={() => modalState.closeModal(modalNames.EDIT_CUE)}
                element={selectedElement}
                onSave={onElementEdit}
            />

            {/* Edit Group Modal */}
            <EditGroupModal
                isOpen={modalState.isOpen(modalNames.EDIT_GROUP)}
                onClose={() => modalState.closeModal(modalNames.EDIT_GROUP)}
                element={selectedElement}
                allElements={allElements}
                onSave={onGroupEdit}
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
                    showClockTimes,
                    useMilitaryTime,
                    dangerMode,
                    autoSaveInterval
                }}
                onPreview={onOptionsPreview}
                onSave={async (preferences) => { onOptionsSave(preferences); }}
                onAutoSortChange={async (value) => { onAutoSortChange(value); }}
                onColorizeChange={async (value) => { onColorizeChange(value); }}
                onClockTimesChange={async (value) => { onClockTimesChange(value); }}
                onDangerModeChange={async (value) => { onDangerModeChange(value); }}
                onAutoSaveIntervalChange={async (value) => { onAutoSaveIntervalChange(value); }}
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

            {/* Group Elements Modal */}
            <GroupElementsModal
                isOpen={modalState.isOpen(modalNames.GROUP_ELEMENTS)}
                onClose={() => modalState.closeModal(modalNames.GROUP_ELEMENTS)}
                selectedElementIds={selectedElementIds}
                onConfirm={onConfirmGroupElements}
            />

            {/* Unsaved Changes Confirmation Modals (Two-tier pattern) */}
            <DeleteConfirmationModal
                isOpen={modalState.isOpen(modalNames.UNSAVED_CHANGES)}
                onClose={onUnsavedChangesCancel}
                onConfirm={onInitialUnsavedConfirm}
                entityType="Changes"
                entityName=""
                actionWord="Abandon"
                customQuestion={`Are you sure you want to abandon the ${totalChangesCount} change${totalChangesCount !== 1 ? 's' : ''} made since your last save?`}
                customWarning={`${totalChangesCount} unsaved change${totalChangesCount !== 1 ? 's' : ''} will be permanently removed.\nThis action cannot be undone.`}
            />

            <AbandonChangesModal
                isOpen={modalState.isOpen(modalNames.FINAL_UNSAVED_CHANGES)}
                onClose={onUnsavedChangesCancel}
                onConfirm={onAbandonChangesConfirm}
                isLoading={false}
                changesCount={totalChangesCount}
                warningMessage="Leaving without saving will permanently discard all your unsaved changes and cannot be undone."
            />

            {/* Final Save Confirmation Modal */}
            <FinalSaveConfirmationModal
                isOpen={modalState.isOpen(modalNames.FINAL_SAVE_CONFIRMATION)}
                onClose={onSaveCancel}
                onConfirm={onFinalSaveConfirm}
                isLoading={false}
                changesCount={totalChangesCount}
                warningMessage="This will apply all active changes from this editing session and reset your edit history."
            />

            {/* Share Confirmation Modal */}
            <ShareConfirmationModal
                isOpen={modalState.isOpen(modalNames.SHARE_CONFIRMATION)}
                onClose={() => modalState.closeModal(modalNames.SHARE_CONFIRMATION)}
                onConfirm={onShareConfirm}
                crewCount={crewCount}
                isLoading={isSharing}
            />

            {/* Stop Sharing Script Confirmation Modals (Two-tier pattern) */}
            <DeleteConfirmationModal
                isOpen={modalState.isOpen(modalNames.HIDE_SCRIPT)}
                onClose={onHideCancel}
                onConfirm={onInitialHideConfirm}
                entityType=""
                entityName={scriptName}
                actionWord="Stop Sharing"
                customQuestion={`Are you sure you want to stop sharing "${scriptName}" with all crew members?`}
                customWarning={`All links will be deactivated immediately. Crew members will lose access to this script.`}
            />

            <AbandonChangesModal
                isOpen={modalState.isOpen(modalNames.FINAL_HIDE_SCRIPT)}
                onClose={onHideCancel}
                onConfirm={onFinalHideConfirm}
                isLoading={isHiding}
                changesCount={shareCount}
                customHeader="Stop Sharing"
                customMainText={`"${scriptName}" will no longer be shared.`}
                customConfirmText="Stop Sharing"
                customCancelText="Cancel"
                customLoadingText="Stopping..."
                customBottomWarning="All sharing links will be deactivated immediately."
                hideMiddleWarning={true}
            />
        </>
    );
};
