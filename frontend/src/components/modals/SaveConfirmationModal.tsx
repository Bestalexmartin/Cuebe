// frontend/src/components/modals/SaveConfirmationModal.tsx

import React from 'react';
import { Text, VStack } from '@chakra-ui/react';
import { BaseModal } from '../base/BaseModal';

interface SaveConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    changesCount: number;
    isSaving?: boolean;
}

export const SaveConfirmationModal: React.FC<SaveConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    changesCount,
    isSaving = false
}) => {
    return (
        <BaseModal
            title="Save Changes"
            headerIcon="save"
            headerIconColor="blue.500"
            isOpen={isOpen}
            onClose={onClose}
            primaryAction={{
                label: "Save Changes",
                onClick: onConfirm,
                variant: 'primary',
                isLoading: isSaving,
                loadingText: "Saving..."
            }}
            secondaryAction={{
                label: "Cancel",
                onClick: onClose,
                variant: 'secondary',
                isDisabled: isSaving
            }}
            size="md"
        >
            <VStack spacing={4} align="stretch">
                <VStack align="center" spacing="4" width="100%">
                    <Text fontSize="md" textAlign="center">
                        You have {changesCount} pending change{changesCount !== 1 ? 's' : ''} ready to save.
                    </Text>
                    <Text fontSize="md" color="orange.600" fontWeight="bold" textAlign="center" lineHeight="1.4">
                        This action will save your cumulative script changes and reset this session's edit history.
                        <br />
                        This action cannot be undone.
                    </Text>
                </VStack>
            </VStack>
        </BaseModal>
    );
};