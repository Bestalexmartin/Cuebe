// frontend/src/components/modals/UnsavedChangesModal.tsx

import React from 'react';
import { Text, VStack, Box } from '@chakra-ui/react';
import { BaseModal } from '../base/BaseModal';

interface UnsavedChangesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => Promise<void>;
    onDiscard: () => void;
    changesCount: number;
    isSaving?: boolean;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onDiscard,
    changesCount,
    isSaving = false
}) => {
    const handleSave = async () => {
        await onSave();
    };

    const handleDiscard = () => {
        onDiscard();
    };

    return (
        <BaseModal
            title="Unsaved Changes"
            headerIcon="warning"
            headerIconColor="orange.500"
            isOpen={isOpen}
            onClose={onClose}
            closeOnOverlayClick={false}
            closeOnEsc={false}
            isCentered={true}
            size="md"
            bg="window.background"
            borderRadius="lg"
            border="1px solid"
            borderColor="ui.border"
            customActions={[
                {
                    label: "Cancel",
                    onClick: onClose,
                    variant: 'outline' as const,
                    isDisabled: isSaving
                },
                {
                    label: "Discard Changes",
                    onClick: handleDiscard,
                    variant: 'danger' as const,
                    isDisabled: isSaving
                },
                {
                    label: "Save & Continue",
                    onClick: handleSave,
                    variant: 'primary' as const,
                    isLoading: isSaving,
                    loadingText: "Saving..."
                }
            ]}
        >
            <VStack spacing={4} align="stretch">
                <Text color="page.text" lineHeight="1.6">
                    You have <Text as="span" fontWeight="bold" color="orange.500">{changesCount} unsaved change{changesCount !== 1 ? 's' : ''}</Text> to this script.
                </Text>
                
                <Text color="detail.text" fontSize="sm" lineHeight="1.5">
                    If you leave without saving, your changes will be lost permanently.
                </Text>

                <Box 
                    bg="card.background" 
                    p={3} 
                    borderRadius="md" 
                    border="1px solid" 
                    borderColor="ui.border"
                >
                    <Text fontSize="sm" color="detail.text" fontWeight="medium">
                        What would you like to do?
                    </Text>
                </Box>
            </VStack>
        </BaseModal>
    );
};