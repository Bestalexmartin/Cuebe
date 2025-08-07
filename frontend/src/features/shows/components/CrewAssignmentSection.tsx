// frontend/src/features/shows/components/CrewAssignmentSection.tsx

import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Spinner,
  Flex,
  FormLabel,
  Avatar,
  Badge
} from '@chakra-ui/react';
import { useDepartments } from '../../departments/hooks/useDepartments';
import { useCrews } from '../../crew/hooks/useCrews';
import { CrewAssignmentRow, Department, CrewMember } from '../types/crewAssignments';
import { AssignCrewModal } from './modals/AssignCrewModal';
import { CrewBioModal } from './modals/CrewBioModal';
import { DeleteConfirmationModal } from '../../../components/modals/DeleteConfirmationModal';
import { useEnhancedToast } from '../../../utils/toastUtils';
import { formatRole } from '../../../constants/userRoles';

interface CrewAssignmentSectionProps {
  showId: string;
  assignments: CrewAssignmentRow[];
  onAssignmentsChange: (assignments: CrewAssignmentRow[]) => void;
}

export const CrewAssignmentSection: React.FC<CrewAssignmentSectionProps> = ({
  assignments,
  onAssignmentsChange
}) => {
  const { showSuccess } = useEnhancedToast();
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(new Set());

  // Modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCrewBioModalOpen, setIsCrewBioModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCrewMember, setSelectedCrewMember] = useState<CrewMember | null>(null);

  // Fetch departments and crew
  const { departments, isLoading: isLoadingDepartments } = useDepartments();
  const { crews, isLoading: isLoadingCrews } = useCrews();

  const isLoading = isLoadingDepartments || isLoadingCrews;

  // Generate unique ID for new assignments
  const generateId = useCallback(() => {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Handle crew assignment from modal
  const handleCrewAssignment = useCallback((department: Department, crewMember: CrewMember, role?: string) => {
    const newAssignment: CrewAssignmentRow = {
      id: generateId(),
      department_id: department.department_id,
      crew_member_ids: [crewMember.user_id],
      role: role || '',
      isNew: true,
      isSelected: false
    };

    onAssignmentsChange([...assignments, newAssignment]);

    showSuccess(
      "Crew Assigned",
      `${crewMember.fullname_first} ${crewMember.fullname_last} assigned to ${department.department_name}`
    );
  }, [assignments, onAssignmentsChange, generateId, showSuccess]);

  // Handle row selection (single select only)
  const handleRowSelect = useCallback((id: string) => {
    const newSelected = new Set<string>();

    // Single select - deselect if already selected, otherwise select this one
    if (selectedAssignments.has(id) && selectedAssignments.size === 1) {
      // Already selected and it's the only one - deselect it
      newSelected.clear();
    } else {
      // Select this one (deselects any others)
      newSelected.add(id);
    }

    setSelectedAssignments(newSelected);

    // Update assignment selection state for styling
    const updatedAssignments = assignments.map(assignment => ({
      ...assignment,
      isSelected: newSelected.has(assignment.id)
    }));
    onAssignmentsChange(updatedAssignments);
  }, [selectedAssignments, assignments, onAssignmentsChange]);

  // Handle delete button click (opens confirmation modal)
  const handleDeleteClick = useCallback(() => {
    if (selectedAssignments.size === 0) {
      return;
    }
    setIsDeleteModalOpen(true);
  }, [selectedAssignments]);

  // Actually delete selected assignments (after confirmation)
  const handleDeleteConfirm = useCallback(() => {
    if (selectedAssignments.size === 0) {
      return;
    }

    const remainingAssignments = assignments.filter(assignment =>
      !selectedAssignments.has(assignment.id)
    );

    onAssignmentsChange(remainingAssignments);
    setSelectedAssignments(new Set());
    setIsDeleteModalOpen(false);

    showSuccess(
      "Assignment Deleted",
      "Crew assignment removed"
    );
  }, [selectedAssignments, assignments, onAssignmentsChange, showSuccess]);

  // Handle delete modal close
  const handleDeleteCancel = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  // Handle opening crew bio modal
  const handleCrewBioClick = useCallback((crewMember: CrewMember) => {
    setSelectedCrewMember(crewMember);
    setIsCrewBioModalOpen(true);
  }, []);

  const handleCrewBioModalClose = useCallback(() => {
    setIsCrewBioModalOpen(false);
    setSelectedCrewMember(null);
  }, []);

  const hasSelectedAssignments = selectedAssignments.size > 0;

  if (isLoading) {
    return (
      <Box>
        <HStack justify="space-between" mb={4}>
          <Text fontSize="lg" fontWeight="semibold">Departments & Crew</Text>
        </HStack>
        <Flex justify="center" align="center" height="100px">
          <Spinner />
        </Flex>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header and buttons above divider */}
      <HStack justify="space-between" mb={2}>
        <FormLabel mb={0}>Departments & Crew</FormLabel>
        <HStack spacing={2}>
          <Button
            size="xs"
            variant="outline"
            onClick={handleDeleteClick}
            isDisabled={!hasSelectedAssignments}
          >
            Delete
          </Button>
          <Button
            size="xs"
            bg="blue.400"
            color="white"
            _hover={{ bg: "orange.400" }}
            onClick={() => setIsAssignModalOpen(true)}
          >
            Assign Crew
          </Button>
        </HStack>
      </HStack>

      {/* Divider line */}
      <Box borderTop="1px solid" borderColor="gray.500" pt={4} mt={2}>
        {assignments.length === 0 ? (
          <Text color="gray.500" textAlign="center" py={8}>
            No crew assignments yet. Click "Assign Crew" to assign crew to departments.
          </Text>
        ) : (
          <VStack spacing={1} align="stretch">
            {assignments.map((assignment) => {
              const department = departments.find(d => d.department_id === assignment.department_id);
              const crewMember = crews.find(c => c.user_id === assignment.crew_member_ids[0]);
              const crewName = crewMember ? `${crewMember.fullname_first} ${crewMember.fullname_last}`.trim() : 'Unknown';

              return (
                <Box
                  key={assignment.id}
                  py={2}
                  px={4}
                  border="2px solid"
                  borderColor={assignment.isSelected ? "blue.400" : "transparent"}
                  borderRadius="md"
                  bg="card.background"
                  _hover={{
                    borderColor: "orange.400"
                  }}
                  cursor="pointer"
                  onClick={() => handleRowSelect(assignment.id)}
                  transition="all 0s"
                >
                  {/* Desktop/Tablet Layout - Single Line */}
                  <HStack 
                    spacing={{ base: 1, sm: 2, md: 3 }} 
                    align="center"
                    display={{ base: "none", md: "flex" }}
                  >
                    {/* Department Color Chip */}
                    <Box
                      w="32px"
                      h="32px"
                      borderRadius="full"
                      bg={department?.department_color || 'gray.400'}
                      flexShrink={0}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {department?.department_initials && (
                        <Text
                          fontSize="xs"
                          fontWeight="bold"
                          color="black"
                          userSelect="none"
                        >
                          {department.department_initials}
                        </Text>
                      )}
                    </Box>

                    {/* Department Name */}
                    <Text 
                      fontSize="sm" 
                      fontWeight="medium" 
                      minWidth={{ md: "90px", lg: "120px" }}
                      maxWidth={{ md: "90px", lg: "120px" }}
                      isTruncated
                    >
                      {department?.department_name || 'Unknown Dept'}
                    </Text>

                    {/* Crew Profile Icon - clickable for bio */}
                    <Avatar
                      size="sm"
                      name={crewName}
                      src={crewMember?.profile_img_url}
                      cursor="pointer"
                      _hover={{ 
                        transform: "scale(1.05)",
                        transition: "transform 0.2s"
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (crewMember) {
                          handleCrewBioClick(crewMember);
                        }
                      }}
                    />

                    {/* Crew Name - clickable for bio */}
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      cursor="pointer"
                      color="blue.500"
                      _dark={{ color: "blue.300" }}
                      _hover={{ textDecoration: "underline" }}
                      minWidth={{ md: "120px", lg: "160px" }}
                      maxWidth={{ md: "120px", lg: "160px" }}
                      isTruncated
                      onClick={(e) => {
                        e.stopPropagation();
                        if (crewMember) {
                          handleCrewBioClick(crewMember);
                        }
                      }}
                    >
                      {crewName}
                    </Text>

                    {/* Email Address */}
                    <Text 
                      fontSize="sm" 
                      color="gray.700" 
                      _dark={{ color: "gray.300" }} 
                      minWidth={{ md: "140px", lg: "180px" }}
                      maxWidth={{ md: "140px", lg: "180px" }}
                      isTruncated
                    >
                      {crewMember?.email_address || ''}
                    </Text>

                    {/* Phone Number */}
                    <Text 
                      fontSize="sm" 
                      color="gray.700" 
                      _dark={{ color: "gray.300" }} 
                      minWidth={{ md: "110px", lg: "140px" }}
                      maxWidth={{ md: "110px", lg: "140px" }}
                      isTruncated
                    >
                      {crewMember?.phone_number || ''}
                    </Text>

                    {/* Spacer for notes positioning - responsive */}
                    <Box minWidth={{ lg: "20px" }} display={{ base: "none", lg: "block" }} />

                    {/* Notes - only on large screens */}
                    <Text 
                      fontSize="sm" 
                      display={{ base: "none", lg: "block" }}
                      minWidth="220px"
                      maxWidth="220px"
                      isTruncated
                    >
                      {crewMember?.relationship_notes ? (
                        <>
                          <Text as="span" fontWeight="medium">Notes:</Text>
                          <Text as="span" color="gray.700" _dark={{ color: "gray.300" }} ml="5px">
                            {crewMember.relationship_notes}
                          </Text>
                        </>
                      ) : ''}
                    </Text>

                    {/* Spacer to push badge to far right */}
                    <Box flex={1} />

                    {/* Role Badge - centered in fixed column on far right */}
                    <Box 
                      minWidth={{ md: "120px", lg: "160px" }} 
                      display="flex" 
                      justifyContent="center"
                    >
                      {assignment.role && (
                        <Badge colorScheme="blue" variant="outline" size="md">
                          {formatRole(assignment.role)}
                        </Badge>
                      )}
                    </Box>
                  </HStack>

                  {/* Mobile Layout - Two Lines */}
                  <VStack 
                    spacing={2} 
                    align="stretch"
                    display={{ base: "flex", md: "none" }}
                  >
                    {/* First Line: Department, Avatar, Name, Badge */}
                    <HStack spacing={3} align="center">
                      {/* Department Color Chip */}
                      <Box
                        w="32px"
                        h="32px"
                        borderRadius="full"
                        bg={department?.department_color || 'gray.400'}
                        flexShrink={0}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {department?.department_initials && (
                          <Text
                            fontSize="xs"
                            fontWeight="bold"
                            color="black"
                            userSelect="none"
                          >
                            {department.department_initials}
                          </Text>
                        )}
                      </Box>

                      {/* Crew Profile Icon - clickable for bio */}
                      <Avatar
                        size="sm"
                        name={crewName}
                        src={crewMember?.profile_img_url}
                        cursor="pointer"
                        _hover={{ 
                          transform: "scale(1.05)",
                          transition: "transform 0.2s"
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (crewMember) {
                            handleCrewBioClick(crewMember);
                          }
                        }}
                      />

                      {/* Crew Name - clickable for bio */}
                      <Text
                        fontSize="sm"
                        fontWeight="medium"
                        cursor="pointer"
                        color="blue.500"
                        _dark={{ color: "blue.300" }}
                        _hover={{ textDecoration: "underline" }}
                        flex={1}
                        isTruncated
                        onClick={(e) => {
                          e.stopPropagation();
                          if (crewMember) {
                            handleCrewBioClick(crewMember);
                          }
                        }}
                      >
                        {crewName}
                      </Text>

                      {/* Role Badge */}
                      {assignment.role && (
                        <Badge colorScheme="blue" variant="outline" size="sm">
                          {formatRole(assignment.role)}
                        </Badge>
                      )}
                    </HStack>

                    {/* Second Line: Department Name, Email, Phone */}
                    <HStack spacing={3} align="center" ml="68px">
                      <Text fontSize="xs" color="gray.500" _dark={{ color: "gray.400" }} minWidth="80px">
                        {department?.department_name || 'Unknown Dept'}
                      </Text>
                      
                      <VStack spacing={0} align="flex-start" flex={1}>
                        {crewMember?.email_address && (
                          <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.300" }}>
                            {crewMember.email_address}
                          </Text>
                        )}
                        {crewMember?.phone_number && (
                          <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.300" }}>
                            {crewMember.phone_number}
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                  </VStack>
                </Box>
              );
            })}
          </VStack>
        )}
      </Box>

      {/* Assign Crew Modal */}
      <AssignCrewModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={handleCrewAssignment}
        excludeDepartmentIds={assignments
          .filter(a => a.department_id)
          .map(a => a.department_id)
        }
      />

      {/* Crew Bio Modal */}
      <CrewBioModal
        isOpen={isCrewBioModalOpen}
        onClose={handleCrewBioModalClose}
        crewMember={selectedCrewMember}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        entityType="Assignment"
        entityName="assignment"
        customQuestion="Are you sure you want to remove this crew assignment?"
        customWarning="The selected crew member will be unassigned from this department and their access to scripts for this show will be revoked."
        actionWord="Delete"
      />
    </Box>
  );
};