// frontend/src/features/shows/components/CrewAssignmentSection.tsx

import React, { useState, useCallback, useEffect } from 'react';
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
import { EditRoleModal } from './modals/EditRoleModal';
import { DeleteConfirmationModal } from '../../../components/modals/DeleteConfirmationModal';
import { ActionsMenu, ActionItem } from '../../../components/ActionsMenu';
import { useEnhancedToast } from '../../../utils/toastUtils';
import { formatRole, formatRoleBadge, getShareUrlSuffix } from '../../../constants/userRoles';
import { useAuth } from '@clerk/clerk-react';

interface CrewAssignmentSectionProps {
  showId: string;
  assignments: CrewAssignmentRow[];
  onAssignmentsChange: (assignments: CrewAssignmentRow[]) => void;
}

export const CrewAssignmentSection: React.FC<CrewAssignmentSectionProps> = ({
  showId,
  assignments,
  onAssignmentsChange
}) => {
  const { showSuccess, showError } = useEnhancedToast();
  const { getToken } = useAuth();
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(new Set());
  const [shareTokens, setShareTokens] = useState<Map<string, string>>(new Map()); // user_id -> share_token
  const [recentlyRefreshedTokens, setRecentlyRefreshedTokens] = useState<Set<string>>(new Set()); // user_ids that were recently refreshed

  // Modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCrewBioModalOpen, setIsCrewBioModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [selectedCrewMember, setSelectedCrewMember] = useState<CrewMember | null>(null);
  const [selectedAssignmentForEdit, setSelectedAssignmentForEdit] = useState<CrewAssignmentRow | null>(null);

  // Fetch departments and crew
  const { departments, isLoading: isLoadingDepartments } = useDepartments();
  const { crews, isLoading: isLoadingCrews } = useCrews();

  const isLoading = isLoadingDepartments || isLoadingCrews;
  
  // Fetch share tokens for saved crew assignments only (not new/unsaved ones)
  useEffect(() => {
    const fetchShareTokens = async () => {
      // Only fetch for saved assignments (not ones with isNew flag)
      const savedAssignments = assignments.filter(a => !a.isNew);
      
      if (!savedAssignments.length || !crews.length) {
        return;
      }
      
      try {
        const token = await getToken();
        if (!token) {
          return;
        }
        
        const tokenMap = new Map<string, string>();
        
        // Fetch share tokens for each unique crew member in saved assignments only
        const uniqueUserIds = [...new Set(savedAssignments.flatMap(a => a.crew_member_ids))];
        
        
        await Promise.all(
          uniqueUserIds.map(async (userId) => {
            try {
              const response = await fetch(`/api/shows/${showId}/crew/${userId}/share`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              
              if (response.ok) {
                const shareData = await response.json();
                tokenMap.set(userId, shareData.share_token);
              } else {
                console.warn(`❌ Failed to get share token for user ${userId}: ${response.status} ${response.statusText}`);
              }
            } catch (error) {
              console.error(`💥 Error fetching share token for user ${userId}:`, error);
            }
          })
        );
        
        // Merge with existing tokens, but respect recently refreshed ones
        setShareTokens(prev => {
          const mergedMap = new Map(prev);
          tokenMap.forEach((token, userId) => {
            // Only update if this token wasn't recently manually refreshed
            if (!recentlyRefreshedTokens.has(userId)) {
              mergedMap.set(userId, token);
            }
          });
          return mergedMap;
        });
      } catch (error) {
        console.error('💥 Error in fetchShareTokens:', error);
      }
    };
    
    fetchShareTokens();
  }, [assignments, crews, showId, getToken, recentlyRefreshedTokens]);


  // Handle crew assignment from modal - call API immediately
  const handleCrewAssignment = useCallback(async (department: Department, crewMember: CrewMember, role?: string) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch(`/api/shows/${showId}/crew-assignments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: crewMember.user_id,
          department_id: department.department_id,
          show_role: role || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create assignment: ${response.status}`);
      }

      const newAssignment = await response.json();
      
      // Create a local assignment object for immediate UI update
      const localAssignment: CrewAssignmentRow = {
        id: newAssignment.assignment_id,
        department_id: newAssignment.department_id,
        crew_member_ids: [newAssignment.user_id],
        role: newAssignment.show_role || '',
        isNew: false  // This is now saved
      };

      // Update local state
      onAssignmentsChange([...assignments, localAssignment]);
      
      // Immediately fetch share token for the new assignment
      try {
        const shareResponse = await fetch(`/api/shows/${showId}/crew/${crewMember.user_id}/share`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (shareResponse.ok) {
          const shareData = await shareResponse.json();
          setShareTokens(prev => new Map(prev).set(crewMember.user_id, shareData.share_token));
        }
      } catch (shareError) {
        console.warn('Failed to generate share token for new assignment:', shareError);
        // Don't fail the whole operation for share token issues
      }

      showSuccess(
        "Crew Assigned",
        `${crewMember.fullname_first} ${crewMember.fullname_last} assigned to ${department.department_name}`
      );
      
    } catch (error) {
      console.error('Failed to create crew assignment:', error);
      showError(`Failed to assign crew member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [assignments, onAssignmentsChange, showId, getToken, showSuccess, showError, setShareTokens]);

  // Handle row selection (single select only)
  const handleRowSelect = useCallback((id: string) => {
    // Single select - deselect if already selected, otherwise select this one
    if (selectedAssignments.has(id) && selectedAssignments.size === 1) {
      // Already selected and it's the only one - deselect it
      setSelectedAssignments(new Set());
    } else {
      // Select this one (deselects any others)
      setSelectedAssignments(new Set([id]));
    }
    // Note: We don't call onAssignmentsChange here to avoid triggering Save Changes
  }, [selectedAssignments]);

  // Handle delete button click (opens confirmation modal)
  const handleDeleteClick = useCallback(() => {
    if (selectedAssignments.size !== 1) {
      return;
    }
    setIsDeleteModalOpen(true);
  }, [selectedAssignments]);

  // Actually delete selected assignment (after confirmation) - call API immediately
  const handleDeleteConfirm = useCallback(async () => {
    if (selectedAssignments.size !== 1) {
      return;
    }

    const assignmentId = Array.from(selectedAssignments)[0];
    const assignment = assignments.find(a => a.id === assignmentId);
    
    if (!assignment) {
      showError('Assignment not found');
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      
      const response = await fetch(`/api/crew-assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to delete assignment: ${response.status}`);
      }

      
      // Update local state
      const remainingAssignments = assignments.filter(a => a.id !== assignmentId);
      onAssignmentsChange(remainingAssignments);
      
      // Remove share token from local state
      if (assignment.crew_member_ids.length > 0) {
        setShareTokens(prev => {
          const newMap = new Map(prev);
          newMap.delete(assignment.crew_member_ids[0]);
          return newMap;
        });
      }
      
      setSelectedAssignments(new Set());
      setIsDeleteModalOpen(false);

      showSuccess(
        "Assignment Deleted",
        "Crew assignment removed"
      );
      
    } catch (error) {
      console.error('Failed to delete crew assignment:', error);
      showError(`Failed to delete assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsDeleteModalOpen(false);
    }
  }, [selectedAssignments, assignments, onAssignmentsChange, showSuccess, showError, getToken, setShareTokens]);

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

  // Handle Edit Role action
  const handleEditRoleClick = useCallback(() => {
    if (selectedAssignments.size === 1) {
      const assignmentId = Array.from(selectedAssignments)[0];
      const assignment = assignments.find(a => a.id === assignmentId);
      if (assignment) {
        setSelectedAssignmentForEdit(assignment);
        setIsEditRoleModalOpen(true);
      }
    }
  }, [selectedAssignments, assignments]);

  // Handle Refresh Link action
  const handleRefreshLinkClick = useCallback(async () => {
    if (selectedAssignments.size === 1) {
      const assignmentId = Array.from(selectedAssignments)[0];
      const assignment = assignments.find(a => a.id === assignmentId);
      
      if (assignment) {
        try {
          const token = await getToken();
          if (!token) {
            throw new Error('Authentication token not available');
          }

          // Get crew member details to find user_id
          const crewMember = crews.find(c => c.user_id === assignment.crew_member_ids[0]);
          if (!crewMember) {
            throw new Error('Crew member not found');
          }

          // Refresh the show-level share (generates new token)
          const refreshUrl = `/api/shows/${showId}/crew/${crewMember.user_id}/share?force_refresh=true`;
          console.log('🔄 Making refresh request to:', refreshUrl);
          
          const response = await fetch(refreshUrl, {
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
          console.log('✅ Received share data from server:', shareData);
          
          // Mark this user as recently refreshed to prevent the useEffect from overriding
          setRecentlyRefreshedTokens(prev => new Set(prev).add(crewMember.user_id));
          
          // Update the local share token
          setShareTokens(prev => {
            const newMap = new Map(prev);
            newMap.set(crewMember.user_id, shareData.share_token);
            return newMap;
          });
          
          // Clear the "recently refreshed" flag after 5 seconds to allow future useEffect updates
          setTimeout(() => {
            setRecentlyRefreshedTokens(prev => {
              const newSet = new Set(prev);
              newSet.delete(crewMember.user_id);
              return newSet;
            });
          }, 5000);
          
          showSuccess(
            "Link Refreshed", 
            `A new sharing link has been ${shareData.action} for this crew member`
          );
        } catch (error) {
          console.error('Error refreshing link:', error);
          showError("Failed to refresh sharing link. Please try again.");
        }
      }
    }
  }, [selectedAssignments, assignments, crews, showId, getToken, showSuccess, showError]);

  // Handle Edit Role modal close
  const handleEditRoleModalClose = useCallback(() => {
    setIsEditRoleModalOpen(false);
    setSelectedAssignmentForEdit(null);
  }, []);

  // Handle role update from Edit Role modal - call API immediately
  const handleRoleUpdate = useCallback(async (newRole: string) => {
    if (!selectedAssignmentForEdit) {
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      
      const response = await fetch(`/api/crew-assignments/${selectedAssignmentForEdit.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          show_role: newRole
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to update role: ${response.status}`);
      }

      const updatedAssignment = await response.json();
      
      // Update local state
      const updatedAssignments = assignments.map(assignment =>
        assignment.id === selectedAssignmentForEdit.id
          ? { ...assignment, role: updatedAssignment.show_role || '' }
          : assignment
      );
      onAssignmentsChange(updatedAssignments);
      
      showSuccess("Role Updated", `Role has been updated to ${formatRole(newRole)}`);
      setIsEditRoleModalOpen(false);
      setSelectedAssignmentForEdit(null);
      
    } catch (error) {
      console.error('Failed to update role:', error);
      showError(`Failed to update role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [selectedAssignmentForEdit, assignments, onAssignmentsChange, showSuccess, showError, getToken]);

  const hasExactlyOneSelection = selectedAssignments.size === 1;

  // Create actions array for the Actions menu
  const actionItems: ActionItem[] = [
    {
      id: 'edit-role',
      label: 'Edit Role',
      onClick: handleEditRoleClick,
      isDisabled: !hasExactlyOneSelection
    },
    {
      id: 'refresh-link',
      label: 'Refresh Link',
      onClick: handleRefreshLinkClick,
      isDisabled: !hasExactlyOneSelection
    },
    {
      id: 'delete',
      label: 'Delete',
      onClick: handleDeleteClick,
      isDestructive: true,
      isDisabled: !hasExactlyOneSelection
    }
  ];

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
          <ActionsMenu actions={actionItems} isDisabled={assignments.length === 0} />
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
                  borderColor={selectedAssignments.has(assignment.id) ? "blue.400" : "transparent"}
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
                    overflow="hidden"
                    minWidth={0}
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
                      flex={1}
                      isTruncated
                    >
                      {department?.department_name || 'Unknown Dept'}
                    </Text>

                    {/* Crew Profile Icon + Name - clickable for bio */}
                    <Box flex={1} display="flex" alignItems="center" gap={2}>
                      <Avatar
                        size="sm"
                        name={crewName}
                        src={crewMember?.profile_img_url}
                        cursor="pointer"
                        _hover={{ 
                          transform: "scale(1.05)",
                          transition: "transform 0.2s"
                        }}
                        flexShrink={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (crewMember) {
                            handleCrewBioClick(crewMember);
                          }
                        }}
                      />
                      <Text
                        fontSize="sm"
                        fontWeight="medium"
                        cursor="pointer"
                        color="blue.500"
                        _dark={{ color: "blue.300" }}
                        _hover={{ textDecoration: "underline" }}
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
                    </Box>

                    {/* Email Address - Hide on small screens (md+ only) */}
                    <Text 
                      fontSize="sm" 
                      color="gray.700" 
                      _dark={{ color: "gray.300" }} 
                      display={{ base: "none", md: "block" }}
                      flex={1}
                      isTruncated
                    >
                      {crewMember?.email_address || ''}
                    </Text>

                    {/* Phone Number - Hide on medium screens (lg+ only) */}
                    <Text 
                      fontSize="sm" 
                      color="gray.700" 
                      _dark={{ color: "gray.300" }} 
                      display={{ base: "none", lg: "block" }}
                      flex={1}
                      isTruncated
                    >
                      {crewMember?.phone_number || ''}
                    </Text>

                    {/* URL Suffix - Last 12 characters of share URL with LinkID prefix */}
                    {crewMember && (
                      <Text 
                        fontSize="sm" 
                        color="gray.700" 
                        _dark={{ color: "gray.300" }} 
                        display={{ base: "none", lg: "block" }}
                        flex={1}
                        isTruncated
                        fontFamily="monospace"
                      >
                        {getShareUrlSuffix(shareTokens.get(crewMember.user_id))}
                      </Text>
                    )}

                    {/* Role Badge - Aligned to right edge */}
                    <Box 
                      minWidth={{ base: "80px", md: "100px", lg: "120px" }} 
                      maxWidth={{ base: "120px", md: "140px", lg: "160px" }}
                      display="flex" 
                      justifyContent="flex-end"
                      flexShrink={0}
                    >
                      {assignment.role && (
                        <Badge 
                          colorScheme="blue" 
                          variant="outline" 
                          size={{ base: "sm", md: "md" }}
                          maxWidth="100%"
                          isTruncated
                        >
                          {formatRoleBadge(assignment.role)}
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
                          {formatRoleBadge(assignment.role)}
                        </Badge>
                      )}
                    </HStack>

                    {/* Second Line: Department Name, Email, Phone, URL Suffix */}
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
                        {crewMember && (
                          <Text 
                            fontSize="xs" 
                            color="gray.600" 
                            _dark={{ color: "gray.300" }} 
                            fontFamily="monospace"
                              >
                            {getShareUrlSuffix(shareTokens.get(crewMember.user_id))}
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
        showId={showId}
      />

      {/* Edit Role Modal */}
      <EditRoleModal
        isOpen={isEditRoleModalOpen}
        onClose={handleEditRoleModalClose}
        onUpdate={handleRoleUpdate}
        assignment={selectedAssignmentForEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        entityType="Assignment"
        entityName="crew assignment"
        customQuestion="Are you sure you want to remove this crew assignment?"
        customWarning="The crew member will be unassigned from this department and their access to scripts for this show will be revoked."
        actionWord="Delete"
      />
    </Box>
  );
};