import React from 'react';
import { CreateShowModal } from "../../features/shows/components/modals/CreateShowModal";
import { CreateScriptModal } from "../../features/shows/components/modals/CreateScriptModal";
import { CreateVenueModal } from "../../features/venues/components/modals/CreateVenueModal";
import { CreateDepartmentModal } from "../../features/departments/components/modals/CreateDepartmentModal";
import { CreateCrewModal } from "../../features/crew/components/modals/CreateCrewModal";
import { MODAL_TYPES } from '../../hooks/useModalManager';

interface ModalRendererProps {
  activeModal: string | null;
  isOpen: boolean;
  modalData: any;
  onClose: () => void;
  onDataRefresh: () => void;
}

export const ModalRenderer: React.FC<ModalRendererProps> = React.memo(({
  activeModal,
  isOpen,
  modalData,
  onClose,
  onDataRefresh,
}) => {
  switch (activeModal) {
    case MODAL_TYPES.createShow:
      return (
        <CreateShowModal
          isOpen={isOpen}
          onClose={onClose}
          onShowCreated={onDataRefresh}
        />
      );
    case MODAL_TYPES.createScript:
      return (
        <CreateScriptModal
          isOpen={isOpen}
          onClose={onClose}
          showId={modalData.showId}
          onScriptCreated={onDataRefresh}
        />
      );
    case MODAL_TYPES.createVenue:
      return (
        <CreateVenueModal
          isOpen={isOpen}
          onClose={onClose}
          onVenueCreated={onDataRefresh}
        />
      );
    case MODAL_TYPES.createDepartment:
      return (
        <CreateDepartmentModal
          isOpen={isOpen}
          onClose={onClose}
          onDepartmentCreated={onDataRefresh}
        />
      );
    case MODAL_TYPES.createCrew:
      return (
        <CreateCrewModal
          isOpen={isOpen}
          onClose={onClose}
          onCrewCreated={onDataRefresh}
        />
      );
    default:
      return null;
  }
});