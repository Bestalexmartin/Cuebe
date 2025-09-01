// frontend/src/features/script/components/ScriptModals.tsx

import React, { useState } from 'react';
import {
    VStack,
    Box,
    Code,
    IconButton,
    HStack,
    Text
} from '@chakra-ui/react';
import { DeleteConfirmationModal } from '../../../components/modals/DeleteConfirmationModal';
import { FinalDeleteConfirmationModal } from '../../../components/modals/FinalDeleteConfirmationModal';
import { FinalSaveConfirmationModal } from '../../../components/modals/FinalSaveConfirmationModal';
import { AbandonChangesModal } from '../../../components/modals/AbandonChangesModal';
import { DuplicateScriptModal } from './modals/DuplicateScriptModal';
// Processing modal is handled via BaseModal variant="processing"
import { OptionsModal } from './modals/OptionsModal';
import { DeleteCueModal } from './modals/DeleteCueModal';
import { DuplicateElementModal } from './modals/DuplicateElementModal';
import { EditElementModal } from './modals/EditElementModal';
import { EditGroupModal } from './modals/EditGroupModal';
import { AddScriptElementModal } from './AddScriptElementModal';
import { GroupElementsModal } from './modals/GroupElementsModal';
import { ShareConfirmationModal } from './modals/ShareConfirmationModal';
import { BaseModal } from '../../../components/base/BaseModal';
import { AppIcon } from '../../../components/AppIcon';
import { ModalStateReturn } from '../../../hooks/useModalState';
import { UserPreferences } from '../../../hooks/useUserPreferences';
import { useEnhancedToast } from '../../../utils/toastUtils';


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
    lookaheadSeconds: number;
    activeMode: string;

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
    onOptionsSave: (preferences: UserPreferences) => Promise<void>;
    onAutoSortChange: (enabled: boolean) => Promise<void>;
    onColorizeChange: (enabled: boolean) => Promise<void>;
    onClockTimesChange: (enabled: boolean) => Promise<void>;
    onDangerModeChange: (enabled: boolean) => Promise<void>;
    onAutoSaveIntervalChange: (interval: number) => Promise<void>;
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
    saveErrorMessage?: string; // For save failure modal
}

interface ErrorDisplayProps {
    errorMessage: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ errorMessage }) => {
    const [isCopying, setIsCopying] = useState(false);
    const { showSuccess, showError } = useEnhancedToast();
    const codeBlockBg = 'card.background';

    const handleCopyError = async () => {
        setIsCopying(true);
        try {
            const textToCopy = `Save Error Report - ${new Date().toLocaleString()}\n` +
                              `=${'='.repeat(60)}\n` +
                              errorMessage;
            await navigator.clipboard.writeText(textToCopy);
            showSuccess("Error copied", "The error report has been copied to your clipboard");
        } catch (err) {
            console.error('Failed to copy error:', err);
            showError("Copy failed", { description: "Failed to copy error to clipboard" });
        } finally {
            setIsCopying(false);
        }
    };

    return (
        <VStack spacing={2} align="stretch" width="100%">
            <HStack justify="space-between" align="center">
                <Text fontSize="xs" fontWeight="semibold" color="red.300">
                    Error Details:
                </Text>
                <IconButton
                    aria-label="Copy error details"
                    icon={<AppIcon name="copy" boxSize="12px" />}
                    size="xs"
                    variant="ghost"
                    isLoading={isCopying}
                    onClick={handleCopyError}
                    colorScheme="red"
                    color="red.300"
                    _hover={{ bg: 'red.800' }}
                />
            </HStack>
            <Box
                as="pre"
                bg={codeBlockBg}
                p={2}
                borderRadius="md"
                overflowX="auto"
                overflowY="auto"
                maxHeight="120px"
                border="1px solid"
                borderColor="red.400"
                fontSize="xs"
                className="hide-scrollbar"
            >
                <Code fontSize="xs" whiteSpace="pre-wrap" bg="transparent" color="red.600" _dark={{ color: "red.300" }} wordBreak="break-word">
                    {errorMessage}
                </Code>
            </Box>
        </VStack>
    );
};

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
    lookaheadSeconds,
    activeMode,
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
    allElements,
    saveErrorMessage
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

            {/* Processing Modal (unified via BaseModal) */}
            <BaseModal
                isOpen={modalState.isOpen(modalNames.PROCESSING)}
                onClose={() => {}}
                variant="processing"
                isCentered={true}
            />

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
                    autoSortCues: autoSortCues,
                    showClockTimes,
                    useMilitaryTime,
                    dangerMode,
                    autoSaveInterval,
                    lookaheadSeconds
                }}
                onPreview={onOptionsPreview}
                onSave={onOptionsSave}
                onAutoSortChange={onAutoSortChange}
                onColorizeChange={onColorizeChange}
                onClockTimesChange={onClockTimesChange}
                onDangerModeChange={onDangerModeChange}
                onAutoSaveIntervalChange={onAutoSaveIntervalChange}
                activeMode={activeMode}
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

            {/* Save Failure Modal */}
            <BaseModal
                isOpen={modalState.isOpen(modalNames.SAVE_FAILURE)}
                onClose={() => {}}
                title="SAVE FAILED"
                size="lg"
                variant="danger"
                warningLevel="standard"
                bottomText=""
                closeOnOverlayClick={false}
                closeOnEsc={false}
                mainText="A System Error Has Occurred"
                subText="Your save operation has failed. You may continue and attempt to save again or revert to the previously successful save."
                primaryAction={{
                    label: "Revert Data",
                    variant: "danger",
                    onClick: () => {
                        modalState.closeModal(modalNames.SAVE_FAILURE);
                        window.location.reload();
                    }
                }}
                secondaryAction={{
                    label: "Continue",
                    variant: "secondary",
                    onClick: () => {
                        modalState.closeModal(modalNames.SAVE_FAILURE);
                    }
                }}
            >
                {saveErrorMessage && (
                    <ErrorDisplay errorMessage={saveErrorMessage} />
                )}
            </BaseModal>

            {/* Auto-Sort Activated Modal */}
            <BaseModal
                isOpen={modalState.isOpen(modalNames.AUTO_SORT_ACTIVATED)}
                onClose={() => {}}
                title=""
                size="md"
                variant="default"
                closeOnOverlayClick={false}
                closeOnEsc={false}
                showFooter={false}
            >
                <VStack height="120px" align="center" justify="center" spacing={2}>
                    <Text fontSize="xl" fontWeight="bold" textAlign="center">
                        View Mode Activated
                    </Text>
                    <VStack spacing={1}>
                        <Text fontSize="md" textAlign="center" color="gray.600" _dark={{ color: "gray.400" }}>
                            Auto-Sort Enabled
                        </Text>
                        <Text fontSize="md" textAlign="center" color="gray.600" _dark={{ color: "gray.400" }}>
                            Displaying Clock Times
                        </Text>
                    </VStack>
                </VStack>
            </BaseModal>
        </>
    );
};
