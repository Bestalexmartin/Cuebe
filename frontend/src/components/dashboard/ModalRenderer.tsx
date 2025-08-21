import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateShowModal } from "../../features/shows/components/modals/CreateShowModal";
import { CreateScriptModal } from "../../features/shows/components/modals/CreateScriptModal";
import { ScriptImportModal } from "../../features/script/import/components/ScriptImportModal";
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
  openModal: (modalType: typeof MODAL_TYPES[keyof typeof MODAL_TYPES], data?: any) => void;
}

export const ModalRenderer: React.FC<ModalRendererProps> = React.memo(({
  activeModal,
  isOpen,
  modalData,
  onClose,
  onDataRefresh,
  openModal,
}) => {
  const navigate = useNavigate();
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
          onImportRequest={(scriptName) => openModal(MODAL_TYPES.importScript, { showId: modalData.showId, scriptName })}
        />
      );
    case MODAL_TYPES.importScript:
      return (
        <ScriptImportModal
          isOpen={isOpen}
          onClose={onClose}
          showId={modalData.showId}
          initialScriptName={modalData.scriptName}
          onImportSuccess={(scriptId) => {
            onDataRefresh();
            onClose();
            navigate(`/scripts/${scriptId}/manage`);
          }}
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