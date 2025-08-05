// frontend/src/components/modals/SaveConfirmationModal.tsx

import React from 'react';
import { Text, VStack } from '@chakra-ui/react';
import { BaseModal } from '../base/BaseModal';

interface SaveConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void; // Changed from Promise<void> since this just advances to next modal
    changesCount: number;
}

export const SaveConfirmationModal: React.FC<SaveConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    changesCount
}) => {
    return (
        <BaseModal
            title="Save Changes"
            headerIcon="save"
            headerIconColor="blue.500"
            isOpen={isOpen}
            onClose={onClose}
            primaryAction={{
                label: "Continue",
                onClick: onConfirm,
                variant: 'primary'
            }}
            secondaryAction={{
                label: "Cancel",
                onClick: onClose,
                variant: 'secondary'
            }}
            size="md"
        >
            <VStack spacing={4} align="stretch">
                <VStack align="center" spacing="4" width="100%">
                    <Text fontSize="md" textAlign="center">
                        Are you ready to save {changesCount} pending change{changesCount !== 1 ? 's' : ''}?
                    </Text>
                    <Text fontSize="md" color="blue.400" fontWeight="bold" textAlign="center" lineHeight="1.4">
                        This will permanently save your changes to the database and reset your edit history.
                    </Text>
                </VStack>
            </VStack>
        </BaseModal>
    );
};