// frontend/src/components/modals/FinalDeleteConfirmationModal.tsx

import React from 'react';
import { BaseModal } from '../base/BaseModal';

// TypeScript interfaces
interface FinalDeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
    entityType: string;
    entityName: string;
    warningMessage: string | React.ReactNode;
    actionWord?: string; // Defaults to "Delete"
    customMainText?: string; // Custom main text, overrides default
}

export const FinalDeleteConfirmationModal: React.FC<FinalDeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false,
    entityType,
    entityName,
    warningMessage,
    actionWord = "Delete",
    customMainText
}) => {
    return (
        <BaseModal
            variant="danger"
            warningLevel="final"
            title={`${actionWord} ${entityType}`}
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            mainText={customMainText || `"${entityName}" will be permanently deleted.`}
            subText={warningMessage}
            primaryAction={{
                label: `${actionWord} ${entityType}`,
                onClick: onConfirm,
                variant: 'danger',
                isLoading: isLoading,
                loadingText: "Deleting..."
            }}
            secondaryAction={{
                label: "Cancel",
                onClick: onClose,
                variant: 'secondary',
                isDisabled: isLoading
            }}
        />
    );
};