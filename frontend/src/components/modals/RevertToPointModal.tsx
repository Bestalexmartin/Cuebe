// frontend/src/components/modals/RevertToPointModal.tsx

import React, { useState } from 'react';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { FinalDeleteConfirmationModal } from './FinalDeleteConfirmationModal';
import { EditOperation } from '../../features/script/types/editQueue';

interface RevertToPointModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    targetOperation: EditOperation | null;
    operationsToLose: EditOperation[];
    isReverting?: boolean;
    targetEditNumber?: number;
}

export const RevertToPointModal: React.FC<RevertToPointModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    targetOperation,
    operationsToLose,
    isReverting = false,
    targetEditNumber
}) => {
    const [showFinalConfirmation, setShowFinalConfirmation] = useState(false);

    const handleInitialConfirm = () => {
        setShowFinalConfirmation(true);
    };

    const handleFinalConfirm = () => {
        onConfirm();
        setShowFinalConfirmation(false);
    };

    const handleClose = () => {
        setShowFinalConfirmation(false);
        onClose();
    };

    if (!targetOperation) return null;

    // Use the provided edit number, or fall back to calculation
    const editNumber = targetEditNumber || (operationsToLose.length + 1);

    return (
        <>
            {/* First confirmation modal */}
            <DeleteConfirmationModal
                isOpen={isOpen && !showFinalConfirmation}
                onClose={handleClose}
                onConfirm={handleInitialConfirm}
                entityType="Edits"
                entityName={`Edit ${editNumber}`}
                additionalInfo={[]}
                actionWord="Revert"
                customQuestion={`Are you sure you want to revert to Edit ${editNumber}?`}
                customWarning="All edits after this point will be deleted. This action cannot be undone."
            />

            {/* Final confirmation modal */}
            <FinalDeleteConfirmationModal
                isOpen={isOpen && showFinalConfirmation}
                onClose={handleClose}
                onConfirm={handleFinalConfirm}
                isLoading={isReverting}
                entityType="Edits"
                entityName={`Edit ${editNumber}`}
                warningMessage={<>This will permanently revert your script to Edit {editNumber}.<br />All changes after this point will be lost forever.</>}
                actionWord="Revert"
                customMainText={`${operationsToLose.length} edit${operationsToLose.length !== 1 ? 's' : ''} will be permanently deleted.`}
            />
        </>
    );
};