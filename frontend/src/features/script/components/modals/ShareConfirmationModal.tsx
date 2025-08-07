// frontend/src/features/script/components/modals/ShareConfirmationModal.tsx

import React from 'react';
import { Text, VStack } from '@chakra-ui/react';
import { BaseModal } from '../../../../components/base/BaseModal';

interface ShareConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    crewCount: number;
    isLoading?: boolean;
}

export const ShareConfirmationModal: React.FC<ShareConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    crewCount,
    isLoading = false
}) => {
    return (
        <BaseModal
            title="Share Script"
            headerIcon="share"
            headerIconColor="blue.500"
            isOpen={isOpen}
            onClose={onClose}
            primaryAction={{
                label: "Share Script",
                onClick: onConfirm,
                variant: 'primary',
                isLoading: isLoading,
                loadingText: "Sharing..."
            }}
            secondaryAction={{
                label: "Cancel",
                onClick: onClose,
                variant: 'secondary'
            }}
        >
            <VStack spacing={4} align="stretch">
                <VStack align="center" spacing="4" width="100%">
                    <Text fontSize="md" textAlign="center">
                        {crewCount} crew member{crewCount !== 1 ? 's' : ''} will receive access.
                    </Text>
                    <Text fontSize="md" color="blue.400" fontWeight="bold" textAlign="center" lineHeight="1.4">
                        View crew links in Crew Assignments
                    </Text>
                </VStack>
            </VStack>
        </BaseModal>
    );
};