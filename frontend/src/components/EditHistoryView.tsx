// frontend/src/components/EditHistoryView.tsx

import React, { useState } from 'react';
import {
    VStack,
    HStack,
    Text,
    Box,
    Badge,
    Divider,
    IconButton
} from '@chakra-ui/react';
import { AppIcon } from './AppIcon';
import { EditOperation } from '../features/script/types/editQueue';
import { ScriptElement } from '../features/script/types/scriptElements';
import { EditQueueFormatter } from '../features/script/utils/editQueueFormatter';
import { useEnhancedToast } from '../utils/toastUtils';
import { RevertToPointModal } from './modals/RevertToPointModal';

interface EditHistoryViewProps {
    operations: EditOperation[];
    allElements: ScriptElement[];
    summary: string;
    onRevertToPoint?: (targetIndex: number) => void;
    onRevertSuccess?: () => void;
}

export const EditHistoryView: React.FC<EditHistoryViewProps> = ({
    operations,
    allElements,
    summary,
    onRevertToPoint,
    onRevertSuccess
}) => {
    const [isCopying, setIsCopying] = useState(false);
    const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
    const [revertTargetIndex, setRevertTargetIndex] = useState<number | null>(null);
    const [isReverting, setIsReverting] = useState(false);
    const { showSuccess, showError } = useEnhancedToast();


    const formatOperationsForCopy = () => {
        const header = `Script Edit History - ${new Date().toLocaleString()}\n`;
        const summaryLine = `Summary: ${summary}\n`;
        const separator = '='.repeat(60) + '\n';

        const operationsList = operations.map((operation, index) => {
            const timestamp = EditQueueFormatter.formatTimestamp(operation.timestamp);
            const description = EditQueueFormatter.formatOperation(operation, allElements);
            return `${index + 1}. [${timestamp}] ${description}`;
        }).join('\n');

        return header + summaryLine + separator + operationsList;
    };

    const handleCopyHistory = async () => {
        setIsCopying(true);

        try {
            const textToCopy = formatOperationsForCopy();
            await navigator.clipboard.writeText(textToCopy);

            showSuccess("Edit history copied", "The edit history has been copied to your clipboard");
        } catch (err) {
            console.error('Failed to copy edit history:', err);
            showError("Copy failed", { description: "Failed to copy edit history to clipboard" });
        } finally {
            setIsCopying(false);
        }
    };

    const handleRowClick = (index: number) => {
        if (!onRevertToPoint || index === operations.length - 1) {
            // Don't allow reverting to the most recent change (it would do nothing)
            return;
        }

        setRevertTargetIndex(index);
        setIsRevertModalOpen(true);
    };

    const handleRevertConfirm = async () => {
        if (revertTargetIndex === null || !onRevertToPoint) return;

        setIsReverting(true);
        try {
            await onRevertToPoint(revertTargetIndex);
            showSuccess("Changes Reverted", `Script reverted to change #${revertTargetIndex + 1}`);
            setIsRevertModalOpen(false);
            setRevertTargetIndex(null);
            // Switch back to edit mode after successful revert
            onRevertSuccess?.();
        } catch (error) {
            console.error('Error reverting changes:', error);
            showError("Revert Failed", { description: "Failed to revert changes. Please try again." });
        } finally {
            setIsReverting(false);
        }
    };

    const handleRevertCancel = () => {
        setIsRevertModalOpen(false);
        setRevertTargetIndex(null);
    };

    if (operations.length === 0) {
        return (
            <VStack height="100%" spacing={4} align="stretch" p={6}>
                <HStack justify="space-between" align="center">
                    <HStack spacing={3}>
                        <AppIcon name="script-edit" boxSize="24px" color="gray.500" />
                        <Text fontSize="xl" fontWeight="semibold" color="gray.700">
                            Edit History
                        </Text>
                    </HStack>
                </HStack>

                <Divider />

                <VStack justify="center" align="center" flex={1} spacing={4}>
                    <Text color="gray.500" fontSize="lg" textAlign="center">
                        No edits have been made yet
                    </Text>
                    <Text color="gray.400" fontSize="sm" textAlign="center">
                        Changes to script elements will appear here
                    </Text>
                </VStack>
            </VStack>
        );
    }

    return (
        <Box height="100%" position="relative">
            {/* Fixed Header */}
            <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                zIndex={10}
                bg="window.background"
                px={1}
                py={3}
                pt={2}
                borderBottom="1px solid"
                borderColor="ui.border"
            >
                <HStack justify="space-between" align="center" mb={2} mt={-1}>
                    <HStack spacing={3}>
                        <AppIcon name="script-edit" boxSize="20px" color="page.text" />
                        <Text fontSize="lg" fontWeight="semibold">
                            Edit History
                        </Text>
                    </HStack>

                    <IconButton
                        aria-label="Copy edit history"
                        icon={<AppIcon name="copy" boxSize="16px" />}
                        size="sm"
                        variant="ghost"
                        isLoading={isCopying}
                        onClick={handleCopyHistory}
                        colorScheme="gray"
                    />
                </HStack>

                <HStack justify="space-between" align="center" mt={-1}>
                    <Text fontSize="sm" color="detail.text" fontWeight="medium">
                        {summary}
                    </Text>

                    <Text fontSize="sm" color="detail.text" fontWeight="medium">
                        Last updated: {operations.length > 0 ? EditQueueFormatter.formatTimestamp(operations[operations.length - 1].timestamp) : 'Never'}
                    </Text>
                </HStack>
            </Box>

            {/* Operations List - with top padding to account for fixed header */}
            <Box height="100%" overflowY="auto" className="hide-scrollbar" pt="72px">
                <VStack spacing={0} align="stretch">
                    {operations.map((operation, index) => {
                        const formattedDescription = EditQueueFormatter.formatOperation(operation, allElements);
                        const timestamp = EditQueueFormatter.formatTimestamp(operation.timestamp);

                        const isClickable = onRevertToPoint && index < operations.length - 1;

                        return (
                            <Box
                                key={operation.id}
                                py={2}
                                px={1}
                                borderBottom="1px solid"
                                borderColor="ui.border"
                                _hover={{
                                    bg: "row.hover",
                                    cursor: isClickable ? "pointer" : "default"
                                }}
                                onClick={() => isClickable && handleRowClick(index)}
                                position="relative"
                            >
                                <HStack align="center">
                                    <Box
                                        minWidth="24px"
                                        height="24px"
                                        bg="blue.100"
                                        borderRadius="full"
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                        flexShrink={0}
                                        mr={4}
                                    >
                                        <Text fontSize="md" fontWeight="bold" color="blue.700">
                                            {index + 1}
                                        </Text>
                                    </Box>

                                    <Box width="200px" flexShrink={0} mr={10}>
                                        <Badge
                                            size="sm"
                                            colorScheme={getOperationColor(operation.type)}
                                            variant="subtle"
                                            px={2}
                                            py={1}
                                        >
                                            {operation.type.toLowerCase().replace(/_/g, ' ')}
                                        </Badge>
                                    </Box>

                                    <Box width="120px" flexShrink={0} mr={3}>
                                        <Text fontSize="sm" color="page.text" fontWeight="medium">
                                            {timestamp}
                                        </Text>
                                    </Box>

                                    <Box flex={1}>
                                        <Text fontSize="sm" fontWeight="medium" lineHeight="1.4" color="page.text">
                                            {formattedDescription}
                                        </Text>
                                    </Box>
                                </HStack>
                            </Box>
                        );
                    })}
                </VStack>
            </Box>

            {/* Revert to Point Modal */}
            <RevertToPointModal
                isOpen={isRevertModalOpen}
                onClose={handleRevertCancel}
                onConfirm={handleRevertConfirm}
                targetOperation={revertTargetIndex !== null ? operations[revertTargetIndex] : null}
                operationsToLose={revertTargetIndex !== null ? operations.slice(revertTargetIndex + 1) : []}
                isReverting={isReverting}
                targetEditNumber={revertTargetIndex !== null ? revertTargetIndex + 1 : undefined}
            />
        </Box>
    );
};

function getOperationColor(operationType: string): string {
    switch (operationType) {
        // Structural/Organization Changes
        case 'REORDER':
        case 'BULK_REORDER':
            return 'purple';

        // Content Updates/Modifications
        case 'UPDATE_FIELD':
        case 'UPDATE_TIME_OFFSET':
            return 'blue';

        // Creation/Addition
        case 'CREATE_ELEMENT':
        case 'DUPLICATE_ELEMENT':
            return 'green';

        // Deletion/Removal
        case 'DELETE_ELEMENT':
        case 'REMOVE_ELEMENT':
            return 'red';

        // Complex Operations
        case 'BATCH_UPDATE':
        case 'MERGE_ELEMENTS':
            return 'orange';

        // Import/Export/System
        case 'IMPORT_ELEMENTS':
        case 'EXPORT_ELEMENTS':
        case 'SYNC_ELEMENTS':
            return 'teal';

        // Caution/Review Operations
        case 'VALIDATE_ELEMENTS':
        case 'REVIEW_CHANGES':
            return 'yellow';

        default:
            return 'gray';
    }
}