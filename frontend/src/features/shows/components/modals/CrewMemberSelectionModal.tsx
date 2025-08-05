// frontend/src/features/shows/components/modals/CrewMemberSelectionModal.tsx

import React, { useState, useMemo, useCallback } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Box,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Flex,
  Spinner,
  Badge
} from '@chakra-ui/react';
import { AppIcon } from '../../../../components/AppIcon';
import { useCrews } from '../../../crew/hooks/useCrews';
import { CrewMember } from '../../types/crewAssignments';
import { formatRole } from '../../../../constants/userRoles';

interface CrewMemberSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (crewMember: CrewMember) => void;
}

export const CrewMemberSelectionModal: React.FC<CrewMemberSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  const { crews, isLoading } = useCrews();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter and search crew members
  const filteredCrews = useMemo(() => {
    if (!searchTerm.trim()) {
      return crews.slice(0, 5); // Show first 5 by default
    }

    const searchLower = searchTerm.toLowerCase().trim();
    const filtered = crews.filter(crew => {
      const fullName = `${crew.fullname_first || ''} ${crew.fullname_last || ''}`.toLowerCase();
      const email = (crew.email_address || '').toLowerCase();
      const role = (crew.user_role || '').toLowerCase();
      
      return fullName.includes(searchLower) || 
             email.includes(searchLower) || 
             role.includes(searchLower);
    });

    return filtered.slice(0, 5); // Limit to 5 results
  }, [crews, searchTerm]);

  const handleCrewSelect = useCallback((crewMember: CrewMember) => {
    onSelect(crewMember);
    onClose();
    // Reset search when closing
    setSearchTerm('');
  }, [onSelect, onClose]);

  const handleClose = useCallback(() => {
    onClose();
    setSearchTerm('');
  }, [onClose]);

  // Reset search when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const getDisplayName = (crew: CrewMember) => {
    const firstName = crew.fullname_first || '';
    const lastName = crew.fullname_last || '';
    return `${firstName} ${lastName}`.trim() || crew.email_address || 'Unknown';
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Select Crew Member</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {/* Search Input */}
          <InputGroup mb={4}>
            <InputLeftElement>
              <AppIcon name="search" />
            </InputLeftElement>
            <Input
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              bg="window.background"
            />
          </InputGroup>

          {/* Results Section */}
          <Box>
            <HStack justify="space-between" mb={3}>
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                {searchTerm.trim() ? 'Search Results' : 'Recent Crew Members'}
              </Text>
              <Text fontSize="sm" color="gray.500">
                {isLoading ? 'Loading...' : `${filteredCrews.length} of ${crews.length}`}
              </Text>
            </HStack>

            {isLoading ? (
              <Flex justify="center" align="center" height="200px">
                <Spinner />
              </Flex>
            ) : filteredCrews.length === 0 ? (
              <Text color="gray.500" textAlign="center" py={8}>
                {searchTerm.trim() 
                  ? 'No crew members match your search.'
                  : 'No crew members available.'
                }
              </Text>
            ) : (
              <VStack spacing={2} align="stretch">
                {filteredCrews.map((crew) => (
                  <Button
                    key={crew.user_id}
                    variant="ghost"
                    justifyContent="flex-start"
                    height="auto"
                    py={3}
                    px={4}
                    onClick={() => handleCrewSelect(crew)}
                    _hover={{
                      bg: "row.hover"
                    }}
                  >
                    <VStack spacing={1} align="flex-start" width="100%">
                      <HStack spacing={2} width="100%">
                        <Text fontWeight="medium" fontSize="md" flex={1} textAlign="left">
                          {getDisplayName(crew)}
                        </Text>
                        {crew.user_role && (
                          <Badge colorScheme="blue" variant="outline" size="md">
                            {formatRole(crew.user_role)}
                          </Badge>
                        )}
                      </HStack>
                      
                      {crew.email_address && (
                        <Text fontSize="sm" color="gray.600" textAlign="left" width="100%">
                          {crew.email_address}
                        </Text>
                      )}
                      
                      {crew.relationship_notes && (
                        <Text fontSize="xs" color="gray.500" noOfLines={1} textAlign="left" width="100%">
                          {crew.relationship_notes}
                        </Text>
                      )}
                    </VStack>
                  </Button>
                ))}
              </VStack>
            )}

            {/* Search hint */}
            {!searchTerm.trim() && crews.length > 5 && (
              <Text fontSize="xs" color="gray.400" textAlign="center" mt={3}>
                Start typing to search through all {crews.length} crew members
              </Text>
            )}
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};