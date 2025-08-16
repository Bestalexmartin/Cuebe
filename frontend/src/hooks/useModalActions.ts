import { useCallback } from 'react';
import { MODAL_TYPES } from './useModalManager';

interface UseModalActionsProps {
  openModal: (modalType: typeof MODAL_TYPES[keyof typeof MODAL_TYPES], data?: any) => void;
  refetchShows: () => void;
  setRefreshKey: (updater: (prev: number) => number) => void;
}

export const useModalActions = ({ openModal, refetchShows, setRefreshKey }: UseModalActionsProps) => {
  // Data refresh handler
  const handleDataRefresh = useCallback(() => {
    refetchShows();
    setRefreshKey(prev => prev + 1); // Force re-mount of view components
  }, [refetchShows, setRefreshKey]);

  // Modal creation handlers
  const handleCreateShow = useCallback(() => {
    openModal(MODAL_TYPES.createShow);
  }, [openModal]);

  const handleCreateScript = useCallback((showId: string) => {
    openModal(MODAL_TYPES.createScript, { showId });
  }, [openModal]);

  const handleCreateVenue = useCallback(() => {
    openModal(MODAL_TYPES.createVenue);
  }, [openModal]);

  const handleCreateDepartment = useCallback(() => {
    openModal(MODAL_TYPES.createDepartment);
  }, [openModal]);

  const handleCreateCrew = useCallback(() => {
    openModal(MODAL_TYPES.createCrew);
  }, [openModal]);

  return {
    handleDataRefresh,
    handleCreateShow,
    handleCreateScript,
    handleCreateVenue,
    handleCreateDepartment,
    handleCreateCrew,
  };
};