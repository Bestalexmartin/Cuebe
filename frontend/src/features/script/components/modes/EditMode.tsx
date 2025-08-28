// frontend/src/features/script/components/modes/EditMode.tsx

import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { VStack, Text, Box, Flex } from '@chakra-ui/react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
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
    useMilitaryTime?: boolean;
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
    useMilitaryTime = false,
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
    const [originalElementsBeforeDrag, setOriginalElementsBeforeDrag] = useState<any[]>([]);
    const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [elementToEdit, setElementToEdit] = useState<any>(null);
    const [draggedGroupWasExpanded, setDraggedGroupWasExpanded] = useState(false);
    const [tempCollapsedGroupId, setTempCollapsedGroupId] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const lastScrollStateRef = useRef<{ isAtTop: boolean; isAtBottom: boolean; allElementsFitOnScreen: boolean } | null>(null);

    // Consolidated drag state cleanup function
    const clearDragState = useCallback(() => {
        setDraggedElement(null);
        setOriginalElementsBeforeDrag([]);
        setDraggedGroupWasExpanded(false);
        setTempCollapsedGroupId(null);
    }, []);

    // Helper functions for group selection logic
    const isGroupElement = useCallback((element: any) => {
        return (element as any).element_type === 'GROUP' || 
               (element.parent_element_id && element.group_level && element.group_level > 0);
    }, []);

    const getElementGroupId = useCallback((element: any) => {
        if ((element as any).element_type === 'GROUP') {
            return element.element_id;
        } else if (element.parent_element_id) {
            return element.parent_element_id;
        }
        return undefined; // Ungrouped element
    }, []);



    useEffect(() => {
        // Don't update localElements during drag operations - preserve the user's dropped position
        if (dragModalOpen) {
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
                return el.duration_ms !== newEl.duration_ms ||
                    el.priority !== newEl.priority ||
                    el.element_name !== newEl.element_name ||
                    el.offset_ms !== newEl.offset_ms ||
                    el.location_details !== newEl.location_details ||
                    el.cue_notes !== newEl.cue_notes ||
                    el.cue_id !== newEl.cue_id ||
                    el.department_id !== newEl.department_id ||
                    el.custom_color !== newEl.custom_color;
            });

        if (elementsChanged) {
            setLocalElements(elements);
        }
    }, [elements, localElements, dragModalOpen]);

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

    // Drag sensors with activation constraints to distinguish click from drag
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                delay: 150, // Require 150ms hold before drag starts
                tolerance: 5, // Allow 5px of movement during delay
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Handle drag start - collapse groups for visual effect
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;

        // Find the dragged element
        const draggedElement = displayElements.find(el => el.element_id === active.id);
        const isGroupParent = draggedElement && (draggedElement as any).element_type === 'GROUP';
        const isExpanded = isGroupParent && !draggedElement.is_collapsed;

        // Store the original expanded state before we modify it
        setDraggedGroupWasExpanded(isExpanded || false);

        // If it's an expanded group, collapse it for visual effect during drag
        // Use temporary state instead of edit queue to avoid triggering operations
        if (isExpanded) {
            setTempCollapsedGroupId(draggedElement.element_id);
        }
    };

    // Handle drag end
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            // Clear all drag state when no drop occurred
            clearDragState();
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
        let elementAbove: typeof reorderedElements[0] | null = null;
        let elementBelow: typeof reorderedElements[0] | null = null;

        // Use the reordered elements to find neighbors
        elementAbove = newIndex > 0 ? reorderedElements[newIndex - 1] : null;
        elementBelow = newIndex < reorderedElements.length - 1 ? reorderedElements[newIndex + 1] : null;


        // Update localElements to match the visual reorder (this will temporarily disable sorting)
        setLocalElements(reorderedElements);

        // Check if all three elements (above, dragged, below) have the same time offset
        const draggedTimeOffset = draggedEl.offset_ms;
        const aboveTimeOffset = elementAbove?.offset_ms;
        const belowTimeOffset = elementBelow?.offset_ms;

        const allHaveSameTimeOffset = (
            (elementAbove === null || aboveTimeOffset === draggedTimeOffset) &&
            (elementBelow === null || belowTimeOffset === draggedTimeOffset)
        );

        if (allHaveSameTimeOffset || !autoSortCues) {
            // Set the dragged element so applyReorder can access it
            setDraggedElement(draggedEl);
            await applyReorderDirect({ reorderedElements }, draggedEl);

            // Clear all state using consistent cleanup
            clearDragState();
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
        // Note: applyReorderDirect was already called, no need to call applyReorder again
        closeDragModal();
    };

    const handleMatchBefore = async () => {

        // Note: applyReorderDirect was already called, no need to call applyReorder again

        if (elementAbove && draggedElement && onApplyLocalChange) {
            // Create UPDATE_ELEMENT operation with time offset change
            const updateElementOperation = {
                type: 'UPDATE_ELEMENT',
                element_id: draggedElement.element_id,
                changes: {
                    offset_ms: {
                        old_value: draggedElement.offset_ms,
                        new_value: elementAbove.offset_ms
                    }
                },
                autoSort: autoSortCues, // Pass current auto-sort state
                description: `Updated time offset for "${draggedElement.element_name}" to match preceding element`
            };

            onApplyLocalChange(updateElementOperation);
        }

        closeDragModal();
    };

    const handleMatchAfter = async () => {

        // Note: applyReorderDirect was already called, no need to call applyReorder again

        if (elementBelow && draggedElement && onApplyLocalChange) {
            // Create UPDATE_ELEMENT operation with time offset change
            const updateElementOperation = {
                type: 'UPDATE_ELEMENT',
                element_id: draggedElement.element_id,
                changes: {
                    offset_ms: {
                        old_value: draggedElement.offset_ms,
                        new_value: elementBelow.offset_ms
                    }
                },
                autoSort: autoSortCues, // Pass current auto-sort state
                description: `Updated time offset for "${draggedElement.element_name}" to match following element`
            };

            onApplyLocalChange(updateElementOperation);
        }

        closeDragModal();
    };

    const handleCustomTime = async (timeMs: number) => {

        // Note: applyReorderDirect was already called, no need to call applyReorder again

        if (draggedElement && onApplyLocalChange) {
            // Create UPDATE_ELEMENT operation with custom time offset change
            const updateElementOperation = {
                type: 'UPDATE_ELEMENT',
                element_id: draggedElement.element_id,
                changes: {
                    offset_ms: {
                        old_value: draggedElement.offset_ms,
                        new_value: timeMs
                    }
                },
                autoSort: autoSortCues, // Pass current auto-sort state
                description: `Updated time offset for "${draggedElement.element_name}" to custom time`
            };

            onApplyLocalChange(updateElementOperation);
        }

        closeDragModal();
    };

    const closeDragModal = useCallback(() => {
        setDragModalOpen(false);
        setElementAbove(null);
        setElementBelow(null);
        clearDragState();
    }, [clearDragState]);

    const handleCancelDrag = () => {
        // Revert local elements back to original position before drag
        setLocalElements(originalElementsBeforeDrag);

        // Close modal and clear state
        closeDragModal();
    };

    const applyReorderDirect = async (pendingReorderData: any, draggedElement: any) => {

        // If we have edit queue functionality, use it
        if (onApplyLocalChange) {
            // Calculate sequence values based on the reordered positions
            const reorderedElements = pendingReorderData.reorderedElements;

            // Find the dragged element in the reordered array to get its new position
            const newIndex = reorderedElements.findIndex((el: any) => el.element_id === draggedElement?.element_id);
            // Get current sequence from elements prop (includes edit queue changes)
            const currentElement = elements?.find(el => el.element_id === draggedElement?.element_id);
            const oldSequence = currentElement?.sequence;

            // Two-phase operation: elements shift, then we take the target position
            // The new sequence is simply the target position (newIndex + 1)
            // Edit queue handles the shifting automatically
            const newSequence = newIndex + 1;

            // Don't create a reorder operation if the sequence isn't actually changing
            if (newSequence === oldSequence) {
                return;
            }

            // Check if this is a group parent and include children information
            const isGroupParent = draggedElement && (draggedElement as any).element_type === 'GROUP';
            let reorderOperation: any = {
                type: 'REORDER',
                element_id: draggedElement?.element_id,
                old_sequence: oldSequence,
                new_sequence: newSequence
            };

            // If dragging a group parent, include children information for backend processing
            if (isGroupParent && elements) {
                const groupChildren = elements.filter(el => el.parent_element_id === draggedElement?.element_id);
                if (groupChildren.length > 0) {
                    reorderOperation.is_group_parent = true;
                    reorderOperation.group_children = groupChildren.map(child => ({
                        element_id: child.element_id,
                        current_sequence: child.sequence
                    }));
                }

            }

            onApplyLocalChange(reorderOperation);
            return;
        }

        // This should not happen - edit queue is always available
        console.error('ERROR - Edit queue not available for reorder operation');

    };



    // Handle element edit
    const handleEditElement = (element: any) => {
        setElementToEdit(element);
        setEditModalOpen(true);
    };

    // Handle element edit modal save
    const handleElementEditSave = (changes: Record<string, { old_value: any; new_value: any }>) => {
        if (!elementToEdit || !onApplyLocalChange) return;

        // Create a single UPDATE_ELEMENT operation with all changes  
        // Backend will handle camelCase -> snake_case translation
        const updateElementOperation = {
            type: 'UPDATE_ELEMENT',
            element_id: elementToEdit.element_id,
            changes: changes,
            autoSort: autoSortCues && changes.offset_ms, // Only auto-sort if time offset changed and auto-sort is enabled
            description: `Updated element "${elementToEdit.element_name}"`
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
        if (!localElements) return [];

        let elementsToDisplay = localElements;

        // Filter out children of temporarily collapsed groups during drag
        if (tempCollapsedGroupId) {
            elementsToDisplay = localElements.filter(element =>
                element.parent_element_id !== tempCollapsedGroupId
            );
        }

        // Don't apply auto-sort during drag operations - preserve user's drop position
        if (!autoSortCues || dragModalOpen) {
            return elementsToDisplay;
        }

        // Return sorted copy for display
        return [...elementsToDisplay].sort((a, b) => {
            return a.offset_ms - b.offset_ms;
        });
    }, [localElements, autoSortCues, dragModalOpen, tempCollapsedGroupId]);

    const canSelectRange = useCallback((startIndex: number, endIndex: number) => {
        const elementsInRange = displayElements.slice(startIndex, endIndex + 1);
        const groupIds = new Set<string | undefined>();

        elementsInRange.forEach(el => {
            groupIds.add(getElementGroupId(el));
        });

        // Allow selection only within single group or all ungrouped
        return groupIds.size <= 1;
    }, [displayElements, getElementGroupId]);

    // Helper function to handle element selection with shift-click support
    const handleElementSelect = useCallback((elementId: string, shiftKey: boolean = false) => {
        if (!shiftKey) {
            // Regular click - single selection or deselection
            const newSelection = selectedElementIds.includes(elementId) ? [] : [elementId];
            setSelectedElementIds(newSelection);
            onSelectionChange?.(newSelection);
            return;
        }

        // Shift-click - select adjacent range
        if (selectedElementIds.length === 0) {
            setSelectedElementIds([elementId]);
            onSelectionChange?.([elementId]);
            return;
        }

        const clickedIndex = displayElements.findIndex(el => el.element_id === elementId);
        if (clickedIndex === -1) return;

        // Check if any currently selected or clicked element is part of a group
        const selectedElements = displayElements.filter(el => selectedElementIds.includes(el.element_id));
        const clickedElement = displayElements.find(el => el.element_id === elementId);
        
        if (!clickedElement) return;

        const hasGroupElements = [...selectedElements, clickedElement].some(isGroupElement);
        
        if (hasGroupElements) {
            // Restrict to single selection for group elements
            setSelectedElementIds([elementId]);
            onSelectionChange?.([elementId]);
            return;
        }

        // Calculate selection range
        const selectedIndices = selectedElementIds
            .map(id => displayElements.findIndex(el => el.element_id === id))
            .filter(index => index !== -1)
            .sort((a, b) => a - b);

        if (selectedIndices.length === 0) return;

        const minSelected = selectedIndices[0];
        const maxSelected = selectedIndices[selectedIndices.length - 1];

        let startIndex: number, endIndex: number;
        if (clickedIndex < minSelected) {
            startIndex = clickedIndex;
            endIndex = maxSelected;
        } else if (clickedIndex > maxSelected) {
            startIndex = minSelected;
            endIndex = clickedIndex;
        } else {
            // Within existing range - contract to clicked element
            if (clickedIndex - minSelected < maxSelected - clickedIndex) {
                startIndex = clickedIndex;
                endIndex = maxSelected;
            } else {
                startIndex = minSelected;
                endIndex = clickedIndex;
            }
        }

        // Verify we can select this range (no group boundary crossing)
        if (!canSelectRange(startIndex, endIndex)) {
            setSelectedElementIds([elementId]);
            onSelectionChange?.([elementId]);
            return;
        }

        // Create the new selection
        const newSelection = displayElements
            .slice(startIndex, endIndex + 1)
            .map(el => el.element_id);

        setSelectedElementIds(newSelection);
        onSelectionChange?.(newSelection);
    }, [displayElements, selectedElementIds, onSelectionChange, isGroupElement, canSelectRange]);

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
                    <Flex justify="center" align="center" height="200px" direction="column" gap={4}>
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
                        onDragStart={handleDragStart}
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
                                                key={`${element.element_id}-${index}`}
                                                element={element}
                                                index={index}
                                                allElements={allElementsForGroupCalculations}
                                                colorizeDepNames={colorizeDepNames}
                                                showClockTimes={shouldShowClockTimes}
                                                useMilitaryTime={useMilitaryTime}
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
                onCustomTime={handleCustomTime}
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
        prevProps.useMilitaryTime === nextProps.useMilitaryTime &&
        prevProps.elements === nextProps.elements &&
        prevProps.script === nextProps.script
        // Deliberately ignoring onAutoSortChange, onScrollStateChange, onToggleGroupCollapse, and onApplyLocalChange
    );
};

export const EditMode = React.memo(EditModeComponent, areEqual);
