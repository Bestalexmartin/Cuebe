// frontend/src/hooks/useModalState.ts

import { useState, useCallback, useMemo } from 'react';

export interface ModalStateReturn {
    // State getters
    isOpen: (modalName: string) => boolean;
    
    // Actions
    openModal: (modalName: string) => void;
    closeModal: (modalName: string) => void;
    closeAllModals: () => void;
    
    // Batch operations
    openModalWithData: <T>(modalName: string, data: T) => void;
    getModalData: <T>(modalName: string) => T | null;
    
    // Utility
    hasOpenModals: boolean;
    openModalNames: string[];
}

interface ModalState {
    [modalName: string]: {
        isOpen: boolean;
        data?: any;
    };
}

/**
 * Custom hook for managing multiple modal states efficiently
 * 
 * @param modalNames Array of modal names to initialize
 * @returns Object with modal state management functions
 */
export const useModalState = (modalNames: string[]): ModalStateReturn => {
    // Initialize all modals as closed
    const initialState = useMemo(
        () => modalNames.reduce<ModalState>((acc, name) => {
            acc[name] = { isOpen: false, data: null };
            return acc;
        }, {}),
        [modalNames]
    );
    
    const [modalState, setModalState] = useState<ModalState>(initialState);
    
    // Check if a specific modal is open
    const isOpen = useCallback((modalName: string): boolean => {
        return modalState[modalName]?.isOpen ?? false;
    }, [modalState]);
    
    // Open a specific modal
    const openModal = useCallback((modalName: string) => {
        setModalState(prev => ({
            ...prev,
            [modalName]: {
                ...prev[modalName],
                isOpen: true
            }
        }));
    }, []);
    
    // Close a specific modal
    const closeModal = useCallback((modalName: string) => {
        setModalState(prev => ({
            ...prev,
            [modalName]: {
                ...prev[modalName],
                isOpen: false,
                data: null // Clear data when closing
            }
        }));
    }, []);
    
    // Close all modals
    const closeAllModals = useCallback(() => {
        setModalState(prev => {
            const newState = { ...prev };
            Object.keys(newState).forEach(modalName => {
                newState[modalName] = {
                    isOpen: false,
                    data: null
                };
            });
            return newState;
        });
    }, []);
    
    // Open modal with associated data
    const openModalWithData = useCallback(<T,>(modalName: string, data: T) => {
        setModalState(prev => ({
            ...prev,
            [modalName]: {
                isOpen: true,
                data
            }
        }));
    }, []);
    
    // Get data associated with a modal
    const getModalData = useCallback(<T,>(modalName: string): T | null => {
        return modalState[modalName]?.data ?? null;
    }, [modalState]);
    
    // Computed properties
    const hasOpenModals = useMemo(() => {
        return Object.values(modalState).some(modal => modal.isOpen);
    }, [modalState]);
    
    const openModalNames = useMemo(() => {
        return Object.entries(modalState)
            .filter(([, modal]) => modal.isOpen)
            .map(([name]) => name);
    }, [modalState]);
    
    return useMemo(() => ({
        isOpen,
        openModal,
        closeModal,
        closeAllModals,
        openModalWithData,
        getModalData,
        hasOpenModals,
        openModalNames
    }), [
        isOpen,
        openModal,
        closeModal,
        closeAllModals,
        openModalWithData,
        getModalData,
        hasOpenModals,
        openModalNames
    ]);
};

// Convenience type for common modal operations
export type ModalActions = Pick<ModalStateReturn, 'openModal' | 'closeModal' | 'isOpen'>;

// Helper function to create modal names enum for type safety
export const createModalNames = <T extends readonly string[]>(names: T) => {
    return names.reduce((acc, name) => {
        acc[name.toUpperCase().replace(/-/g, '_')] = name;
        return acc;
    }, {} as Record<string, string>);
};