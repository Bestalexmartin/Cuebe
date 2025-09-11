// frontend/src/features/shows/components/modals/CrewBioModal.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  Badge,
  Divider,
  IconButton,
  useClipboard,
  Input
} from '@chakra-ui/react';
import { QRCodeSVG } from 'qrcode.react';
import { MdRefresh } from "react-icons/md";
import { BaseModal } from '../../../../components/base/BaseModal';
import { CrewMember } from '../../types/crewAssignments';
import { formatRole } from '../../../../constants/userRoles';
import { AppIcon } from '../../../../components/AppIcon';
import { useAuth } from '@clerk/clerk-react';
import { useEnhancedToast } from '../../../../utils/toastUtils';

interface CrewBioModalProps {
  isOpen: boolean;
  onClose: () => void;
  crewMember: CrewMember | null;
  showId?: string;
  onShareUrlRefresh?: () => Promise<void>; // Called to trigger external refresh
}

export const CrewBioModal: React.FC<CrewBioModalProps> = ({
  isOpen,
  onClose,
  crewMember,
  showId,
  onShareUrlRefresh
}) => {
  const { getToken } = useAuth();
  const { showSuccess, showError } = useEnhancedToast();

  const getFullName = (): string => {
    if (!crewMember) return 'Unknown User';
    const firstName = crewMember.fullname_first || '';
    const lastName = crewMember.fullname_last || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown User';
  };

  const getUserStatusBadge = () => {
    if (!crewMember) return null;
    const isVerified = crewMember.user_status === 'verified';
    return (
      <Badge
        variant={isVerified ? "solid" : "outline"}
        colorScheme={isVerified ? "green" : "orange"}
        size="sm"
      >
        {isVerified ? "Verified" : "Guest"}
      </Badge>
    );
  };

  // State for the actual share token and URL
  const [shareUrl, setShareUrl] = useState('');
  const [isLoadingShare, setIsLoadingShare] = useState(false);

  // Get the share token when modal opens
  useEffect(() => {
    if (isOpen && showId && crewMember) {
      const getShareUrl = async () => {
        setIsLoadingShare(true);
        try {
          const token = await getToken();
          if (!token) {
            return;
          }

          const response = await fetch(`/api/shows/${showId}/crew/${crewMember.user_id}/share`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const shareData = await response.json();
            setShareUrl(`${window.location.origin}${shareData.share_url}`);
          } else {
          }
        } catch (error) {
          console.error('Error getting share URL:', error);
        } finally {
          setIsLoadingShare(false);
        }
      };

      getShareUrl();
    }
  }, [isOpen, showId, crewMember, getToken]);

  const { onCopy, hasCopied } = useClipboard(shareUrl);

  // Early return after all hooks are declared
  if (!crewMember) return null;

  // Handle refresh sharing link
  const handleRefreshLink = async () => {
    if (!showId || !crewMember) return;

    try {
      // If external refresh handler is provided, use it (for Edit Show page)
      if (onShareUrlRefresh) {
        await onShareUrlRefresh();
        // After external refresh, fetch the updated share URL for display
        const token = await getToken();
        if (token) {
          const response = await fetch(`/api/shows/${showId}/crew/${crewMember.user_id}/share`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (response.ok) {
            const shareData = await response.json();
            setShareUrl(`${window.location.origin}${shareData.share_url}`);
          }
        }
      } else {
        // Fallback: handle refresh internally (for Edit Department/Crew pages)
        const token = await getToken();
        if (!token) {
          throw new Error('Authentication token not available');
        }

        const response = await fetch(`/api/shows/${showId}/crew/${crewMember.user_id}/share?force_refresh=true`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to refresh sharing link');
        }

        const shareData = await response.json();
        setShareUrl(`${window.location.origin}${shareData.share_url}`);

        showSuccess(
          "Link Refreshed",
          `A new sharing link has been ${shareData.action}`
        );
      }
    } catch (error) {
      console.error('Error refreshing link:', error);
      showError("Failed to refresh sharing link. Please try again.");
    }
  };

  return (
    <BaseModal
      title=""
      isOpen={isOpen}
      onClose={onClose}
      customActions={[
        {
          label: "Close",
          variant: "outline",
          onClick: onClose
        }
      ]}
    >
      <VStack spacing={3} align="stretch" pt={0} px={10}>
        {/* Main Profile Section */}
        <HStack spacing={4} align="center" pt={0} pb={4}>
          <Avatar
            size="xl"
            name={getFullName()}
            src={crewMember.profile_img_url}
            flexShrink={0}
          />

          <VStack spacing={2} align="center" flex={1} justify="center">
            <Text fontSize="xl" fontWeight="bold" textAlign="center">
              {getFullName()}
            </Text>

            <HStack spacing={2} justify="center">
              <Badge variant="outline" colorScheme="blue" size="md">
                {formatRole(crewMember.user_role || '')}
              </Badge>
              {getUserStatusBadge()}
              {!crewMember.is_active && (
                <Badge variant="solid" colorScheme="red" size="md">
                  Inactive
                </Badge>
              )}
            </HStack>
          </VStack>
        </HStack>

        <Divider />

        {/* Contact Information */}
        <VStack spacing={2} align="stretch">
          <Text fontSize="md" fontWeight="semibold">
            Contact Information
          </Text>

          {crewMember.email_address && (
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }}>
                Email:
              </Text>
              <Text fontSize="sm" color="blue.500" _dark={{ color: "blue.300" }}>
                {crewMember.email_address}
              </Text>
            </HStack>
          )}

          {crewMember.phone_number && (
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }}>
                Phone:
              </Text>
              <Text fontSize="sm">
                {crewMember.phone_number}
              </Text>
            </HStack>
          )}
        </VStack>

        {/* Sharing Link */}
        {showId && (
          <>
            <Divider />
            <VStack spacing={2} align="stretch">
              <HStack justify="space-between" align="center">
                <Text fontSize="md" fontWeight="semibold">
                  Sharing Link
                </Text>
                <HStack spacing={1}>
                  <IconButton
                    aria-label={hasCopied ? "Copied!" : "Copy sharing link"}
                    icon={<AppIcon name="copy" />}
                    size="sm"
                    onClick={onCopy}
                    variant="ghost"
                    colorScheme={hasCopied ? "green" : "gray"}
                  />
                  <IconButton
                    aria-label="Regenerate sharing link"
                    icon={<MdRefresh size={20} />}
                    size="sm"
                    onClick={handleRefreshLink}
                    variant="ghost"
                    colorScheme="gray"
                  />
                </HStack>
              </HStack>
              <Box
                p={3}
                bg="app.background"
                borderRadius="md"
                border="1px solid"
                borderColor="green.400"
                _dark={{ borderColor: "green.400" }}
              >
                <Input
                  value={isLoadingShare ? 'Loading share URL...' : shareUrl}
                  isReadOnly
                  fontSize="xs"
                  fontFamily="monospace"
                  variant="unstyled"
                  p={0}
                  cursor="text"
                  opacity={isLoadingShare ? 0.6 : 1}
                />
              </Box>

              {shareUrl && !isLoadingShare && (
                <Box
                  alignSelf="center"
                  mt={5}
                  p={3}
                  bg="white"
                  borderRadius="md"
                  border="1px solid"
                  borderColor="green.400"
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  position="relative"
                >
                  <QRCodeSVG
                    value={shareUrl}
                    size={160}
                    bgColor="white"
                    fgColor="black"
                    level="M"
                  />
                  <Box
                    position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    bg="white"
                    borderRadius="0"
                    width="64px"
                    height="64px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <img
                      src="/cuebe-qr.svg"
                      alt="Cuebe"
                      style={{
                        width: '64px',
                        height: '64px',
                        display: 'block'
                      }}
                    />
                  </Box>
                </Box>
              )}
            </VStack>
          </>
        )}
      </VStack>
    </BaseModal>
  );
};
