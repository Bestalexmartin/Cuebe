// frontend/src/features/shows/components/modals/CrewBioModal.tsx

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  Badge,
  Divider
} from '@chakra-ui/react';
import { BaseModal } from '../../../../components/base/BaseModal';
import { CrewMember } from '../../types/crewAssignments';
import { formatRole } from '../../../../constants/userRoles';
import { formatDateTimeLocal } from '../../../../utils/dateTimeUtils';

interface CrewBioModalProps {
  isOpen: boolean;
  onClose: () => void;
  crewMember: CrewMember | null;
}

export const CrewBioModal: React.FC<CrewBioModalProps> = ({
  isOpen,
  onClose,
  crewMember
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

  return (
    <BaseModal
      title="Crew Member"
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      secondaryActions={[
        {
          label: "Close",
          variant: "outline",
          onClick: onClose
        }
      ]}
    >
      <VStack spacing={6} align="stretch">
        {/* Main Profile Section */}
        <VStack spacing={4} align="center" py={4}>
          <Avatar
            size="xl"
            name={getFullName()}
            src={crewMember.profile_img_url}
          />
          
          <VStack spacing={2} align="center">
            <Text fontSize="xl" fontWeight="bold" textAlign="center">
              {getFullName()}
            </Text>
            
            <HStack spacing={2}>
              <Badge variant="outline" colorScheme="blue" size="md">
                {formatRole(crewMember.user_role)}
              </Badge>
              {getUserStatusBadge()}
              {!crewMember.is_active && (
                <Badge variant="solid" colorScheme="red" size="md">
                  Inactive
                </Badge>
              )}
            </HStack>
          </VStack>
        </VStack>

        <Divider />

        {/* Contact Information */}
        <VStack spacing={3} align="stretch">
          <Text fontSize="md" fontWeight="semibold" color="gray.600" _dark={{ color: "gray.400" }}>
            Contact Information
          </Text>
          
          {crewMember.email_address && (
            <HStack spacing={3}>
              <Text fontSize="sm" fontWeight="medium" minWidth="60px">
                Email:
              </Text>
              <Text fontSize="sm" color="blue.500" _dark={{ color: "blue.300" }}>
                {crewMember.email_address}
              </Text>
            </HStack>
          )}
          
          {crewMember.phone_number && (
            <HStack spacing={3}>
              <Text fontSize="sm" fontWeight="medium" minWidth="60px">
                Phone:
              </Text>
              <Text fontSize="sm">
                {crewMember.phone_number}
              </Text>
            </HStack>
          )}
        </VStack>

        {/* Manager Notes (if any) */}
        {crewMember.relationship_notes && (
          <>
            <Divider />
            <VStack spacing={3} align="stretch">
              <Text fontSize="md" fontWeight="semibold" color="gray.600" _dark={{ color: "gray.400" }}>
                Manager Notes
              </Text>
              <Box
                p={3}
                bg="gray.50"
                _dark={{ bg: "gray.700" }}
                borderRadius="md"
                borderLeft="3px solid"
                borderLeftColor="blue.400"
              >
                <Text fontSize="sm" color="gray.700" _dark={{ color: "gray.300" }}>
                  {crewMember.relationship_notes}
                </Text>
              </Box>
            </VStack>
          </>
        )}

        {/* Account Information */}
        <Divider />
        <VStack spacing={3} align="stretch">
          <Text fontSize="md" fontWeight="semibold" color="gray.600" _dark={{ color: "gray.400" }}>
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
      </VStack>
    </BaseModal>
  );
};