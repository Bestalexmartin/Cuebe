// frontend/src/components/modals/AbandonChangesModal.tsx

import React from 'react';
import { BaseModal } from '../base/BaseModal';

// TypeScript interfaces
interface AbandonChangesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
    changesCount: number;
    customMainText?: string; // Custom main text, overrides default
    warningMessage?: string; // Additional warning text
    customHeader?: string; // Custom header text, defaults to "Abandon Changes"
    customConfirmText?: string; // Custom confirm button text, defaults to "Abandon Changes"
    customCancelText?: string; // Custom cancel button text, defaults to "Keep Changes"
    customLoadingText?: string; // Custom loading text, defaults to "Abandoning..."
    hideBottomWarning?: boolean; // Hide the "This action cannot be undone" text
    customBottomWarning?: string; // Custom bottom warning text, overrides default
    hideMiddleWarning?: boolean; // Hide the middle warning text entirely
}

export const AbandonChangesModal: React.FC<AbandonChangesModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false,
    changesCount,
    customMainText,
    warningMessage,
    customHeader = "Abandon Changes",
    customConfirmText = "Abandon Changes",
    customCancelText = "Keep Changes",
    customLoadingText = "Abandoning...",
    hideBottomWarning = false,
    customBottomWarning,
    hideMiddleWarning = false
}) => {
    const defaultMainText = `${changesCount} unsaved change${changesCount !== 1 ? 's' : ''} will be permanently discarded.`;
    const defaultWarning = "You can recreate these changes later, but any unsaved work will be lost.";

    return (
        <BaseModal
            variant="warning"
            warningLevel="standard"
            title={customHeader}
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            mainText={customMainText || defaultMainText}
            subText={!hideMiddleWarning ? (warningMessage || defaultWarning) : undefined}
            bottomText={!hideBottomWarning ? (customBottomWarning || "This action cannot be undone.") : undefined}
            primaryAction={{
                label: customConfirmText,
                onClick: onConfirm,
                variant: 'danger',
                isLoading: isLoading,
                loadingText: customLoadingText
            }}
            secondaryAction={{
                label: customCancelText,
                onClick: onClose,
                variant: 'secondary',
                isDisabled: isLoading
            }}
        />
    );
};