// frontend/src/features/script/hooks/useElementModalActions.ts

import { useState, useCallback } from 'react';
import { ScriptElement } from '../types/scriptElements';
import { UpdateElementOperation } from '../types/editQueue';
import { useEnhancedToast } from '../../../utils/toastUtils';

interface UseElementModalActionsParams {
    scriptId: string | undefined;
    editQueueElements: ScriptElement[];
    applyLocalChange: (operation: any) => void;
    insertElement: (elementData: any) => void;
    modalState: {
        openModal: (name: string) => void;
        closeModal: (name: string) => void;
    };
    modalNames: {
        ADD_ELEMENT: string;
        EDIT_ELEMENT: string;
        DUPLICATE_ELEMENT: string;
        DELETE_CUE: string;
    };
}

export const useElementModalActions = ({
    scriptId,
    editQueueElements,
    applyLocalChange,
    insertElement,
    modalState,
    modalNames
}: UseElementModalActionsParams) => {
    const { showSuccess, showError } = useEnhancedToast();
    
    // State for element operations
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [selectedElement, setSelectedElement] = useState<any>(null);
    const [selectedElementName, setSelectedElementName] = useState<string>('');
    const [selectedElementTimeOffset, setSelectedElementTimeOffset] = useState<number>(0);
    const [isDeletingCue, setIsDeletingCue] = useState(false);
    const [isDuplicatingElement, setIsDuplicatingElement] = useState(false);
    const [forceRender, setForceRender] = useState(0);

    const handleElementCreated = useCallback(async (elementData: any) => {
        insertElement(elementData);
        modalState.closeModal(modalNames.ADD_ELEMENT);
        showSuccess('Script Element Created', 'New element added to script. Save to apply changes.');
    }, [insertElement, modalState, modalNames.ADD_ELEMENT, showSuccess]);

    const handleElementDuplicate = useCallback(async () => {
        if (!selectedElementId) {
            showError('No script element selected for duplication');
            return;
        }

        try {
            const elementData = editQueueElements.find(el => el.element_id === selectedElementId);
            
            if (!elementData) {
                showError('Selected element not found');
                return;
            }

            setSelectedElementName(elementData.description || 'Unknown Element');
            setSelectedElementTimeOffset(elementData.time_offset_ms || 0);
            modalState.openModal(modalNames.DUPLICATE_ELEMENT);

        } catch (error) {
            console.error('Error finding element details:', error);
            showError('Failed to load element details. Please try again.');
        }
    }, [selectedElementId, editQueueElements, modalState, modalNames.DUPLICATE_ELEMENT, showError]);

    const handleConfirmDuplicate = useCallback(async (description: string, time_offset_ms: number) => {
        if (!selectedElementId || !scriptId) {
            return;
        }

        setIsDuplicatingElement(true);
        try {
            const originalElement = editQueueElements.find(el => el.element_id === selectedElementId);
            if (!originalElement) {
                throw new Error('Original element not found');
            }

            const duplicateData = {
                ...originalElement,
                description,
                time_offset_ms,
                element_id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                created_at: undefined,
                updated_at: undefined,
                is_deleted: undefined
            };

            insertElement(duplicateData);

            showSuccess('Script Element Duplicated', 'Script element has been duplicated. Save to apply changes.');
            modalState.closeModal(modalNames.DUPLICATE_ELEMENT);

        } catch (error) {
            console.error('Error duplicating element:', error);
            showError('Failed to duplicate script element. Please try again.');
        } finally {
            setIsDuplicatingElement(false);
        }
    }, [selectedElementId, scriptId, editQueueElements, insertElement, modalState, modalNames.DUPLICATE_ELEMENT, showSuccess, showError]);

    const handleElementEditSave = useCallback(async (changes: Record<string, { oldValue: any; newValue: any }>) => {
        if (!selectedElement) {
            return;
        }

        try {
            applyLocalChange({
                type: 'UPDATE_ELEMENT',
                elementId: selectedElement.element_id,
                changes: changes,
                description: `Updated element "${selectedElement.description}"`
            } as UpdateElementOperation);

            setForceRender(prev => prev + 1);

            modalState.closeModal(modalNames.EDIT_ELEMENT);
            showSuccess('Element Updated', 'Element changes have been applied. Save to persist changes.');
        } catch (error) {
            console.error('Error updating element:', error);
            showError('Failed to update script element. Please try again.');
        }
    }, [selectedElement, applyLocalChange, modalState, modalNames.EDIT_ELEMENT, showSuccess, showError]);

    const handleElementEdit = useCallback(() => {
        if (!selectedElementId) {
            showError('Please select an element to edit');
            return;
        }
        
        const elementToEdit = editQueueElements.find(el => el.element_id === selectedElementId);
        if (!elementToEdit) {
            showError('Selected element not found');
            return;
        }
        
        setSelectedElement(elementToEdit);
        modalState.openModal(modalNames.EDIT_ELEMENT);
    }, [selectedElementId, editQueueElements, modalState, modalNames.EDIT_ELEMENT, showError]);

    const handleElementDelete = useCallback(async () => {
        if (!selectedElementId) {
            showError('No script element selected for deletion');
            return;
        }

        const elementToDelete = editQueueElements.find(el => el.element_id === selectedElementId);
        if (!elementToDelete) {
            showError('Selected element not found in current script');
            return;
        }

        setSelectedElementName(elementToDelete.description || 'Unknown Element');
        modalState.openModal(modalNames.DELETE_CUE);
    }, [selectedElementId, editQueueElements, modalState, modalNames.DELETE_CUE, showError]);

    const handleConfirmDeleteCue = useCallback(async () => {
        if (!selectedElementId) {
            return;
        }

        setIsDeletingCue(true);
        try {
            const elementToDelete = editQueueElements.find(el => el.element_id === selectedElementId);
            if (!elementToDelete) {
                throw new Error('Element to delete not found');
            }

            applyLocalChange({
                type: 'DELETE_ELEMENT',
                elementId: selectedElementId,
                elementData: elementToDelete
            } as any);

            showSuccess('Script Element Deleted', 'Script element has been deleted. Save to apply changes.');

            setSelectedElementId(null);
            modalState.closeModal(modalNames.DELETE_CUE);

        } catch (error) {
            console.error('Error deleting element:', error);
            showError('Failed to delete script element. Please try again.');
        } finally {
            setIsDeletingCue(false);
        }
    }, [selectedElementId, editQueueElements, applyLocalChange, modalState, modalNames.DELETE_CUE, showSuccess, showError]);

    const handleElementGroup = useCallback(() => {
        showError('Element grouping feature is under development');
    }, [showError]);

    const handleSelectionChange = useCallback((id: string | null) => {
        setSelectedElementId(id);
    }, []);

    return {
        // State
        selectedElementId,
        selectedElement,
        selectedElementName,
        selectedElementTimeOffset,
        isDeletingCue,
        isDuplicatingElement,
        forceRender,
        
        // Handlers
        handleElementCreated,
        handleElementDuplicate,
        handleConfirmDuplicate,
        handleElementEditSave,
        handleElementEdit,
        handleElementDelete,
        handleConfirmDeleteCue,
        handleElementGroup,
        handleSelectionChange,
        
        // Setters for external use
        setSelectedElementId,
        setSelectedElement
    };
};