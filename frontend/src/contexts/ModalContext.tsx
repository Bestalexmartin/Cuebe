import React, { createContext, useContext, ReactNode } from 'react';
import { useModalState, ModalStateReturn } from '../hooks/useModalState';

const MODAL_NAMES = {
    DELETE: 'delete',
    FINAL_DELETE: 'final_delete',
    DUPLICATE: 'duplicate',
    PROCESSING: 'processing',
    ADD_ELEMENT: 'add_element',
    EDIT_CUE: 'edit_cue',
    EDIT_GROUP: 'edit_group',
    OPTIONS: 'options',
    FILTER_DEPARTMENTS: 'filter_departments',
    DELETE_CUE: 'delete_cue',
    DUPLICATE_ELEMENT: 'duplicate_element',
    GROUP_ELEMENTS: 'group_elements',
    UNSAVED_CHANGES: 'unsaved_changes',
    FINAL_UNSAVED_CHANGES: 'final_unsaved_changes',
    CLEAR_HISTORY: 'clear_history',
    FINAL_CLEAR_HISTORY: 'final_clear_history',
    SAVE_CONFIRMATION: 'save_confirmation',
    FINAL_SAVE_CONFIRMATION: 'final_save_confirmation',
    SAVE_PROCESSING: 'save_processing',
    SAVE_FAILURE: 'save_failure',
    SHARE_CONFIRMATION: 'share_confirmation',
    HIDE_SCRIPT: 'hide_script',
    FINAL_HIDE_SCRIPT: 'final_hide_script',
    AUTO_SORT_ACTIVATED: 'auto_sort_activated',
    EMERGENCY_EXIT: 'emergency_exit'
} as const;

interface ModalContextValue extends ModalStateReturn {
    modalNames: typeof MODAL_NAMES;
}

const ModalContext = createContext<ModalContextValue | null>(null);

interface ModalProviderProps {
    children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
    const modalState = useModalState(Object.values(MODAL_NAMES));

    const contextValue: ModalContextValue = {
        ...modalState,
        modalNames: MODAL_NAMES
    };

    return (
        <ModalContext.Provider value={contextValue}>
            {children}
        </ModalContext.Provider>
    );
};

export const useModalContext = (): ModalContextValue => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModalContext must be used within a ModalProvider');
    }
    return context;
};

export { MODAL_NAMES };