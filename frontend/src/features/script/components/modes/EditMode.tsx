// frontend/src/features/script/components/modes/EditMode.tsx

import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import { VStack, Text, Box, Flex } from '@chakra-ui/react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useScriptElements } from '../../hooks/useScriptElements';
import { useScript } from '../../hooks/useScript';
import { CueElement } from '../CueElement';
import { ScriptElementsHeader } from '../ScriptElementsHeader';
import { DragReorderModal } from '../modals/DragReorderModal';
import { EditElementModal } from '../modals/EditElementModal';

interface EditModeProps {
    scriptId: string;
    colorizeDepNames?: boolean;
    showClockTimes?: boolean;
    autoSortCues?: boolean;
    onAutoSortChange?: (value: boolean) => void;
    onScrollStateChange?: (state: {
        isAtTop: boolean;
        isAtBottom: boolean;
        allElementsFitOnScreen: boolean;
    }) => void;
    onSelectionChange?: (id: string | null) => void;
    // Edit queue props
    elements?: any[];
    script?: any; // Optional cached script to prevent refetching
    onApplyLocalChange?: (operation: any) => void;
}

export interface EditModeRef {
    refetchElements: () => Promise<void>;
    selectedElementId: string | null;
    clearSelection: () => void;
}

const EditModeComponent = forwardRef<EditModeRef, EditModeProps>(({
    scriptId,
    colorizeDepNames = false,
    showClockTimes = false,
    autoSortCues = false,
    onAutoSortChange,
    onScrollStateChange,
    onSelectionChange,
    elements: externalElements,
    script: providedScript,
    onApplyLocalChange
}, ref) => {
    // console.log(`📝 EditMode: Component rendering - scriptId: ${scriptId}, elements: ${externalElements?.length || 0}, script: ${providedScript ? 'provided' : 'will fetch'}`);
    // Use external elements if provided (from edit queue), otherwise fallback to direct hook
    const shouldFetchElements = !externalElements;
    const { elements: serverElements, isLoading, error, refetchElements } = useScriptElements(shouldFetchElements ? scriptId : undefined);
    
    // Use provided script if available, otherwise fetch it
    const shouldFetchScript = !providedScript;
    const { script: scriptFromHook } = useScript(shouldFetchScript ? scriptId : undefined);
    const script = providedScript || scriptFromHook;

    const elements = externalElements || serverElements;
    const [localElements, setLocalElements] = useState(elements);
    const [dragModalOpen, setDragModalOpen] = useState(false);
    const [draggedElement, setDraggedElement] = useState<any>(null);
    const [elementAbove, setElementAbove] = useState<any>(null);
    const [elementBelow, setElementBelow] = useState<any>(null);
    const [pendingReorder, setPendingReorder] = useState<any>(null);
    const [originalElementsBeforeDrag, setOriginalElementsBeforeDrag] = useState<any[]>([]);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [elementToEdit, setElementToEdit] = useState<any>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const lastScrollStateRef = useRef<{isAtTop: boolean; isAtBottom: boolean; allElementsFitOnScreen: boolean} | null>(null);
    

    useEffect(() => {
        // Don't update localElements during drag operations - preserve the user's dropped position
        if (dragModalOpen || pendingReorder) {
            return;
        }
        
        // Only update if the elements have actually changed (deep comparison)
        const elementsChanged = !localElements || 
            localElements.length !== elements?.length ||
            localElements.some((el, index) => {
                const newEl = elements?.[index];
                if (!newEl) return true;
                if (el.element_id !== newEl.element_id) return true;
                // Check if any key fields have changed
                return el.duration !== newEl.duration ||
                       el.priority !== newEl.priority ||
                       el.description !== newEl.description ||
                       el.time_offset_ms !== newEl.time_offset_ms ||
                       el.location_details !== newEl.location_details ||
                       el.cue_notes !== newEl.cue_notes ||
                       el.cue_id !== newEl.cue_id ||
                       el.department_id !== newEl.department_id ||
                       el.custom_color !== newEl.custom_color;
            });
            
        if (elementsChanged) {
            // console.log(`📊 EditMode: Elements updated - from ${localElements?.length || 0} to ${elements?.length || 0} elements`);
            setLocalElements(elements);
        }
    }, [elements, localElements, dragModalOpen, pendingReorder]);

    // Expose refetch function and selection state to parent via ref
    useImperativeHandle(
        ref,
        () => ({
            refetchElements,
            selectedElementId,
            clearSelection: () => {
                setSelectedElementId(null);
                onSelectionChange?.(null);
            },
        }),
        [refetchElements, selectedElementId, onSelectionChange]
    );

    // Drag sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Handle drag end
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = localElements.findIndex(el => el.element_id === active.id);
        const newIndex = localElements.findIndex(el => el.element_id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        const draggedEl = localElements[oldIndex];
        
        // Calculate elementAbove and elementBelow based on the POST-reorder state
        // We need to account for the fact that we're looking at pre-reorder indices
        let elementAbove = null;
        let elementBelow = null;
        
        if (oldIndex < newIndex) {
            // Moving element DOWN in the list
            elementAbove = newIndex > 0 ? localElements[newIndex] : null; // The element currently at newIndex will be above
            elementBelow = newIndex < localElements.length - 1 ? localElements[newIndex + 1] : null;
        } else {
            // Moving element UP in the list  
            elementAbove = newIndex > 0 ? localElements[newIndex - 1] : null;
            elementBelow = newIndex < localElements.length - 1 ? localElements[newIndex] : null; // The element currently at newIndex will be below
        }

        // Store original elements before making any changes
        setOriginalElementsBeforeDrag([...localElements]);
        
        const reorderedElements = arrayMove(localElements, oldIndex, newIndex);
        
        const pendingReorderData = {
            oldIndex,
            newIndex,
            reorderedElements
        };
        setPendingReorder(pendingReorderData);

        // Immediately show the element in its new position
        setLocalElements(reorderedElements);

        // Check if all three elements (above, dragged, below) have the same time offset
        const draggedTimeOffset = draggedEl.time_offset_ms;
        const aboveTimeOffset = elementAbove?.time_offset_ms;
        const belowTimeOffset = elementBelow?.time_offset_ms;
        
        
        const allHaveSameTimeOffset = (
            (elementAbove === null || aboveTimeOffset === draggedTimeOffset) &&
            (elementBelow === null || belowTimeOffset === draggedTimeOffset)
        );


        // Check if auto-sort is currently enabled
        
        if (allHaveSameTimeOffset || !autoSortCues) {
            const reason = allHaveSameTimeOffset ? 'All elements have same time offset' : 'Auto-sort is disabled';
            
            // Set the dragged element so applyReorder can access it
            setDraggedElement(draggedEl);
            await applyReorderDirect(pendingReorderData, draggedEl);
            // Clear all state like the modal handlers do
            setDraggedElement(null);
            setPendingReorder(null);
            setOriginalElementsBeforeDrag([]);
            return;
        }

        // Set modal data for cases where time offsets differ
        setDraggedElement(draggedEl);
        setElementAbove(elementAbove);
        setElementBelow(elementBelow);
        setDragModalOpen(true);
    };

    // Handle modal choices
    const handleDisableAutoSort = async () => {
        if (onAutoSortChange) {
            onAutoSortChange(false);
        }
        await applyReorder();
        closeDragModal();
    };

    const handleMatchBefore = async () => {
        await applyReorder();

        if (elementAbove && draggedElement) {
            await updateElementTimeOffset(draggedElement.element_id, elementAbove.time_offset_ms);
        }
        
        closeDragModal();
    };

    const handleMatchAfter = async () => {
        await applyReorder();

        if (elementBelow && draggedElement) {
            await updateElementTimeOffset(draggedElement.element_id, elementBelow.time_offset_ms);
        }
        
        closeDragModal();
    };

    const closeDragModal = () => {
        setDragModalOpen(false);
        setDraggedElement(null);
        setElementAbove(null);
        setElementBelow(null);
        setPendingReorder(null);
        setOriginalElementsBeforeDrag([]);
    };

    const handleCancelDrag = () => {
        // Revert local elements back to original position before drag
        setLocalElements(originalElementsBeforeDrag);
        
        // Close modal and clear state
        closeDragModal();
    };

    const applyReorderDirect = async (pendingReorderData: any, draggedElement: any) => {

        // If we have edit queue functionality, use it
        if (onApplyLocalChange) {
            // Create reorder operation for edit queue
            const reorderOperation = {
                type: 'REORDER',
                element_id: draggedElement?.element_id,
                old_index: pendingReorderData.oldIndex,
                new_index: pendingReorderData.newIndex,
                old_sequence: pendingReorderData.oldIndex + 1,
                new_sequence: pendingReorderData.newIndex + 1
            };
            
            onApplyLocalChange(reorderOperation);
            return;
        }

        // This should not happen - edit queue is always available
        console.error('Edit queue not available for reorder operation');
        
    };

    const applyReorder = async () => {
        if (!pendingReorder) {
            return;
        }


        // If we have edit queue functionality, use it
        if (onApplyLocalChange) {
            // Create reorder operation for edit queue
            const reorderOperation = {
                type: 'REORDER',
                element_id: draggedElement?.element_id,
                old_index: pendingReorder.oldIndex,
                new_index: pendingReorder.newIndex,
                old_sequence: pendingReorder.oldIndex + 1,
                new_sequence: pendingReorder.newIndex + 1
            };
            
            onApplyLocalChange(reorderOperation);
            return;
        }

        // This should not happen - edit queue is always available
        console.error('Edit queue not available for reorder operation');
    };

    const updateElementTimeOffset = async (elementId: string, newTimeOffsetMs: number) => {
        
        // Find the element to get old value
        const element = localElements.find(el => el.element_id === elementId);
        const oldTimeOffsetMs = element?.time_offset_ms || 0;
        
        // Update local elements immediately for UI feedback
        const updatedElements = localElements.map(el => 
            el.element_id === elementId 
                ? { ...el, time_offset_ms: newTimeOffsetMs }
                : el
        );
        setLocalElements(updatedElements);
        
        // If we have edit queue functionality, use it
        if (onApplyLocalChange) {
            const timeOffsetOperation = {
                type: 'UPDATE_TIME_OFFSET',
                element_id: elementId,
                old_time_offset_ms: oldTimeOffsetMs,
                new_time_offset_ms: newTimeOffsetMs
            };
            
            onApplyLocalChange(timeOffsetOperation);
            return;
        }

        // This should not happen - edit queue is always available
        console.error('Edit queue not available for time offset update operation');
        
    };

    // Handle element edit
    const handleEditElement = (element: any) => {
        setElementToEdit(element);
        setEditModalOpen(true);
    };

    // Handle element edit modal save
    const handleElementEditSave = (changes: Record<string, { oldValue: any; newValue: any }>) => {
        if (!elementToEdit || !onApplyLocalChange) return;

        // Create UPDATE_FIELD operations for each changed field
        Object.entries(changes).forEach(([field, { oldValue, newValue }]) => {
            if (field === 'time_offset_ms') {
                // Special handling for time offset changes
                const timeOffsetOperation = {
                    type: 'UPDATE_TIME_OFFSET',
                    element_id: elementToEdit.element_id,
                    old_time_offset_ms: oldValue,
                    new_time_offset_ms: newValue
                };
                onApplyLocalChange(timeOffsetOperation);
            } else {
                // Regular field update operation
                const fieldUpdateOperation = {
                    type: 'UPDATE_FIELD',
                    element_id: elementToEdit.element_id,
                    field: field,
                    old_value: oldValue,
                    new_value: newValue
                };
                onApplyLocalChange(fieldUpdateOperation);
            }
        });

        // Close modal and clear state
        setEditModalOpen(false);
        setElementToEdit(null);
    };

    // Handle edit modal close
    const handleEditModalClose = () => {
        setEditModalOpen(false);
        setElementToEdit(null);
    };

    // Function to check scroll state
    const checkScrollState = () => {
        if (!scrollContainerRef.current || !onScrollStateChange) return;
        
        const container = scrollContainerRef.current;
        const { scrollTop, scrollHeight, clientHeight } = container;
        
        const isAtTop = scrollTop <= 1; // Allow for 1px tolerance
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1; // Allow for 1px tolerance
        const allElementsFitOnScreen = scrollHeight <= clientHeight;
        
        const currentState = { isAtTop, isAtBottom, allElementsFitOnScreen };
        const lastState = lastScrollStateRef.current;
        
        // Only call callback if scroll state actually changed
        const stateChanged = !lastState || 
            lastState.isAtTop !== currentState.isAtTop ||
            lastState.isAtBottom !== currentState.isAtBottom ||
            lastState.allElementsFitOnScreen !== currentState.allElementsFitOnScreen;
            
        if (stateChanged) {
            lastScrollStateRef.current = currentState;
            onScrollStateChange(currentState);
        }
    };

    // Check scroll state when elements change or component mounts
    useEffect(() => {
        checkScrollState();
    }, [localElements, isLoading]);

    // Add scroll event listener
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        container.addEventListener('scroll', checkScrollState);
        
        // Check initial state
        setTimeout(checkScrollState, 100); // Small delay to ensure rendering is complete
        
        return () => {
            container.removeEventListener('scroll', checkScrollState);
        };
    }, [localElements]);

    // Log render completion
    // useEffect(() => {
    //     console.log(`🎯 EditMode: Render completed - isLoading: ${isLoading}, error: ${!!error}, elements: ${localElements.length}`);
    // });

    return (
        <VStack height="100%" spacing={0} align="stretch">
            {/* Header Row */}
            <ScriptElementsHeader />

            {/* Elements List */}
            <Box ref={scrollContainerRef} flex={1} overflowY="auto" overflowX="hidden" className="hide-scrollbar">
                {isLoading && (
                    <Flex justify="center" align="center" height="200px">
                        <Text color="gray.500">Loading script elements...</Text>
                    </Flex>
                )}

                {error && (
                    <Flex justify="center" align="center" height="200px">
                        <Text color="red.500">Error: {error}</Text>
                    </Flex>
                )}

                {!isLoading && !error && localElements.length === 0 && (
                    <Flex justify="center" align="center" height="200px" direction="column" spacing={4}>
                        <Text color="gray.500" fontSize="lg">
                            No script elements yet
                        </Text>
                        <Text color="gray.400" fontSize="sm">
                            Use the "Add" button in the toolbar to create your first cue, note, or group
                        </Text>
                    </Flex>
                )}

                {!isLoading && !error && localElements.length > 0 && (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={localElements.map(el => el.element_id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <Box>
                                <VStack spacing={0} align="stretch">
                                    {localElements.map((element, index) => {
                                        // Only show clock times if we have the required script start time
                                        const shouldShowClockTimes = showClockTimes && !!script?.start_time;
                                        return (
                                            <CueElement
                                                key={element.element_id}
                                                element={element}
                                                index={index}
                                                allElements={localElements}
                                                colorizeDepNames={colorizeDepNames}
                                                showClockTimes={shouldShowClockTimes}
                                                scriptStartTime={script?.start_time instanceof Date ? script.start_time.toISOString() : script?.start_time}
                                                scriptEndTime={script?.end_time instanceof Date ? script.end_time.toISOString() : script?.end_time}
                                                isDragEnabled={true}
                                                isSelected={selectedElementId === element.element_id}
                                                onSelect={() => {
                                                    const newId =
                                                        selectedElementId === element.element_id
                                                            ? null
                                                            : element.element_id;
                                                    setSelectedElementId(newId);
                                                    onSelectionChange?.(newId);
                                                }}
                                                onEdit={handleEditElement}
                                            />
                                        );
                                    })}
                                </VStack>
                            </Box>
                        </SortableContext>
                    </DndContext>
                )}
            </Box>

            {/* Drag Reorder Modal */}
            <DragReorderModal
                isOpen={dragModalOpen}
                onClose={closeDragModal}
                draggedElement={draggedElement}
                elementAbove={elementAbove}
                elementBelow={elementBelow}
                onDisableAutoSort={handleDisableAutoSort}
                onMatchBefore={handleMatchBefore}
                onMatchAfter={handleMatchAfter}
                onCancel={handleCancelDrag}
            />

            {/* Edit Element Modal */}
            <EditElementModal
                isOpen={editModalOpen}
                onClose={handleEditModalClose}
                element={elementToEdit}
                onSave={handleElementEditSave}
            />
        </VStack>
    );
});

// Custom comparison function that ignores callback props
const areEqual = (prevProps: EditModeProps, nextProps: EditModeProps) => {
    // Compare all props except callbacks
    return (
        prevProps.scriptId === nextProps.scriptId &&
        prevProps.colorizeDepNames === nextProps.colorizeDepNames &&
        prevProps.showClockTimes === nextProps.showClockTimes &&
        prevProps.autoSortCues === nextProps.autoSortCues &&
        prevProps.elements === nextProps.elements &&
        prevProps.script === nextProps.script
        // Deliberately ignoring onAutoSortChange, onScrollStateChange, and onApplyLocalChange
    );
};

export const EditMode = React.memo(EditModeComponent, areEqual);
