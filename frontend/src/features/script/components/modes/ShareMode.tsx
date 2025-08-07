// frontend/src/features/script/components/modes/ShareMode.tsx

import React, { useState, useEffect } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Button,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Badge,
    IconButton,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Alert,
    AlertIcon,
    Spinner,
    Flex,
    useDisclosure,
    useToast,
    Tooltip
} from '@chakra-ui/react';
import { formatDistanceToNow } from 'date-fns';

import { ShareScriptModal } from '../modals/ShareScriptModal';
import { useShareScript, ScriptShareResponse } from '../../hooks/useShareScript';
import { useEnhancedToast } from '../../../../utils/toastUtils';
import { AppIcon } from '../../../../components/AppIcon';

interface ShareModeProps {
    scriptId: string;
    scriptName: string;
    showId: string;
}

export const ShareMode: React.FC<ShareModeProps> = ({ scriptId, scriptName, showId }) => {
    const [shares, setShares] = useState<ScriptShareResponse[]>([]);
    const [shareStats, setShareStats] = useState<{
        total_count: number;
        active_count: number;
        expired_count: number;
    } | null>(null);

    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();
    const { showSuccess, showError } = useEnhancedToast();

    const { 
        listShares, 
        revokeShare, 
        regenerateToken, 
        isLoading 
    } = useShareScript();

    // Load shares on component mount
    useEffect(() => {
        loadShares();
    }, [scriptId]);

    const loadShares = async () => {
        try {
            const result = await listShares(scriptId, false); // Get all shares, including expired
            setShares(result.shares);
            setShareStats({
                total_count: result.total_count,
                active_count: result.active_count,
                expired_count: result.expired_count
            });
        } catch (error) {
            console.error('Error loading shares:', error);
        }
    };

    const handleRevokeShare = async (token: string, shareName?: string) => {
        try {
            await revokeShare(scriptId, token);
            showSuccess('Share Revoked', `"${shareName || 'Share'}" has been revoked successfully.`);
            loadShares(); // Refresh the list
        } catch (error) {
            console.error('Error revoking share:', error);
        }
    };

    const handleRegenerateToken = async (token: string, shareName?: string) => {
        try {
            await regenerateToken(scriptId, token);
            showSuccess('Token Regenerated', `A new link has been generated for "${shareName || 'Share'}".`);
            loadShares(); // Refresh the list
        } catch (error) {
            console.error('Error regenerating token:', error);
        }
    };

    const handleCopyShareUrl = (shareUrl: string, shareName?: string) => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            showSuccess('Link Copied', `Link for "${shareName || 'Share'}" copied to clipboard.`);
        }).catch(() => {
            showError('Copy Failed', 'Unable to copy link to clipboard.');
        });
    };

    const handleShareCreated = () => {
        loadShares(); // Refresh the list when a new share is created
        onClose();
    };

    const getStatusBadge = (share: ScriptShareResponse) => {
        if (!share.is_active) {
            return <Badge colorScheme="red" variant="subtle">Revoked</Badge>;
        }
        if (share.is_expired) {
            return <Badge colorScheme="orange" variant="subtle">Expired</Badge>;
        }
        return <Badge colorScheme="green" variant="subtle">Active</Badge>;
    };

    const formatAccessCount = (count: number) => {
        if (count === 0) return 'No access';
        if (count === 1) return '1 access';
        return `${count} accesses`;
    };

    if (isLoading && shares.length === 0) {
        return (
            <Flex height="100%" align="center" justify="center">
                <VStack spacing={4}>
                    <Spinner size="lg" />
                    <Text>Loading shares...</Text>
                </VStack>
            </Flex>
        );
    }

    return (
        <Box height="100%" p={4}>
            <VStack spacing={6} align="stretch" height="100%">
                {/* Header */}
                <HStack justify="space-between" align="center">
                    <Box>
                        <Text fontSize="xl" fontWeight="bold">
                            Script Sharing
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                            Create and manage sharing links for "{scriptName}"
                        </Text>
                    </Box>
                    
                    <HStack spacing={3}>
                        <Button
                            leftIcon={<AppIcon name="refresh" />}
                            variant="outline"
                            size="sm"
                            onClick={loadShares}
                            isLoading={isLoading}
                        >
                            Refresh
                        </Button>
                        <Button
                            leftIcon={<AppIcon name="add" />}
                            colorScheme="blue"
                            onClick={onOpen}
                        >
                            Create Share
                        </Button>
                    </HStack>
                </HStack>

                {/* Stats */}
                {shareStats && (
                    <HStack spacing={6}>
                        <VStack spacing={0} align="center">
                            <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                                {shareStats.total_count}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                                Total Shares
                            </Text>
                        </VStack>
                        
                        <VStack spacing={0} align="center">
                            <Text fontSize="2xl" fontWeight="bold" color="green.500">
                                {shareStats.active_count}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                                Active
                            </Text>
                        </VStack>
                        
                        <VStack spacing={0} align="center">
                            <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                                {shareStats.expired_count}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                                Expired
                            </Text>
                        </VStack>
                    </HStack>
                )}

                {/* Shares Table */}
                <Box flex={1} overflowY="auto">
                    {shares.length === 0 ? (
                        <Flex height="200px" align="center" justify="center" direction="column">
                            <Text color="gray.500" fontSize="lg" mb={4}>
                                No shares created yet
                            </Text>
                            <Button
                                leftIcon={<AppIcon name="add" />}
                                colorScheme="blue"
                                onClick={onOpen}
                            >
                                Create Your First Share
                            </Button>
                        </Flex>
                    ) : (
                        <Table variant="simple" size="sm">
                            <Thead>
                                <Tr>
                                    <Th>Name</Th>
                                    <Th>Status</Th>
                                    <Th>Shared With</Th>
                                    <Th>Access Count</Th>
                                    <Th>Expires</Th>
                                    <Th>Created</Th>
                                    <Th width="80px">Actions</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {shares.map((share) => (
                                    <Tr key={share.share_id}>
                                        <Td>
                                            <Text fontWeight="medium">
                                                {share.share_name || 'Unnamed Share'}
                                            </Text>
                                            {share.notes && (
                                                <Text fontSize="xs" color="gray.500">
                                                    {share.notes}
                                                </Text>
                                            )}
                                        </Td>
                                        
                                        <Td>
                                            {getStatusBadge(share)}
                                        </Td>
                                        
                                        <Td>
                                            <VStack spacing={0} align="flex-start">
                                                <Text fontSize="sm" fontWeight="medium">
                                                    {share.shared_with_user_name || 'Unknown User'}
                                                </Text>
                                                {share.shared_with_user_email && (
                                                    <Text fontSize="xs" color="gray.500">
                                                        {share.shared_with_user_email}
                                                    </Text>
                                                )}
                                            </VStack>
                                        </Td>
                                        
                                        <Td>
                                            <VStack spacing={0} align="flex-start">
                                                <Text fontSize="sm">
                                                    {formatAccessCount(share.access_count)}
                                                </Text>
                                                {share.last_accessed_at && (
                                                    <Text fontSize="xs" color="gray.500">
                                                        Last: {formatDistanceToNow(new Date(share.last_accessed_at))} ago
                                                    </Text>
                                                )}
                                            </VStack>
                                        </Td>
                                        
                                        <Td>
                                            <Text fontSize="sm">
                                                {share.expires_at 
                                                    ? formatDistanceToNow(new Date(share.expires_at))
                                                    : 'Never'
                                                }
                                            </Text>
                                        </Td>
                                        
                                        <Td>
                                            <Text fontSize="sm">
                                                {formatDistanceToNow(new Date(share.date_created))} ago
                                            </Text>
                                        </Td>
                                        
                                        <Td>
                                            <Menu>
                                                <MenuButton
                                                    as={IconButton}
                                                    icon={<AppIcon name="more-vertical" />}
                                                    variant="ghost"
                                                    size="sm"
                                                    aria-label="Share actions"
                                                />
                                                <MenuList>
                                                    {share.is_active && !share.is_expired && (
                                                        <>
                                                            <MenuItem
                                                                icon={<AppIcon name="copy" />}
                                                                onClick={() => handleCopyShareUrl(
                                                                    share.share_url, 
                                                                    share.share_name
                                                                )}
                                                            >
                                                                Copy Link
                                                            </MenuItem>
                                                            <MenuItem
                                                                icon={<AppIcon name="external-link" />}
                                                                onClick={() => window.open(share.share_url, '_blank')}
                                                            >
                                                                Preview
                                                            </MenuItem>
                                                            <MenuItem
                                                                icon={<AppIcon name="refresh" />}
                                                                onClick={() => handleRegenerateToken(
                                                                    share.share_token,
                                                                    share.share_name
                                                                )}
                                                            >
                                                                Regenerate Link
                                                            </MenuItem>
                                                        </>
                                                    )}
                                                    
                                                    {share.is_active && (
                                                        <MenuItem
                                                            color="red.500"
                                                            onClick={() => handleRevokeShare(
                                                                share.share_token,
                                                                share.share_name
                                                            )}
                                                        >
                                                            Revoke Access
                                                        </MenuItem>
                                                    )}
                                                </MenuList>
                                            </Menu>
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    )}
                </Box>

                {/* Info Alert */}
                <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Box>
                        <Text fontSize="sm">
                            <strong>Script Sharing:</strong> Create secure links to share your script with crew members. 
                            Each share can be configured for specific departments and includes access tracking.
                        </Text>
                    </Box>
                </Alert>
            </VStack>

            {/* Share Creation Modal */}
            <ShareScriptModal
                isOpen={isOpen}
                onClose={onClose}
                scriptId={scriptId}
                scriptName={scriptName}
                showId={showId}
            />
        </Box>
    );
};
