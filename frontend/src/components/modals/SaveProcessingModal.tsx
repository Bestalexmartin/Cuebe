// frontend/src/components/modals/SaveProcessingModal.tsx

import React from 'react';
import { Text, VStack, Spinner } from '@chakra-ui/react';
import { BaseModal } from '../base/BaseModal';

interface SaveProcessingModalProps {
    isOpen: boolean;
    changesCount: number;
}

export const SaveProcessingModal: React.FC<SaveProcessingModalProps> = ({
    isOpen,
    changesCount
}) => {
    return (
        <BaseModal
            title="Saving Changes"
            headerIcon="save"
            headerIconColor="blue.500"
            isOpen={isOpen}
            onClose={() => {}} // No close functionality during save
            showCloseButton={false}
            customActions={[]} // No action buttons for processing modal
            size="md"
        >
            <VStack spacing={6} align="center">
                <Spinner size="lg" color="blue.500" thickness="3px" />
                
                <VStack spacing={2} align="center">
                    <Text fontWeight="medium" textAlign="center">
                        Saving {changesCount} change{changesCount !== 1 ? 's' : ''} to the database...
                    </Text>
                    
                    <Text fontSize="sm" textAlign="center">
                        Please wait while your changes are being saved.
                    </Text>
                </VStack>

                <Text fontSize="xs" color="orange.600" fontWeight="medium" textAlign="center">
                    Do not close this window or navigate away.
                </Text>
            </VStack>
        </BaseModal>
    );
};