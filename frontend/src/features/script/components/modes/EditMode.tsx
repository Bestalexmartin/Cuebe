// frontend/src/features/script/components/modes/EditMode.tsx

import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef, useMemo } from 'react';
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
    onSelectionChange?: (ids: string[]) => void;
    onToggleGroupCollapse?: (elementId: string) => void;
    // Edit queue props
    elements?: any[];
    allElements?: any[]; // All elements including collapsed children for group calculations
    script?: any; // Optional cached script to prevent refetching
    onApplyLocalChange?: (operation: any) => void;
}

export interface EditModeRef {
    refetchElements: () => Promise<void>;
    selectedElementIds: string[];
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
    onToggleGroupCollapse,
    elements: externalElements,
    allElements: externalAllElements,
    script: providedScript,
    onApplyLocalChange
}, ref) => {
    // Use external elements if provided (from edit queue), otherwise fallback to direct hook
    const shouldFetchElements = !externalElements;
    const { elements: serverElements, isLoading, error, refetchElements } = useScriptElements(shouldFetchElements ? scriptId : undefined);
    
    // Use provided script if available, otherwise fetch it
    const shouldFetchScript = !providedScript;
    const { script: scriptFromHook } = useScript(shouldFetchScript ? scriptId : undefined);
    const script = providedScript || scriptFromHook;

    const elements = externalElements || serverElements;
    const allElementsForGroupCalculations = externalAllElements || elements;
    const [localElements, setLocalElements] = useState(elements);
    const [dragModalOpen, setDragModalOpen] = useState(false);
    const [draggedElement, setDraggedElement] = useState<any>(null);
    const [elementAbove, setElementAbove] = useState<any>(null);
    const [elementBelow, setElementBelow] = useState<any>(null);
    const [pendingReorder, setPendingReorder] = useState<any>(null);
    const [originalElementsBeforeDrag, setOriginalElementsBeforeDrag] = useState<any[]>([]);
    const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [elementToEdit, setElementToEdit] = useState<any>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const lastScrollStateRef = useRef<{isAtTop: boolean; isAtBottom: boolean; allElementsFitOnScreen: boolean} | null>(null);
    
    // Helper function to handle element selection with shift-click support
    const handleElementSelect = (elementId: string, shiftKey: boolean = false) => {
        if (!shiftKey) {
            // Regular click - single selection or deselection
            const newSelection = selectedElementIds.includes(elementId) ? [] : [elementId];
            setSelectedElementIds(newSelection);
            onSelectionChange?.(newSelection);
        } else {
            // Shift-click - select adjacent range
            if (selectedElementIds.length === 0) {
                // No existing selection, treat as regular click
                setSelectedElementIds([elementId]);
                onSelectionChange?.([elementId]);
                return;
            }

            // Check if any currently selected element or the clicked element is part of a group
            const selectedElements = displayElements.filter(el => selectedElementIds.includes(el.element_id));
            const clickedElement = displayElements.find(el => el.element_id === elementId);
            
            const allElements = [...selectedElements];
            if (clickedElement) allElements.push(clickedElement);
            
            const hasGroupElements = allElements.some(el => 
                (el as any).element_type === 'GROUP' || 
                (el.parent_element_id && el.group_level && el.group_level > 0)
            );
            
            if (hasGroupElements) {
                // Don't allow shift-selection when group elements are involved - just select clicked element
                setSelectedElementIds([elementId]);
                onSelectionChange?.([elementId]);
                return;
            }

            const clickedIndex = displayElements.findIndex(el => el.element_id === elementId);
            if (clickedIndex === -1) return;

            // Find the range boundaries based on existing selection using displayElements
            const selectedIndices = selectedElementIds
                .map(id => displayElements.findIndex(el => el.element_id === id))
                .filter(index => index !== -1)
                .sort((a, b) => a - b);

            if (selectedIndices.length === 0) return;

            const minSelected = selectedIndices[0];
            const maxSelected = selectedIndices[selectedIndices.length - 1];

            // Determine the new range
            let startIndex, endIndex;
            if (clickedIndex < minSelected) {
                startIndex = clickedIndex;
                endIndex = maxSelected;
            } else if (clickedIndex > maxSelected) {
                startIndex = minSelected;
                endIndex = clickedIndex;
            } else {
                // Clicked within existing range - deselect to clicked point
                if (clickedIndex - minSelected < maxSelected - clickedIndex) {
                    // Closer to start, keep from clicked to end
                    startIndex = clickedIndex;
                    endIndex = maxSelected;
                } else {
                    // Closer to end, keep from start to clicked
                    startIndex = minSelected;
                    endIndex = clickedIndex;
                }
            }

            // Check for group boundaries in the selection range
            const elementsInRange = displayElements.slice(startIndex, endIndex + 1);
            const groupIds = new Set<string | undefined>();
            
            // Collect all group IDs (parent_element_id for children, element_id for parents)
            elementsInRange.forEach(el => {
                if ((el as any).element_type === 'GROUP') {
                    groupIds.add(el.element_id);
                } else if (el.parent_element_id) {
                    groupIds.add(el.parent_element_id);
                } else {
                    groupIds.add(undefined); // Ungrouped element
                }
            });
            
            // If we have more than one group ID, we're crossing group boundaries
            if (groupIds.size > 1) {
                // Don't allow selection across groups - just select the clicked element
                setSelectedElementIds([elementId]);
                onSelectionChange?.([elementId]);
                return;
            }

            // Create selection array for adjacent elements only
            const newSelection: string[] = [];
            for (let i = startIndex; i <= endIndex; i++) {
                newSelection.push(displayElements[i].element_id);
            }

            setSelectedElementIds(newSelection);
            onSelectionChange?.(newSelection);
        }
    };
    

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
            setLocalElements(elements);
        }
    }, [elements, localElements, dragModalOpen, pendingReorder]);

    // Expose refetch function and selection state to parent via ref
    useImperativeHandle(
        ref,
        () => ({
            refetchElements,
            selectedElementIds,
            clearSelection: () => {
                setSelectedElementIds([]);
                onSelectionChange?.([]);
            },
        }),
        [refetchElements, selectedElementIds, onSelectionChange]
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

        // Use displayElements for drag calculation since that's what the user sees
        const elementsForDrag = displayElements;
        const oldIndex = elementsForDrag.findIndex(el => el.element_id === active.id);
        const overIndex = elementsForDrag.findIndex(el => el.element_id === over.id);

        if (oldIndex === -1 || overIndex === -1) {
            return;
        }

        const draggedEl = elementsForDrag[oldIndex];
        
        // Store original elements before making any changes
        setOriginalElementsBeforeDrag([...localElements]);
        
        // Create reordered elements using arrayMove
        const reorderedElements = arrayMove(elementsForDrag, oldIndex, overIndex);
        
        // Find the actual final position of the dragged element
        const newIndex = reorderedElements.findIndex(el => el.element_id === active.id);
        
        // Calculate elementAbove and elementBelow based on the POST-reorder state
        let elementAbove = null;
        let elementBelow = null;
        
        // Use the reordered elements to find neighbors
        elementAbove = newIndex > 0 ? reorderedElements[newIndex - 1] : null;
        elementBelow = newIndex < reorderedElements.length - 1 ? reorderedElements[newIndex + 1] : null;
        
        // Update localElements to match the visual reorder (this will temporarily disable sorting)
        setLocalElements(reorderedElements);
        
        const pendingReorderData = {
            oldIndex,
            newIndex,
            reorderedElements
        };
        setPendingReorder(pendingReorderData);

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

        if (elementAbove && draggedElement && onApplyLocalChange) {
            // Create UPDATE_ELEMENT operation with time offset change
            const updateElementOperation = {
                type: 'UPDATE_ELEMENT',
                element_id: draggedElement.element_id,
                changes: {
                    time_offset_ms: {
                        oldValue: draggedElement.time_offset_ms,
                        newValue: elementAbove.time_offset_ms
                    }
                },
                autoSort: autoSortCues, // Pass current auto-sort state
                description: `Updated time offset for "${draggedElement.description}" to match preceding element`
            };
            
            onApplyLocalChange(updateElementOperation);
        }
        
        closeDragModal();
    };

    const handleMatchAfter = async () => {
        await applyReorder();

        if (elementBelow && draggedElement && onApplyLocalChange) {
            // Create UPDATE_ELEMENT operation with time offset change
            const updateElementOperation = {
                type: 'UPDATE_ELEMENT',
                element_id: draggedElement.element_id,
                changes: {
                    time_offset_ms: {
                        oldValue: draggedElement.time_offset_ms,
                        newValue: elementBelow.time_offset_ms
                    }
                },
                autoSort: autoSortCues, // Pass current auto-sort state
                description: `Updated time offset for "${draggedElement.description}" to match following element`
            };
            
            onApplyLocalChange(updateElementOperation);
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
            // Calculate proper sequence values based on elements at those positions
            const elementsForSequence = displayElements;
            const draggedElementData = elementsForSequence[pendingReorderData.oldIndex];
            const oldSequence = draggedElementData?.sequence || (pendingReorderData.oldIndex + 1);
            
            
            // For new_sequence, we need to calculate what the sequence should be at the target position
            let newSequence;
            if (pendingReorderData.newIndex === 0) {
                // Moving to the beginning - sequence should be 1
                newSequence = 1;
            } else if (pendingReorderData.newIndex >= elementsForSequence.length - 1) {
                // Moving to the end - sequence should be the length of elements
                newSequence = elementsForSequence.length;
            } else {
                // Moving to middle - sequence should be based on target position
                newSequence = pendingReorderData.newIndex + 1;
            }
            
            // Create reorder operation for edit queue
            const reorderOperation = {
                type: 'REORDER',
                element_id: draggedElement?.element_id,
                old_index: pendingReorderData.oldIndex,
                new_index: pendingReorderData.newIndex,
                old_sequence: oldSequence,
                new_sequence: newSequence
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
            // Calculate proper sequence values based on elements at those positions
            const elementsForSequence = displayElements;
            const draggedElementData = elementsForSequence[pendingReorder.oldIndex];
            const oldSequence = draggedElementData?.sequence || (pendingReorder.oldIndex + 1);
            
            
            // For new_sequence, we need to calculate what the sequence should be at the target position
            let newSequence;
            if (pendingReorder.newIndex === 0) {
                // Moving to the beginning - sequence should be 1
                newSequence = 1;
            } else if (pendingReorder.newIndex >= elementsForSequence.length - 1) {
                // Moving to the end - sequence should be the length of elements
                newSequence = elementsForSequence.length;
            } else {
                // Moving to middle - sequence should be based on target position
                newSequence = pendingReorder.newIndex + 1;
            }
            
            // Create reorder operation for edit queue
            const reorderOperation = {
                type: 'REORDER',
                element_id: draggedElement?.element_id,
                old_index: pendingReorder.oldIndex,
                new_index: pendingReorder.newIndex,
                old_sequence: oldSequence,
                new_sequence: newSequence
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

        // Create a single UPDATE_ELEMENT operation with all changes  
        // Backend will handle camelCase -> snake_case translation
        const updateElementOperation = {
            type: 'UPDATE_ELEMENT',
            element_id: elementToEdit.element_id,
            changes: changes,
            autoSort: autoSortCues && changes.time_offset_ms, // Only auto-sort if time offset changed and auto-sort is enabled
            description: `Updated element "${elementToEdit.description}"`
        };
        
        onApplyLocalChange(updateElementOperation);

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

    // Create display elements with auto-sort applied when needed
    const displayElements = useMemo(() => {
        // Don't apply auto-sort during drag operations - preserve user's drop position
        if (!autoSortCues || !localElements || dragModalOpen || pendingReorder) {
            return localElements;
        }
        
        // Return sorted copy for display without modifying localElements
        return [...localElements].sort((a, b) => {
            const aOffset = a.time_offset_ms || 0;
            const bOffset = b.time_offset_ms || 0;
            return aOffset - bOffset;
        });
    }, [localElements, autoSortCues, dragModalOpen, pendingReorder]);


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
                            items={displayElements.map(el => el.element_id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <Box>
                                <VStack spacing={0} align="stretch">
                                    {displayElements.map((element, index) => {
                                        // Only show clock times if we have the required script start time
                                        const shouldShowClockTimes = showClockTimes && !!script?.start_time;
                                        return (
                                            <CueElement
                                                key={element.element_id}
                                                element={element}
                                                index={index}
                                                allElements={allElementsForGroupCalculations}
                                                colorizeDepNames={colorizeDepNames}
                                                showClockTimes={shouldShowClockTimes}
                                                scriptStartTime={script?.start_time instanceof Date ? script.start_time.toISOString() : script?.start_time}
                                                scriptEndTime={script?.end_time instanceof Date ? script.end_time.toISOString() : script?.end_time}
                                                isDragEnabled={true}
                                                isSelected={selectedElementIds.includes(element.element_id)}
                                                onSelect={(shiftKey?: boolean) => {
                                                    handleElementSelect(element.element_id, shiftKey);
                                                }}
                                                onEdit={handleEditElement}
                                                onToggleGroupCollapse={onToggleGroupCollapse}
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
        // Deliberately ignoring onAutoSortChange, onScrollStateChange, onToggleGroupCollapse, and onApplyLocalChange
    );
};

export const EditMode = React.memo(EditModeComponent, areEqual);
