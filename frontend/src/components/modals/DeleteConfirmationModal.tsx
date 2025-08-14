// frontend/src/components/modals/DeleteConfirmationModal.tsx

import React from 'react';
import { Text, VStack } from "@chakra-ui/react";
import { BaseModal } from '../base/BaseModal';

// TypeScript interfaces
interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
    entityType: string;
    entityName: string;
    additionalInfo?: string[];
    actionWord?: string; // Defaults to "Delete"
    customQuestion?: string; // Custom question text, overrides default
    customWarning?: string; // Custom warning text, overrides default
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false,
    entityType,
    entityName,
    additionalInfo = [],
    actionWord = "Delete",
    customQuestion,
    customWarning
}) => {
    return (
        <BaseModal
            title={`${actionWord} ${entityType}`}
            headerIcon="warning"
            headerIconColor="red.500"
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            primaryAction={{
                label: `${actionWord} ${entityType}`,
                onClick: onConfirm,
                variant: 'primary',
                isLoading: isLoading,
                loadingText: "Deleting..."
            }}
            secondaryAction={{
                label: "Cancel",
                onClick: onClose,
                variant: 'secondary',
                isDisabled: isLoading
            }}
        >
            <VStack spacing="4" align="stretch">
                <VStack align="center" spacing="4" width="100%">
                    <Text fontSize="md" textAlign="center">
                        {customQuestion || `Are you sure you want to delete "${entityName}"?`}
                    </Text>
                    <Text fontSize="md" color="red.500" fontWeight="bold" textAlign="center" lineHeight="1.4">
                        {customWarning || (
                            <>
                                This {entityType.toLowerCase()} will be permanently removed.
                                <br />
                                This action cannot be undone.
                            </>
                        )}
                    </Text>
                </VStack>

                {additionalInfo.length > 0 && (
                    <VStack align="start" spacing="2">
                        <Text fontSize="sm" fontWeight="medium" color="gray.600">
                            This will also remove:
                        </Text>
                        <VStack align="start" spacing="1" pl="4">
                            {additionalInfo.map((info, index) => (
                                <Text key={index} fontSize="sm" color="gray.600">
                                    • {info}
                                </Text>
                            ))}
                        </VStack>
                    </VStack>
                )}
            </VStack>
        </BaseModal>
    );
};