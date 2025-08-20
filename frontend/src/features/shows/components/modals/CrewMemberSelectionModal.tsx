// frontend/src/features/shows/components/modals/CrewMemberSelectionModal.tsx

import React from 'react';
import { SelectionModal, SelectionItem } from '../../../../components/base/SelectionModal';
import { useCrews } from '../../../crew/hooks/useCrews';
import { CrewMember } from '../../types/crewAssignments';
import { formatRole } from '../../../../constants/userRoles';

interface CrewMemberSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (crewMember: CrewMember) => void;
}

interface CrewSelectionItem extends SelectionItem {
  originalCrew: CrewMember;
}

export const CrewMemberSelectionModal: React.FC<CrewMemberSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  const { crews, isLoading } = useCrews();

  const getDisplayName = (crew: CrewMember) => {
    const firstName = crew.fullname_first || '';
    const lastName = crew.fullname_last || '';
    return `${firstName} ${lastName}`.trim() || crew.email_address || 'Unknown';
  };

  // Transform crews to SelectionItem format
  const selectionItems: CrewSelectionItem[] = crews.map(crew => ({
    id: crew.user_id,
    primaryText: getDisplayName(crew),
    secondaryText: crew.email_address || undefined,
    badge: crew.user_role ? formatRole(crew.user_role) : undefined,
    badgeColor: 'blue',
    originalCrew: crew
  }));

  const handleCrewSelect = (item: CrewSelectionItem) => {
    onSelect(item.originalCrew);
  };

  return (
    <SelectionModal
      title="Select Crew Member"
      isOpen={isOpen}
      onClose={onClose}
      onSelect={handleCrewSelect}
      items={selectionItems}
      isLoading={isLoading}
      emptyMessage="No crew members available."
      searchable={true}
      searchPlaceholder="Search by name, email, or role..."
      maxItems={5}
    />
  );
};