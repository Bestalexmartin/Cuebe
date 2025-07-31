// frontend/src/pages/script/components/modes/EditMode.tsx

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
import { useScript } from '../../../../hooks/useScript';
import { useAuth } from '@clerk/clerk-react';
import { CueElement } from '../CueElement';
import { ScriptElementsHeader } from '../ScriptElementsHeader';
import { DragReorderModal } from '../modals/DragReorderModal';

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
    // Edit queue props
    elements?: any[];
    onApplyLocalChange?: (operation: any) => void;
}

export interface EditModeRef {
    refetchElements: () => Promise<void>;
    selectedElementId: string | null;
    clearSelection: () => void;
}

export const EditMode = forwardRef<EditModeRef, EditModeProps>(({
    scriptId,
    colorizeDepNames = false,
    showClockTimes = false,
    autoSortCues = false,
    onAutoSortChange,
    onScrollStateChange,
    elements: externalElements,
    onApplyLocalChange
}, ref) => {
    // Use external elements if provided (from edit queue), otherwise fallback to direct hook
    const { elements: serverElements, isLoading, error, refetchElements } = useScriptElements(scriptId);
    const { script } = useScript(scriptId);
    const { getToken } = useAuth();

    const elements = externalElements || serverElements;
    const [localElements, setLocalElements] = useState(elements);
    const [dragModalOpen, setDragModalOpen] = useState(false);
    const [draggedElement, setDraggedElement] = useState<any>(null);
    const [elementAbove, setElementAbove] = useState<any>(null);
    const [elementBelow, setElementBelow] = useState<any>(null);
    const [pendingReorder, setPendingReorder] = useState<any>(null);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    

    useEffect(() => {
        setLocalElements(elements);
    }, [elements]);

    // Expose refetch function and selection state to parent via ref
    useImperativeHandle(ref, () => ({
        refetchElements,
        selectedElementId,
        clearSelection: () => setSelectedElementId(null)
    }), [refetchElements, selectedElementId]);

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

        const oldIndex = localElements.findIndex(el => el.elementID === active.id);
        const newIndex = localElements.findIndex(el => el.elementID === over.id);


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

        localElements.forEach((el, idx) => {
            let marker = '';
            if (idx === oldIndex) marker = ' <- DRAGGED';
            else if (elementAbove && el.elementID === elementAbove.elementID) marker = ' <- WILL BE ABOVE';
            else if (elementBelow && el.elementID === elementBelow.elementID) marker = ' <- WILL BE BELOW';
        });


            id: draggedEl.elementID,
            description: draggedEl.description,
            timeOffsetMs: draggedEl.timeOffsetMs
        });
            id: elementAbove.elementID,
            description: elementAbove.description,
            timeOffsetMs: elementAbove.timeOffsetMs
        } : 'null (moved to top)');
            id: elementBelow.elementID,
            description: elementBelow.description,
            timeOffsetMs: elementBelow.timeOffsetMs
        } : 'null (moved to bottom)');

        const reorderedElements = arrayMove(localElements, oldIndex, newIndex);
        
        reorderedElements.forEach((el, idx) => {
            const marker = el.elementID === draggedEl.elementID ? ' <- DRAGGED (now here)' : '';
        });
        
        const pendingReorderData = {
            oldIndex,
            newIndex,
            reorderedElements
        };
        setPendingReorder(pendingReorderData);

        setLocalElements(reorderedElements);

        // Check if all three elements (above, dragged, below) have the same time offset
        const draggedTimeOffset = draggedEl.timeOffsetMs;
        const aboveTimeOffset = elementAbove?.timeOffsetMs;
        const belowTimeOffset = elementBelow?.timeOffsetMs;
        
        
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
            id: draggedElement?.elementID,
            description: draggedElement?.description,
            timeOffsetMs: draggedElement?.timeOffsetMs
        });
            id: elementAbove.elementID,
            description: elementAbove.description,
            timeOffsetMs: elementAbove.timeOffsetMs
        } : 'null');
        
        // Debug: Let's also check the current localElements state
        localElements.forEach((el, idx) => {
        });
        
        // Debug: Check if elementAbove reference is stale
        if (elementAbove && draggedElement) {
            const currentElementAbove = localElements.find(el => el.elementID === elementAbove.elementID);
                id: elementAbove.elementID,
                timeOffsetMs: elementAbove.timeOffsetMs,
                description: elementAbove.description
            });
                id: currentElementAbove.elementID,
                timeOffsetMs: currentElementAbove.timeOffsetMs,
                description: currentElementAbove.description
            } : 'NOT FOUND');
        }
        
        await applyReorder();

        if (elementAbove && draggedElement) {
            await updateElementTimeOffset(draggedElement.elementID, elementAbove.timeOffsetMs);
        } else {
        }
        
        closeDragModal();
    };

    const handleMatchAfter = async () => {
        
        await applyReorder();

        if (elementBelow && draggedElement) {
            await updateElementTimeOffset(draggedElement.elementID, elementBelow.timeOffsetMs);
        } else {
        }
        
        closeDragModal();
    };

    const closeDragModal = () => {
        setDragModalOpen(false);
        setDraggedElement(null);
        setElementAbove(null);
        setElementBelow(null);
        setPendingReorder(null);
    };

    const handleCancelDrag = () => {
        
        // Revert local elements back to server state
        setLocalElements(elements);
        
        // Close modal and clear state
        closeDragModal();
        
    };

    const applyReorderDirect = async (pendingReorderData: any, draggedElement: any) => {

        // If we have edit queue functionality, use it
        if (onApplyLocalChange) {
            // Create reorder operation for edit queue
            const reorderOperation = {
                type: 'REORDER',
                elementId: draggedElement?.elementID,
                oldIndex: pendingReorderData.oldIndex,
                newIndex: pendingReorderData.newIndex,
                oldSequence: pendingReorderData.oldIndex + 1,
                newSequence: pendingReorderData.newIndex + 1
            };
            
            onApplyLocalChange(reorderOperation);
            return;
        }

        // Fallback to direct API call for backward compatibility
        try {
            const token = await getToken();
            if (!token) return;

            // Create reorder data
            const reorderData = {
                elements: pendingReorderData.reorderedElements.map((el: any, index: number) => ({
                    elementID: el.elementID,
                    sequence: index + 1
                }))
            };

            const response = await fetch(`/api/scripts/${scriptId}/elements/reorder`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reorderData)
            });

            if (!response.ok) {
                console.error('Failed to reorder elements');
                setLocalElements(elements);
            }
        } catch (error) {
            console.error('Error reordering elements:', error);
        }
        
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
                elementId: draggedElement?.elementID,
                oldIndex: pendingReorder.oldIndex,
                newIndex: pendingReorder.newIndex,
                oldSequence: pendingReorder.oldIndex + 1,
                newSequence: pendingReorder.newIndex + 1
            };
            
            onApplyLocalChange(reorderOperation);
            return;
        }

        // Fallback to direct API call for backward compatibility
        try {
            const token = await getToken();
            if (!token) return;

            // Create reorder data
            const reorderData = {
                elements: pendingReorder.reorderedElements.map((el: any, index: number) => ({
                    elementID: el.elementID,
                    sequence: index + 1
                }))
            };

            const response = await fetch(`/api/scripts/${scriptId}/elements/reorder`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reorderData)
            });

            if (!response.ok) {
                console.error('Failed to reorder elements');
                setLocalElements(elements);
            }
        } catch (error) {
            console.error('Error reordering elements:', error);
        }
    };

    const updateElementTimeOffset = async (elementId: string, newTimeOffsetMs: number) => {
        
        // Find the element to get old value
        const element = localElements.find(el => el.elementID === elementId);
        const oldTimeOffsetMs = element?.timeOffsetMs || 0;
        
        // If we have edit queue functionality, use it
        if (onApplyLocalChange) {
            const timeOffsetOperation = {
                type: 'UPDATE_TIME_OFFSET',
                elementId: elementId,
                oldTimeOffsetMs: oldTimeOffsetMs,
                newTimeOffsetMs: newTimeOffsetMs
            };
            
            onApplyLocalChange(timeOffsetOperation);
            return;
        }

        // Fallback to direct API call for backward compatibility
        try {
            const token = await getToken();
            if (!token) {
                return;
            }

            const updateData = {
                timeOffsetMs: newTimeOffsetMs
            };
            

            const response = await fetch(`/api/elements/${elementId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });


            if (response.ok) {
                setLocalElements(prevElements => {
                    const updatedElements = prevElements.map(el =>
                        el.elementID === elementId
                            ? { ...el, timeOffsetMs: newTimeOffsetMs }
                            : el
                    );
                        updatedElements.find(el => el.elementID === elementId));
                    return updatedElements;
                });
            } else {
                const errorText = await response.text();
                console.error('Failed to update element time offset. Status:', response.status);
                console.error('Error response:', errorText);
            }
        } catch (error) {
            console.error('Error updating element time offset:', error);
        }
        
    };

    // Function to check scroll state
    const checkScrollState = () => {
        if (!scrollContainerRef.current || !onScrollStateChange) return;
        
        const container = scrollContainerRef.current;
        const { scrollTop, scrollHeight, clientHeight } = container;
        
        const isAtTop = scrollTop <= 1; // Allow for 1px tolerance
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1; // Allow for 1px tolerance
        const allElementsFitOnScreen = scrollHeight <= clientHeight;
        
        onScrollStateChange({
            isAtTop,
            isAtBottom,
            allElementsFitOnScreen
        });
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
                            items={localElements.map(el => el.elementID)}
                            strategy={verticalListSortingStrategy}
                        >
                            <Box>
                                <VStack spacing={0} align="stretch">
                                    {localElements.map((element, index) => (
                                        <CueElement
                                            key={element.elementID}
                                            element={element}
                                            index={index}
                                            allElements={localElements}
                                            colorizeDepNames={colorizeDepNames}
                                            showClockTimes={showClockTimes}
                                            scriptStartTime={script?.startTime}
                                            scriptEndTime={script?.endTime}
                                            isDragEnabled={true}
                                            isSelected={selectedElementId === element.elementID}
                                            onSelect={() => {
                                                if (selectedElementId === element.elementID) {
                                                    setSelectedElementId(null); // Deselect if already selected
                                                } else {
                                                    setSelectedElementId(element.elementID); // Select if not selected
                                                }
                                            }}
                                        />
                                    ))}
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
        </VStack>
    );
});