// frontend/src/features/script/hooks/useElementModalActions.ts

import { useState, useCallback } from 'react';
import { ScriptElement } from '../types/scriptElements';
import { useEnhancedToast } from '../../../utils/toastUtils';
import { generateGroupSummary, generateTempGroupId } from '../utils/groupUtils';

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
        EDIT_CUE: string;
        EDIT_GROUP: string;
        DUPLICATE_ELEMENT: string;
        DELETE_CUE: string;
        GROUP_ELEMENTS: string;
    };
    // Selection state from parent (EditMode)
    selectedElementIds: string[];
    clearSelection: () => void;
    setSelectedElementIds: (ids: string[]) => void;
}

export const useElementModalActions = ({
    scriptId,
    editQueueElements,
    applyLocalChange,
    insertElement,
    modalState,
    modalNames,
    selectedElementIds,
    clearSelection,
    setSelectedElementIds
}: UseElementModalActionsParams) => {
    const { showSuccess, showError } = useEnhancedToast();
    
    // State for element operations (selectedElementIds now comes from parent)
    const [selectedElement, setSelectedElement] = useState<any>(null);
    const [selectedElementName, setSelectedElementName] = useState<string>('');
    const [selectedElementTimeOffset, setSelectedElementTimeOffset] = useState<number>(0);
    const [isDeletingCue, setIsDeletingCue] = useState(false);
    const [isDuplicatingElement, setIsDuplicatingElement] = useState(false);
    const [forceRender, setForceRender] = useState(0);
    
    // Helper to get the first selected element (for backwards compatibility)
    const selectedElementId = selectedElementIds.length > 0 ? selectedElementIds[0] : null;

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
            // Get the most current version of the element from edit queue
            const elementData = editQueueElements.find(el => el.element_id === selectedElementId);
            
            if (!elementData) {
                showError('Selected element not found');
                return;
            }

            setSelectedElementName(elementData.element_name || 'Unknown Element');
            setSelectedElementTimeOffset(elementData.offset_ms || 0);
            modalState.openModal(modalNames.DUPLICATE_ELEMENT);

        } catch (error) {
            console.error('Error finding element details:', error);
            showError('Failed to load element details. Please try again.');
        }
    }, [selectedElementId, editQueueElements, modalState, modalNames.DUPLICATE_ELEMENT, showError]);

    const handleConfirmDuplicate = useCallback(async (element_name: string, offset_ms: number) => {
        if (!selectedElementId || !scriptId) {
            return;
        }

        setIsDuplicatingElement(true);
        try {
            // Get the most current version of the element from edit queue
            const originalElement = editQueueElements.find(el => el.element_id === selectedElementId);
            if (!originalElement) {
                throw new Error('Original element not found');
            }

            // If the original element has a parent_element_id, verify it still exists
            // If not, find the correct group parent (this handles cases where group IDs change)
            let correctedParentId = originalElement.parent_element_id;
            if (originalElement.parent_element_id && originalElement.group_level && originalElement.group_level > 0) {
                const groupParentExists = editQueueElements.find(el => 
                    String(el.element_id) === String(originalElement.parent_element_id)
                );
                
                if (!groupParentExists) {
                    // Try to find the correct group parent by looking for other siblings
                    const siblingWithSameParent = editQueueElements.find(el => 
                        el.element_id !== originalElement.element_id &&
                        el.parent_element_id === originalElement.parent_element_id &&
                        el.group_level && el.group_level > 0
                    );
                    
                    if (siblingWithSameParent) {
                        // Find the actual group parent this sibling belongs to
                        const actualGroupParent = editQueueElements.find(el => 
                            (el as any).element_type === 'GROUP' &&
                            editQueueElements.some(child => 
                                child.parent_element_id === String(el.element_id) &&
                                child.element_id === siblingWithSameParent.element_id
                            )
                        );
                        
                        if (actualGroupParent) {
                            correctedParentId = String(actualGroupParent.element_id);
                        }
                    } else {
                        // No siblings found, try to find any group this element should belong to
                        // based on proximity or time offset
                        const nearbyGroups = editQueueElements.filter(el => (el as any).element_type === 'GROUP');
                        if (nearbyGroups.length === 1) {
                            // If there's only one group, assume it belongs there
                            correctedParentId = String(nearbyGroups[0].element_id);
                        }
                    }
                }
            }

            const duplicateData = {
                ...originalElement,
                element_name,
                offset_ms,
                element_id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                parent_element_id: correctedParentId,
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

    const handleElementEditSave = useCallback(async (changes: Record<string, { old_value: any; new_value: any }>) => {
        if (!selectedElement) {
            return;
        }

        try {
            // Changes are already in the correct format (old_value/new_value)
            const transformedChanges = changes;

            applyLocalChange({
                type: 'UPDATE_ELEMENT',
                element_id: selectedElement.element_id,
                changes: transformedChanges,
                description: `Updated element "${selectedElement.element_name}"`
            });

            setForceRender(prev => prev + 1);

            modalState.closeModal(modalNames.EDIT_CUE);
            showSuccess('Element Updated', 'Element changes have been applied. Save to persist changes.');
        } catch (error) {
            console.error('Error updating element:', error);
            showError('Failed to update script element. Please try again.');
        }
    }, [selectedElement, applyLocalChange, modalState, modalNames.EDIT_CUE, showSuccess, showError]);

    const handleGroupEditSave = useCallback(async (changes: Record<string, { old_value: any; new_value: any }>, offsetDelta: number, affectedChildren: string[]) => {
        if (!selectedElement) {
            return;
        }

        try {
            // Create UPDATE_GROUP_WITH_PROPAGATION operation
            const updateGroupOperation = {
                type: 'UPDATE_GROUP_WITH_PROPAGATION',
                element_id: selectedElement.element_id,
                field_updates: Object.fromEntries(
                    Object.entries(changes).map(([key, { new_value }]) => [key, new_value])
                ),
                old_values: Object.fromEntries(
                    Object.entries(changes).map(([key, { old_value }]) => [key, old_value])
                ),
                offset_delta_ms: offsetDelta,
                affected_children: affectedChildren,
                description: `Updated group "${selectedElement.element_name}" with ${Object.keys(changes).length} changes${affectedChildren.length > 0 ? ` and propagated timing to ${affectedChildren.length} children` : ''}`
            };
            
            applyLocalChange(updateGroupOperation);

            modalState.closeModal(modalNames.EDIT_GROUP || 'edit-group');
            showSuccess('Group Updated', 'Group changes have been applied. Save to persist changes.');
        } catch (error) {
            console.error('Error updating group:', error);
            showError('Failed to update group. Please try again.');
        }
    }, [selectedElement, applyLocalChange, modalState, modalNames.EDIT_GROUP, showSuccess, showError]);

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
        
        // Route to appropriate modal based on element type
        if ((elementToEdit as any).element_type === 'GROUP') {
            setSelectedElement(elementToEdit);
            modalState.openModal(modalNames.EDIT_GROUP);
        } else {
            setSelectedElement(elementToEdit);
            modalState.openModal(modalNames.EDIT_CUE);
        }
    }, [selectedElementId, editQueueElements, modalState, modalNames.EDIT_CUE, modalNames.EDIT_GROUP, showError]);

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

        setSelectedElementName(elementToDelete.element_name || 'Unknown Element');
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
                element_id: selectedElementId,
                element_data: elementToDelete
            } as any);

            showSuccess('Script Element Deleted', 'Script element has been deleted. Save to apply changes.');

            setSelectedElementIds([]);
            modalState.closeModal(modalNames.DELETE_CUE);

        } catch (error) {
            console.error('Error deleting element:', error);
            showError('Failed to delete script element. Please try again.');
        } finally {
            setIsDeletingCue(false);
        }
    }, [selectedElementId, editQueueElements, applyLocalChange, modalState, modalNames.DELETE_CUE, showSuccess, showError]);

    const handleElementGroup = useCallback(() => {
        if (selectedElementIds.length < 2) {
            showError('Please select at least 2 elements to create a group');
            return;
        }
        
        // Check if any selected elements are already in groups
        const selectedElements = editQueueElements.filter(el => selectedElementIds.includes(el.element_id));
        const alreadyGrouped = selectedElements.filter(el => 
            (el as any).element_type === 'GROUP' || 
            (el.parent_element_id && el.group_level && el.group_level > 0)
        );
        
        if (alreadyGrouped.length > 0) {
            const groupedNames = alreadyGrouped.map(el => el.element_name || 'Unnamed').join(', ');
            showError(`Cannot group elements that are already in groups: ${groupedNames}`);
            return;
        }
        
        modalState.openModal(modalNames.GROUP_ELEMENTS);
    }, [selectedElementIds, editQueueElements, modalState, modalNames.GROUP_ELEMENTS, showError]);

    const handleConfirmGroupElements = useCallback((groupName: string, backgroundColor: string) => {
        if (selectedElementIds.length < 2) {
            showError('Please select at least 2 elements to create a group');
            return;
        }

        try {
            const tempGroupId = generateTempGroupId();
            
            const selectedElements = editQueueElements.filter(el => selectedElementIds.includes(el.element_id));
            const autoGeneratedNotes = generateGroupSummary(selectedElements);
            
            const groupOperation = {
                type: 'CREATE_GROUP',
                element_id: tempGroupId, // Add top-level element_id for operation processing
                element_ids: selectedElementIds,
                group_name: groupName,
                custom_color: backgroundColor,
                element_data: {
                    element_id: tempGroupId,
                    element_name: groupName,
                    element_type: 'GROUP',
                    custom_color: backgroundColor,
                    cue_notes: autoGeneratedNotes
                }
            };

            applyLocalChange(groupOperation);
            
            showSuccess('Elements Grouped', `${selectedElementIds.length} elements have been grouped as "${groupName}". Save to apply changes.`);
            modalState.closeModal(modalNames.GROUP_ELEMENTS);
            
            // Clear selection after grouping
            clearSelection();
        } catch (error) {
            console.error('Error creating group:', error);
            showError('Failed to create element group. Please try again.');
        }
    }, [selectedElementIds, applyLocalChange, modalState, modalNames.GROUP_ELEMENTS, showSuccess, showError, clearSelection]);

    const handleElementUngroup = useCallback(() => {
        
        if (!selectedElementId) {
            showError('Please select a group element to ungroup');
            return;
        }

        const groupElement = editQueueElements.find(el => el.element_id === selectedElementId);
        
        
        if (!groupElement || (groupElement as any).element_type !== 'GROUP') {
            showError('Selected element is not a group');
            return;
        }

        try {
            const ungroupOperation = {
                type: 'UNGROUP_ELEMENTS',
                group_element_id: selectedElementId,
                group_name: groupElement.element_name || 'Untitled Group'
            };

            applyLocalChange(ungroupOperation);
            
            showSuccess('Group Ungrouped', 'Group has been dissolved and elements restored. Save to apply changes.');
            clearSelection();
        } catch (error) {
            console.error('Error ungrouping elements:', error);
            showError('Failed to ungroup elements. Please try again.');
        }
    }, [selectedElementId, editQueueElements, applyLocalChange, showSuccess, showError, clearSelection]);

    // Selection is now managed by parent component

    return {
        // State (selection now managed by parent)
        selectedElementId, // Backwards compatibility - first selected element
        selectedElementIds, // Passed from parent
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
        handleGroupEditSave,
        handleElementEdit,
        handleElementDelete,
        handleConfirmDeleteCue,
        handleElementGroup,
        handleConfirmGroupElements,
        handleElementUngroup,
        
        // Setters for external use
        setSelectedElement,
        setSelectedElementIds
    };
};