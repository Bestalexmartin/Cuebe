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
    const [currentDragId, setCurrentDragId] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const lastScrollStateRef = useRef<{ isAtTop: boolean; isAtBottom: boolean; allElementsFitOnScreen: boolean } | null>(null);

    // Debug: Monitor localElements changes to detect unwanted overrides
    useEffect(() => {
        console.log("🔥 LOCAL ELEMENTS CHANGED", {
            timestamp: Date.now(),
            elementCount: localElements?.length || 0,
            elementOrder: localElements?.map((el, idx) => ({
                index: idx,
                id: el.element_id,
                name: el.element_name,
                sequence: el.sequence
            })) || [],
            stackTrace: new Error().stack?.split('\n').slice(1, 4).join(' | ')
        });
    }, [localElements]);

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
            console.log("🔥 ELEMENTS PROP CHANGED - Overriding localElements", {
                reason: "elements prop changed",
                isDragModalOpen: dragModalOpen,
                oldElementsCount: localElements?.length || 0,
                newElementsCount: elements?.length || 0,
                oldElementOrder: localElements?.map(el => ({ id: el.element_id, name: el.element_name, sequence: el.sequence })) || [],
                newElementOrder: elements?.map(el => ({ id: el.element_id, name: el.element_name, sequence: el.sequence })) || [],
                stackTrace: new Error().stack?.split('\n').slice(1, 4).join(' | ')
            });
            setLocalElements(elements);
        } else {
            console.log("🔥 ELEMENTS PROP UPDATE SKIPPED - No changes detected", {
                isDragModalOpen: dragModalOpen,
                elementsCount: elements?.length || 0
            });
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
                delay: 80, // Require 100ms hold before drag starts
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

        // Generate unique drag ID for tracking
        const dragId = `drag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setCurrentDragId(dragId);

        // Find the dragged element
        const draggedElement = displayElements.find(el => el.element_id === active.id);
        const isGroupParent = draggedElement && (draggedElement as any).element_type === 'GROUP';
        const isExpanded = isGroupParent && !draggedElement.is_collapsed;

        console.log("🔥 DRAG START", {
            dragId,
            elementId: active.id,
            elementName: draggedElement?.element_name,
            elementType: (draggedElement as any)?.element_type,
            sequence: draggedElement?.sequence,
            offsetMs: draggedElement?.offset_ms,
            isGroup: isGroupParent,
            isExpanded,
            totalDisplayElements: displayElements.length,
            autoSortEnabled: autoSortCues
        });

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

        console.log("🔥 DRAG END", {
            dragId: currentDragId,
            activeId: active.id,
            overId: over?.id,
            samePosition: active.id === over?.id,
            hasOverTarget: !!over
        });

        if (!over || active.id === over.id) {
            console.log("🔥 DRAG CANCELLED - No drop target or same position", {
                dragId: currentDragId
            });
            // Clear temporary visual collapse state
            setTempCollapsedGroupId(null);
            setDraggedGroupWasExpanded(false);
            setCurrentDragId(null); // Clear drag ID when cancelled
            return;
        }

        // Use displayElements for drag calculation since that's what the user sees
        const elementsForDrag = displayElements;
        const oldIndex = elementsForDrag.findIndex(el => el.element_id === active.id);
        const overIndex = elementsForDrag.findIndex(el => el.element_id === over.id);

        console.log("🔥 DRAG INDICES", {
            oldIndex,
            overIndex,
            totalElements: elementsForDrag.length,
            validIndices: oldIndex !== -1 && overIndex !== -1
        });

        if (oldIndex === -1 || overIndex === -1) {
            console.log("🔥 DRAG FAILED - Invalid indices");
            return;
        }

        const draggedEl = elementsForDrag[oldIndex];
        console.log("🔥 DRAGGED ELEMENT", {
            elementId: draggedEl.element_id,
            elementName: draggedEl.element_name,
            currentSequence: draggedEl.sequence,
            currentOffsetMs: draggedEl.offset_ms,
            fromIndex: oldIndex,
            toIndex: overIndex
        });

        // Store original elements before making any changes
        setOriginalElementsBeforeDrag([...localElements]);

        // Create reordered elements using arrayMove
        const reorderedElements = arrayMove(elementsForDrag, oldIndex, overIndex);

        // Find the actual final position of the dragged element
        const newIndex = reorderedElements.findIndex(el => el.element_id === active.id);

        console.log("🔥 ARRAY MOVE RESULT", {
            oldIndex,
            overIndex,
            newIndex,
            elementMovedToCorrectPosition: newIndex === overIndex
        });

        // Calculate elementAbove and elementBelow based on the POST-reorder state
        let elementAbove: typeof reorderedElements[0] | null = null;
        let elementBelow: typeof reorderedElements[0] | null = null;

        // Use the reordered elements to find neighbors
        elementAbove = newIndex > 0 ? reorderedElements[newIndex - 1] : null;
        elementBelow = newIndex < reorderedElements.length - 1 ? reorderedElements[newIndex + 1] : null;

        console.log("🔥 NEIGHBOR ELEMENTS", {
            elementAbove: elementAbove ? {
                id: elementAbove.element_id,
                name: elementAbove.element_name,
                offsetMs: elementAbove.offset_ms
            } : null,
            elementBelow: elementBelow ? {
                id: elementBelow.element_id,
                name: elementBelow.element_name,
                offsetMs: elementBelow.offset_ms
            } : null
        });

        // Update localElements to match the visual reorder (this will temporarily disable sorting)
        console.log("🔥 UPDATING LOCAL ELEMENTS - Setting visual state", {
            beforeUpdate: localElements.length,
            afterUpdate: reorderedElements.length,
            draggedElementNewPosition: reorderedElements.findIndex(el => el.element_id === active.id),
            newElementOrder: reorderedElements.map((el, idx) => ({
                index: idx,
                id: el.element_id,
                name: el.element_name
            }))
        });
        setLocalElements(reorderedElements);

        // Check if all three elements (above, dragged, below) have the same time offset
        const draggedTimeOffset = draggedEl.offset_ms;
        const aboveTimeOffset = elementAbove?.offset_ms;
        const belowTimeOffset = elementBelow?.offset_ms;

        const allHaveSameTimeOffset = (
            (elementAbove === null || aboveTimeOffset === draggedTimeOffset) &&
            (elementBelow === null || belowTimeOffset === draggedTimeOffset)
        );

        console.log("🔥 TIME OFFSET ANALYSIS", {
            draggedTimeOffset,
            aboveTimeOffset: aboveTimeOffset ?? 'N/A',
            belowTimeOffset: belowTimeOffset ?? 'N/A',
            allHaveSameTimeOffset,
            autoSortEnabled: autoSortCues,
            willProceedDirectly: allHaveSameTimeOffset || !autoSortCues,
            willShowModal: !allHaveSameTimeOffset && autoSortCues
        });

        if (allHaveSameTimeOffset || !autoSortCues) {
            console.log("🔥 PROCEEDING WITH DIRECT REORDER");
            // Set the dragged element so applyReorder can access it
            setDraggedElement(draggedEl);
            await applyReorderDirect({ reorderedElements }, draggedEl);

            // Clear all state like the modal handlers do
            console.log("🔥 DRAG CLEANUP - Clearing drag state", {
                beforeCleanup: {
                    draggedElement: !!draggedElement,
                    originalElementsCount: originalElementsBeforeDrag.length,
                    tempCollapsedGroupId: tempCollapsedGroupId
                },
                localElementsAfterDrag: localElements?.map(el => ({ 
                    id: el.element_id, 
                    name: el.element_name, 
                    sequence: el.sequence 
                }))
            });
            
            setDraggedElement(null);
            setOriginalElementsBeforeDrag([]);
            setDraggedGroupWasExpanded(false);

            // Delay clearing temp collapsed state to prevent visual jump
            setTimeout(() => {
                console.log("🔥 DRAG CLEANUP - Clearing temp collapsed state");
                setTempCollapsedGroupId(null);
            }, 100);
            console.log("🔥 DIRECT REORDER COMPLETED", {
                dragId: currentDragId
            });
            setCurrentDragId(null); // Clear drag ID when operation completes
            return;
        }

        console.log("🔥 SHOWING DRAG MODAL - Time conflicts detected");
        // Set modal data for cases where time offsets differ
        setDraggedElement(draggedEl);
        setElementAbove(elementAbove);
        setElementBelow(elementBelow);
        setDragModalOpen(true);
    };

    // Handle modal choices
    const handleDisableAutoSort = async () => {
        console.log("🔥 MODAL CHOICE - Disable Auto Sort", {
            willDisableAutoSort: !!onAutoSortChange
        });
        
        if (onAutoSortChange) {
            onAutoSortChange(false);
        }
        // Note: applyReorderDirect was already called, no need to call applyReorder again
        closeDragModal();
    };

    const handleMatchBefore = async () => {
        console.log("🔥 MODAL CHOICE - Match Before", {
            hasElementAbove: !!elementAbove,
            elementAbove: elementAbove ? {
                id: elementAbove.element_id,
                name: elementAbove.element_name,
                offsetMs: elementAbove.offset_ms
            } : null,
            draggedElement: draggedElement ? {
                id: draggedElement.element_id,
                name: draggedElement.element_name,
                currentOffsetMs: draggedElement.offset_ms
            } : null
        });

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

            console.log("🔥 SUBMITTING TIME OFFSET UPDATE - Match Before", updateElementOperation);
            onApplyLocalChange(updateElementOperation);
        }

        closeDragModal();
    };

    const handleMatchAfter = async () => {
        console.log("🔥 MODAL CHOICE - Match After", {
            hasElementBelow: !!elementBelow,
            elementBelow: elementBelow ? {
                id: elementBelow.element_id,
                name: elementBelow.element_name,
                offsetMs: elementBelow.offset_ms
            } : null,
            draggedElement: draggedElement ? {
                id: draggedElement.element_id,
                name: draggedElement.element_name,
                currentOffsetMs: draggedElement.offset_ms
            } : null
        });

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

            console.log("🔥 SUBMITTING TIME OFFSET UPDATE - Match After", updateElementOperation);
            onApplyLocalChange(updateElementOperation);
        }

        closeDragModal();
    };

    const handleCustomTime = async (timeMs: number) => {
        console.log("🔥 MODAL CHOICE - Custom Time", {
            customTimeMs: timeMs,
            draggedElement: draggedElement ? {
                id: draggedElement.element_id,
                name: draggedElement.element_name,
                currentOffsetMs: draggedElement.offset_ms
            } : null
        });

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

            console.log("🔥 SUBMITTING TIME OFFSET UPDATE - Custom Time", updateElementOperation);
            onApplyLocalChange(updateElementOperation);
        }

        closeDragModal();
    };

    const closeDragModal = () => {
        setDragModalOpen(false);
        setDraggedElement(null);
        setElementAbove(null);
        setElementBelow(null);
        setOriginalElementsBeforeDrag([]);
        setDraggedGroupWasExpanded(false);
        setTempCollapsedGroupId(null);
    };

    const handleCancelDrag = () => {
        // Revert local elements back to original position before drag
        setLocalElements(originalElementsBeforeDrag);

        // Close modal and clear state
        closeDragModal();
    };

    const applyReorderDirect = async (pendingReorderData: any, draggedElement: any) => {
        console.log("🔥 APPLY REORDER DIRECT - START", {
            dragId: currentDragId,
            elementId: draggedElement?.element_id,
            elementName: draggedElement?.element_name,
            hasEditQueue: !!onApplyLocalChange
        });

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

            console.log("🔥 SEQUENCE CALCULATION", {
                newIndex,
                oldSequence,
                newSequence,
                sequenceChanged: newSequence !== oldSequence,
                currentElementExists: !!currentElement,
                reorderedElementsCount: reorderedElements.length
            });

            // Don't create a reorder operation if the sequence isn't actually changing
            if (newSequence === oldSequence) {
                console.log("🔥 REORDER SKIPPED - Sequence unchanged");
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
                
                console.log("🔥 GROUP REORDER", {
                    isGroupParent,
                    childrenCount: groupChildren.length,
                    groupChildren: groupChildren.map(child => ({
                        id: child.element_id,
                        name: child.element_name,
                        sequence: child.sequence
                    }))
                });
            }

            console.log("🔥 SUBMITTING REORDER OPERATION", {
                dragId: currentDragId,
                operation: reorderOperation,
                isGroup: isGroupParent,
                hasChildren: reorderOperation.group_children?.length > 0
            });

            onApplyLocalChange(reorderOperation);
            console.log("🔥 REORDER OPERATION SUBMITTED TO EDIT QUEUE", {
                dragId: currentDragId
            });
            return;
        }

        // This should not happen - edit queue is always available
        console.error('🔥 ERROR - Edit queue not available for reorder operation');

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
    }, [localElements, autoSortCues, dragModalOpen, draggedGroupWasExpanded, tempCollapsedGroupId, localElements?.map(el => el.sequence).join(',')]);


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
