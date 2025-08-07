// frontend/src/features/shows/components/modals/AssignCrewModal.tsx

import React, { useState, useMemo, useCallback } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Select,
  Flex,
  Box,
  Spinner,
  Badge,
  Avatar
} from '@chakra-ui/react';
import { BaseModal } from '../../../../components/base/BaseModal';
import { AppIcon } from '../../../../components/AppIcon';
import { useDepartments } from '../../../departments/hooks/useDepartments';
import { useCrews } from '../../../crew/hooks/useCrews';
import { Department, CrewMember } from '../../types/crewAssignments';
import { USER_ROLE_OPTIONS, formatRole } from '../../../../constants/userRoles';

interface AssignCrewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (department: Department, crewMember: CrewMember, role?: string) => void;
  excludeDepartmentIds?: string[];
}

export const AssignCrewModal: React.FC<AssignCrewModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  excludeDepartmentIds = []
}) => {
  const { departments, isLoading: isLoadingDepartments } = useDepartments();
  const { crews, isLoading: isLoadingCrews } = useCrews();

  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedCrewMember, setSelectedCrewMember] = useState<CrewMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [role, setRole] = useState('');

  const availableDepartments = departments.filter(dept =>
    !excludeDepartmentIds.includes(dept.department_id)
  );

  // Filter crew members based on search
  const filteredCrews = useMemo(() => {
    if (!searchTerm.trim()) {
      return []; // No results when no search term
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

    return filtered; // Show all matching results
  }, [crews, searchTerm]);

  const handleAssign = useCallback(() => {
    if (selectedDepartment && selectedCrewMember) {
      onAssign(selectedDepartment, selectedCrewMember, role.trim() || undefined);
      handleModalClose();
    }
  }, [selectedDepartment, selectedCrewMember, role, onAssign]);

  const handleModalClose = useCallback(() => {
    setSelectedDepartment(null);
    setSelectedCrewMember(null);
    setSearchTerm('');
    setRole('');
    onClose();
  }, [onClose]);

  // Update role when crew member is selected
  const handleCrewMemberSelect = useCallback((crew: CrewMember) => {
    setSelectedCrewMember(crew);
    // Default to crew member's profile role if they have one
    if (crew.user_role && crew.user_role !== 'other') {
      setRole(crew.user_role);
    } else {
      setRole('');
    }
  }, []);

  const canAssign = selectedDepartment && selectedCrewMember;
  const isLoading = isLoadingDepartments || isLoadingCrews;

  const getDisplayName = (crew: CrewMember) => {
    const firstName = crew.fullname_first || '';
    const lastName = crew.fullname_last || '';
    return `${firstName} ${lastName}`.trim() || crew.email_address || 'Unknown';
  };

  return (
    <BaseModal
      title="Assign Crew to Department"
      isOpen={isOpen}
      onClose={handleModalClose}
      primaryAction={{
        label: "Assign Crew",
        onClick: handleAssign,
        variant: "primary",
        isDisabled: !canAssign || isLoading
      }}
      errorBoundaryContext="AssignCrewModal"
    >
      <VStack spacing={6} align="stretch">
        {/* Department Selection */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2}>Department</Text>
          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<AppIcon name="openmenu" />}
              variant="outline"
              width="100%"
              textAlign="left"
              isDisabled={isLoadingDepartments}
              height="40px"
            >
              <Flex align="center" gap={2}>
                {selectedDepartment ? (
                  <>
                    <Box
                      width="14px"
                      height="14px"
                      borderRadius="50%"
                      bg={selectedDepartment.department_color || 'gray.400'}
                      flexShrink={0}
                    />
                    <Text isTruncated>
                      {selectedDepartment.department_name}
                    </Text>
                  </>
                ) : (
                  <Text color="gray.400">
                    {isLoadingDepartments ? "Loading departments..." : "Select department"}
                  </Text>
                )}
              </Flex>
            </MenuButton>
            <MenuList>
              {availableDepartments.map((department) => (
                <MenuItem
                  key={department.department_id}
                  onClick={() => setSelectedDepartment(department)}
                >
                  <Flex align="center" gap={2}>
                    <Box
                      width="14px"
                      height="14px"
                      borderRadius="50%"
                      bg={department.department_color || 'gray.400'}
                      flexShrink={0}
                    />
                    <Text>{department.department_name}</Text>
                  </Flex>
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </Box>

        {/* Crew Member Selection */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2}>Crew Member</Text>

          {/* Search Input */}
          <Input
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            mb={3}
          />

          {/* Crew Results */}
          {searchTerm.trim() && (
            <Box
              border="1px solid"
              borderColor="ui.border"
              borderRadius="md"
              minHeight="180px"
              maxHeight="240px"
              overflowY="auto"
              bg="card.background"
            >
              {isLoadingCrews ? (
                <Flex justify="center" align="center" height="180px">
                  <Spinner size="sm" />
                </Flex>
              ) : filteredCrews.length === 0 ? (
                <Flex justify="center" align="center" height="180px">
                  <Text color="gray.500" textAlign="center" fontSize="sm">
                    No crew members match your search.
                  </Text>
                </Flex>
              ) : (
                <VStack spacing={0} align="stretch">
                  {filteredCrews.map((crew) => (
                    <Button
                      key={crew.user_id}
                      variant="ghost"
                      justifyContent="flex-start"
                      height="auto"
                      py={3}
                      px={4}
                      borderRadius="md"
                      bg={selectedCrewMember?.user_id === crew.user_id ? "row.hover" : "transparent"}
                      onClick={() => handleCrewMemberSelect(crew)}
                      _hover={{ bg: "row.hover" }}
                    >
                      <HStack spacing={3} width="100%">
                        <Avatar
                          size="sm"
                          name={getDisplayName(crew)}
                          src={crew.profile_img_url}
                        />
                        <VStack spacing={0} align="flex-start" flex={1}>
                          <Text fontSize="sm" fontWeight="medium" textAlign="left" width="100%">
                            {getDisplayName(crew)}
                          </Text>
                          {crew.email_address && (
                            <Text fontSize="xs" color="gray.500" textAlign="left" width="100%">
                              {crew.email_address}
                            </Text>
                          )}
                        </VStack>
                        {crew.user_role && (
                          <Badge colorScheme="blue" variant="outline" size="sm">
                            {formatRole(crew.user_role)}
                          </Badge>
                        )}
                      </HStack>
                    </Button>
                  ))}
                </VStack>
              )}
            </Box>
          )}

          {!searchTerm.trim() && (
            <Text fontSize="sm" color="gray.500" textAlign="center" py={8}>
              Start typing to search through all {crews.length} crew members...
            </Text>
          )}
        </Box>

        {/* Role Selection */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2}>Role</Text>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Select role..."
          >
            {USER_ROLE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Box>
      </VStack>
    </BaseModal >
  );
};