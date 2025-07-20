// frontend/src/hooks/useModalManager.js

import { useDisclosure } from '@chakra-ui/react';
import { useState } from 'react';

export const useModalManager = () => {
    const [activeModal, setActiveModal] = useState(null);
    const [modalData, setModalData] = useState({});
    const { isOpen, onOpen, onClose } = useDisclosure();

    const openModal = (modalType, data = {}) => {
        setActiveModal(modalType);
        setModalData(data);
        onOpen();
    };

    const closeModal = () => {
        setActiveModal(null);
        setModalData({});
        onClose();
    };

    return {
        activeModal,
        modalData,
        isOpen,
        openModal,
        closeModal,
    };
};

// Modal type constants
export const MODAL_TYPES = {
    CREATE_SHOW: 'CREATE_SHOW',
    CREATE_SCRIPT: 'CREATE_SCRIPT',
    CREATE_VENUE: 'CREATE_VENUE',
    CREATE_DEPARTMENT: 'CREATE_DEPARTMENT',
};