// frontend/src/features/script/components/modals/ProcessingModal.tsx

import React from 'react';
import { BaseModal } from '../../../../components/base/BaseModal';

interface ProcessingModalProps {
    isOpen: boolean;
    title?: string;
    message?: string;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({
    isOpen,
    title = "Processing",
    message = "Please wait while we process your request..."
}) => {
    return (
        <BaseModal
            variant="processing"
            isOpen={isOpen}
            onClose={() => { }}
            processingTitle={title}
            processingMessage={message}
            maxWidth="400px"
            mx="4"
        />
    );
};
