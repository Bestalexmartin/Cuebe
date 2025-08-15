// frontend/src/features/shows/components/modals/EditRoleModal.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  VStack,
  Select,
  FormControl,
  FormLabel
} from '@chakra-ui/react';
import { BaseModal } from '../../../../components/base/BaseModal';
import { CrewAssignmentRow } from '../../types/crewAssignments';
import { USER_ROLE_OPTIONS } from '../../../../constants/userRoles';

interface EditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (newRole: string) => void;
  assignment: CrewAssignmentRow | null;
}

export const EditRoleModal: React.FC<EditRoleModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  assignment
}) => {
  const [role, setRole] = useState('');

  // Set initial role when assignment changes
  useEffect(() => {
    if (assignment) {
      setRole(assignment.role || '');
    }
  }, [assignment]);

  const handleUpdate = useCallback(() => {
    onUpdate(role);
  }, [role, onUpdate]);

  const handleModalClose = useCallback(() => {
    setRole('');
    onClose();
  }, [onClose]);

  const canUpdate = role.trim().length > 0 && role !== assignment?.role;

  if (!assignment) return null;

  return (
    <BaseModal
      title="Edit Role"
      isOpen={isOpen}
      onClose={handleModalClose}
      customActions={[
        {
          label: "Cancel",
          variant: "outline",
          onClick: handleModalClose
        },
        {
          label: "Update Role",
          variant: "primary",
          onClick: handleUpdate,
          isDisabled: !canUpdate
        }
      ]}
    >
      <VStack spacing={4} align="stretch">
        <FormControl isRequired>
          <FormLabel>Role</FormLabel>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Select role"
          >
            {USER_ROLE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormControl>
      </VStack>
    </BaseModal>
  );
};