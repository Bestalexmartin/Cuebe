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
import { QRCodeSVG } from 'qrcode.react';
import { MdRefresh } from "react-icons/md";
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
                    onClick={() => {}} // Placeholder for future implementation
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
                  value={sharingUrl}
                  isReadOnly
                  fontSize="xs"
                  fontFamily="monospace"
                  variant="unstyled"
                  p={0}
                  cursor="text"
                />
              </Box>
              
              {sharingUrl && (
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
                    value={sharingUrl}
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
                    borderRadius="md"
                    width="50px"
                    height="50px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <img
                      src="/cuebe-qr.svg"
                      alt="Cuebe"
                      style={{
                        width: '60px',
                        height: '60px',
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