// frontend/src/features/shows/components/modals/CrewBioModal.tsx

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  Badge,
  Divider,
  Spacer,
  IconButton,
  useClipboard,
  Input
} from '@chakra-ui/react';
import { BaseModal } from '../../../../components/base/BaseModal';
import { CrewMember } from '../../types/crewAssignments';
import { formatRole } from '../../../../constants/userRoles';
import { formatDateTimeLocal } from '../../../../utils/dateTimeUtils';
import { AppIcon } from '../../../../components/AppIcon';

interface CrewBioModalProps {
  isOpen: boolean;
  onClose: () => void;
  crewMember: CrewMember | null;
  showId?: string;
}

export const CrewBioModal: React.FC<CrewBioModalProps> = ({
  isOpen,
  onClose,
  crewMember,
  showId
}) => {
  if (!crewMember) return null;

  const getFullName = (): string => {
    const firstName = crewMember.fullname_first || '';
    const lastName = crewMember.fullname_last || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown User';
  };

  const getUserStatusBadge = () => {
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

  // Construct sharing URL for this crew member and show
  const sharingUrl = showId && crewMember 
    ? `${window.location.origin}/shared/${showId}/${crewMember.user_id}`
    : '';

  const { onCopy, hasCopied } = useClipboard(sharingUrl);

  return (
    <BaseModal
      title=""
      isOpen={isOpen}
      onClose={onClose}
      rightAlignActions={true}
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

        {/* Account Information */}
        <Divider />
        <VStack spacing={2} align="stretch">
          <Text fontSize="md" fontWeight="semibold">
            Account Information
          </Text>
          
          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }}>
              Created:
            </Text>
            <Text fontSize="sm">
              {formatDateTimeLocal(crewMember.date_created)}
            </Text>
          </HStack>
          
          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }}>
              Last Updated:
            </Text>
            <Text fontSize="sm">
              {formatDateTimeLocal(crewMember.date_updated)}
            </Text>
          </HStack>
        </VStack>

        {/* Manager Notes (if any) */}
        {crewMember.relationship_notes && (
          <>
            <Divider />
            <VStack spacing={2} align="stretch">
              <Text fontSize="md" fontWeight="semibold">
                Manager Notes
              </Text>
              <Text fontSize="sm">
                {crewMember.relationship_notes}
              </Text>
            </VStack>
          </>
        )}

        {/* Sharing Link */}
        {showId && (
          <>
            <Divider />
            <VStack spacing={2} align="stretch">
              <Text fontSize="md" fontWeight="semibold">
                Sharing Link
              </Text>
              <Box
                p={3}
                bg="app.background"
                borderRadius="md"
                border="1px solid"
                borderColor="gray.200"
                _dark={{ borderColor: "gray.600" }}
              >
                <HStack spacing={2}>
                  <Input
                    value={sharingUrl}
                    isReadOnly
                    fontSize="sm"
                    fontFamily="monospace"
                    variant="unstyled"
                    p={0}
                    cursor="text"
                  />
                  <IconButton
                    aria-label={hasCopied ? "Copied!" : "Copy sharing link"}
                    icon={<AppIcon name="copy" />}
                    size="sm"
                    onClick={onCopy}
                    variant="ghost"
                    colorScheme={hasCopied ? "green" : "gray"}
                  />
                </HStack>
              </Box>
            </VStack>
          </>
        )}
      </VStack>
    </BaseModal>
  );
};