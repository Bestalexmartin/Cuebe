// frontend/src/hooks/useModalManager.ts

import { useDisclosure } from '@chakra-ui/react';
import { useState, useMemo } from 'react';

// Modal type constants
export const MODAL_TYPES = {
    createShow: 'createShow',
    createScript: 'createScript',
    createVenue: 'createVenue',
    createDepartment: 'createDepartment',
    createCrew: 'createCrew',
} as const;

// TypeScript interfaces
type ModalType = typeof MODAL_TYPES[keyof typeof MODAL_TYPES] | null;

interface ModalData {
    [key: string]: any;
}

interface UseModalManagerReturn {
    activeModal: ModalType;
    modalData: ModalData;
    isOpen: boolean;
    openModal: (modalType: typeof MODAL_TYPES[keyof typeof MODAL_TYPES], data?: ModalData) => void;
    closeModal: () => void;
}

export const useModalManager = (): UseModalManagerReturn => {
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [modalData, setModalData] = useState<ModalData>({});
    const { isOpen, onOpen, onClose } = useDisclosure();

    const openModal = (modalType: typeof MODAL_TYPES[keyof typeof MODAL_TYPES], data: ModalData = {}) => {
        setActiveModal(modalType);
        setModalData(data);
        onOpen();
    };

    const closeModal = () => {
        setActiveModal(null);
        setModalData({});
        onClose();
    };

    return useMemo(() => ({
        activeModal,
        modalData,
        isOpen,
        openModal,
        closeModal,
    }), [activeModal, modalData, isOpen, openModal, closeModal]);
};