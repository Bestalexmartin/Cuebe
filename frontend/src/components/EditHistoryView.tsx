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
            const operationType = operation.type.replace(' WITH PROPAGATION', '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
            const description = EditQueueFormatter.formatOperation(operation, allElements);
            return `${index + 1}. [${operationType}] ${timestamp} - ${description}`;
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
                px={1}
                py={3}
                pt={2}
                borderBottom="1px solid"
                borderColor="ui.border"
                bg="page.background"
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
            <Box height="100%" overflowY="auto" className="hide-scrollbar" pt="87px">
                <VStack spacing={1} align="stretch">
                    {operations.map((operation, index) => {
                        const formattedDescription = EditQueueFormatter.formatOperation(operation, allElements);
                        const timestamp = EditQueueFormatter.formatTimestamp(operation.timestamp);

                        const isClickable = onRevertToPoint && index < operations.length - 1;
                        const paddedNumber = String(index + 1).padStart(2, '0');
                        
                        // Calculate blue color progression - most recent (last) is blue.400, older ones progressively darker
                        const distanceFromMostRecent = operations.length - 1 - index;
                        const blueIntensity = Math.min(900, 400 + (distanceFromMostRecent * 100));
                        const blueColor = `blue.${blueIntensity}`;

                        return (
                            <Box
                                key={operation.id}
                                py={2}
                                px={4}
                                border="2px solid"
                                borderColor="transparent"
                                borderRadius="md"
                                bg="card.background"
                                _hover={{
                                    borderColor: "orange.400",
                                    cursor: isClickable ? "pointer" : "default"
                                }}
                                onClick={() => isClickable && handleRowClick(index)}
                                transition="all 0s"
                            >
                                <HStack align="center" spacing={6}>
                                    {/* Number Circle - same size as department/avatar spots */}
                                    <Box
                                        w="32px"
                                        h="32px"
                                        borderRadius="full"
                                        bg={blueColor}
                                        flexShrink={0}
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                    >
                                        <Text
                                            fontSize="xs"
                                            fontWeight="bold"
                                            color="white"
                                            userSelect="none"
                                            fontFamily="mono"
                                        >
                                            {paddedNumber}
                                        </Text>
                                    </Box>

                                    {/* Operation Type Badge - outline style like role badges */}
                                    <Box 
                                        width="220px" 
                                        flexShrink={0}
                                        display="flex"
                                        alignItems="center"
                                    >
                                        <Badge
                                            colorScheme="blue"
                                            variant="outline"
                                            size="sm"
                                            maxWidth="100%"
                                            isTruncated
                                        >
                                            {operation.type.toLowerCase().replace(/_/g, ' ').replace(' with propagation', '')}
                                        </Badge>
                                    </Box>

                                    {/* Timestamp */}
                                    <Box 
                                        width="200px" 
                                        flexShrink={0}
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                    >
                                        <Text 
                                            fontSize="sm" 
                                            color="gray.700" 
                                            _dark={{ color: "gray.300" }}
                                            fontWeight="medium"
                                        >
                                            {timestamp}
                                        </Text>
                                    </Box>

                                    {/* Description */}
                                    <Box 
                                        flex={1}
                                        display="flex"
                                        alignItems="center"
                                    >
                                        <Text 
                                            fontSize="sm" 
                                            fontWeight="medium" 
                                            lineHeight="1.4" 
                                            color="gray.700"
                                            _dark={{ color: "gray.300" }}
                                            isTruncated
                                        >
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


