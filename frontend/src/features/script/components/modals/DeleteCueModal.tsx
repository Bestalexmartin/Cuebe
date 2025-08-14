// frontend/src/features/script/components/modals/DeleteCueModal.tsx

import React from 'react';
import { Text, VStack } from '@chakra-ui/react';
import { BaseModal } from '../../../../components/base/BaseModal';

interface DeleteCueModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    cueName: string;
    isDeleting?: boolean;
}

export const DeleteCueModal: React.FC<DeleteCueModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    cueName,
    isDeleting = false
}) => {
    return (
        <BaseModal
            title="Delete Script Element"
            headerIcon="warning"
            headerIconColor="red.500"
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            primaryAction={{
                label: "Delete Script Element",
                onClick: onConfirm,
                variant: 'primary',
                isLoading: isDeleting,
                loadingText: "Deleting..."
            }}
            secondaryAction={{
                label: "Cancel",
                onClick: onClose,
                variant: 'secondary',
                isDisabled: isDeleting
            }}
        >
            <VStack spacing="4" align="stretch">
                <VStack align="center" spacing="4" width="100%">
                    <Text fontSize="md" textAlign="center">
                        Are you sure you want to delete "{cueName}"?
                    </Text>
                    <Text fontSize="md" color="orange.500" fontWeight="bold" textAlign="center" lineHeight="1.4">
                        This script element will be removed from your script but may be restored from the edit history before saving.
                    </Text>
                </VStack>
            </VStack>
        </BaseModal>
    );
};
