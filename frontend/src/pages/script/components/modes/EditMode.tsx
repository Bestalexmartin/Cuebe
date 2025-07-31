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
        console.log('=== DRAG END STARTED ===');
        const { active, over } = event;

        console.log('Active element ID:', active.id);
        console.log('Over element ID:', over?.id);

        if (!over || active.id === over.id) {
            console.log('No valid drop target or dropped on self, aborting');
            return;
        }

        const oldIndex = localElements.findIndex(el => el.elementID === active.id);
        const newIndex = localElements.findIndex(el => el.elementID === over.id);

        console.log('Old index:', oldIndex, 'New index:', newIndex);

        if (oldIndex === -1 || newIndex === -1) {
            console.log('Could not find element indices, aborting');
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

        console.log('=== DEBUG: Pre-reorder localElements state ===');
        localElements.forEach((el, idx) => {
            let marker = '';
            if (idx === oldIndex) marker = ' <- DRAGGED';
            else if (elementAbove && el.elementID === elementAbove.elementID) marker = ' <- WILL BE ABOVE';
            else if (elementBelow && el.elementID === elementBelow.elementID) marker = ' <- WILL BE BELOW';
            console.log(`  [${idx}] ${el.elementID.slice(-6)} - "${el.description}" - ${el.timeOffsetMs}ms${marker}`);
        });

        console.log('Index calculations:');
        console.log('  oldIndex:', oldIndex, '(dragged element)');
        console.log('  newIndex:', newIndex, '(drop target)');
        console.log('  Direction:', oldIndex < newIndex ? 'DOWN' : 'UP');
        console.log('  elementAbove:', elementAbove ? `${elementAbove.elementID.slice(-6)} (${elementAbove.timeOffsetMs}ms)` : 'null');
        console.log('  elementBelow:', elementBelow ? `${elementBelow.elementID.slice(-6)} (${elementBelow.timeOffsetMs}ms)` : 'null');

        console.log('Dragged element:', {
            id: draggedEl.elementID,
            description: draggedEl.description,
            timeOffsetMs: draggedEl.timeOffsetMs
        });
        console.log('Element above:', elementAbove ? {
            id: elementAbove.elementID,
            description: elementAbove.description,
            timeOffsetMs: elementAbove.timeOffsetMs
        } : 'null (moved to top)');
        console.log('Element below:', elementBelow ? {
            id: elementBelow.elementID,
            description: elementBelow.description,
            timeOffsetMs: elementBelow.timeOffsetMs
        } : 'null (moved to bottom)');

        const reorderedElements = arrayMove(localElements, oldIndex, newIndex);
        
        console.log('=== DEBUG: Post-reorder elements state ===');
        reorderedElements.forEach((el, idx) => {
            const marker = el.elementID === draggedEl.elementID ? ' <- DRAGGED (now here)' : '';
            console.log(`  [${idx}] ${el.elementID.slice(-6)} - "${el.description}" - ${el.timeOffsetMs}ms${marker}`);
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
        
        console.log('Time offset comparison:');
        console.log('  Dragged:', draggedTimeOffset + 'ms');
        console.log('  Above:', aboveTimeOffset !== undefined ? aboveTimeOffset + 'ms' : 'n/a');
        console.log('  Below:', belowTimeOffset !== undefined ? belowTimeOffset + 'ms' : 'n/a');
        
        const allHaveSameTimeOffset = (
            (elementAbove === null || aboveTimeOffset === draggedTimeOffset) &&
            (elementBelow === null || belowTimeOffset === draggedTimeOffset)
        );

        console.log('All have same time offset:', allHaveSameTimeOffset);
        console.log('Logic breakdown:');
        console.log('  Above check:', elementAbove === null ? 'null (pass)' : `${aboveTimeOffset} === ${draggedTimeOffset} = ${aboveTimeOffset === draggedTimeOffset}`);
        console.log('  Below check:', elementBelow === null ? 'null (pass)' : `${belowTimeOffset} === ${draggedTimeOffset} = ${belowTimeOffset === draggedTimeOffset}`);

        // Check if auto-sort is currently enabled
        console.log('Auto-sort currently enabled:', autoSortCues);
        
        if (allHaveSameTimeOffset || !autoSortCues) {
            const reason = allHaveSameTimeOffset ? 'All elements have same time offset' : 'Auto-sort is disabled';
            console.log(`AUTO-APPLYING: ${reason}, applying reorder without modal`);
            // Set the dragged element so applyReorder can access it
            setDraggedElement(draggedEl);
            await applyReorderDirect(pendingReorderData, draggedEl);
            // Clear all state like the modal handlers do
            setDraggedElement(null);
            setPendingReorder(null);
            console.log('=== DRAG END COMPLETED (AUTO-APPLIED) ===');
            return;
        }

        console.log('SHOWING MODAL: Time offsets differ and auto-sort is enabled, showing reorder modal');
        // Set modal data for cases where time offsets differ
        setDraggedElement(draggedEl);
        setElementAbove(elementAbove);
        setElementBelow(elementBelow);
        setDragModalOpen(true);
        console.log('=== DRAG END COMPLETED (MODAL SHOWN) ===');
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
        console.log('=== MATCH BEFORE STARTED ===');
        console.log('Dragged element:', {
            id: draggedElement?.elementID,
            description: draggedElement?.description,
            timeOffsetMs: draggedElement?.timeOffsetMs
        });
        console.log('Element above:', elementAbove ? {
            id: elementAbove.elementID,
            description: elementAbove.description,
            timeOffsetMs: elementAbove.timeOffsetMs
        } : 'null');
        
        // Debug: Let's also check the current localElements state
        console.log('=== DEBUG: Current localElements state ===');
        localElements.forEach((el, idx) => {
            console.log(`  [${idx}] ${el.elementID.slice(-6)} - "${el.description}" - ${el.timeOffsetMs}ms`);
        });
        
        // Debug: Check if elementAbove reference is stale
        if (elementAbove && draggedElement) {
            const currentElementAbove = localElements.find(el => el.elementID === elementAbove.elementID);
            console.log('=== DEBUG: Element above reference check ===');
            console.log('  elementAbove (from state):', {
                id: elementAbove.elementID,
                timeOffsetMs: elementAbove.timeOffsetMs,
                description: elementAbove.description
            });
            console.log('  currentElementAbove (from localElements):', currentElementAbove ? {
                id: currentElementAbove.elementID,
                timeOffsetMs: currentElementAbove.timeOffsetMs,
                description: currentElementAbove.description
            } : 'NOT FOUND');
        }
        
        await applyReorder();

        if (elementAbove && draggedElement) {
            console.log(`Updating element ${draggedElement.elementID} time offset from ${draggedElement.timeOffsetMs}ms to ${elementAbove.timeOffsetMs}ms`);
            console.log('Target time offset (elementAbove.timeOffsetMs):', elementAbove.timeOffsetMs);
            await updateElementTimeOffset(draggedElement.elementID, elementAbove.timeOffsetMs);
        } else {
            console.log('Missing data for match before:', { elementAbove, draggedElement });
        }
        
        console.log('=== MATCH BEFORE COMPLETED ===');
        closeDragModal();
    };

    const handleMatchAfter = async () => {
        console.log('=== MATCH AFTER STARTED ===');
        console.log('Dragged element:', draggedElement);
        console.log('Element below:', elementBelow);
        
        await applyReorder();

        if (elementBelow && draggedElement) {
            console.log(`Updating element ${draggedElement.elementID} time offset from ${draggedElement.timeOffsetMs}ms to ${elementBelow.timeOffsetMs}ms`);
            await updateElementTimeOffset(draggedElement.elementID, elementBelow.timeOffsetMs);
        } else {
            console.log('Missing data for match after:', { elementBelow, draggedElement });
        }
        
        console.log('=== MATCH AFTER COMPLETED ===');
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
        console.log('=== CANCEL DRAG STARTED ===');
        console.log('Reverting elements back to server state');
        
        // Revert local elements back to server state
        setLocalElements(elements);
        
        // Close modal and clear state
        closeDragModal();
        
        console.log('=== CANCEL DRAG COMPLETED ===');
    };

    const applyReorderDirect = async (pendingReorderData: any, draggedElement: any) => {
        console.log('--- applyReorderDirect started ---');
        console.log('Pending reorder data:', pendingReorderData);

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
            
            console.log('Applying reorder operation to edit queue:', reorderOperation);
            onApplyLocalChange(reorderOperation);
            console.log('--- applyReorderDirect completed (edit queue) ---');
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
        
        console.log('--- applyReorderDirect completed (API) ---');
    };

    const applyReorder = async () => {
        console.log('--- applyReorder started ---');
        if (!pendingReorder) {
            console.log('No pending reorder, aborting');
            return;
        }

        console.log('Pending reorder:', pendingReorder);

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
            
            console.log('Applying reorder operation to edit queue:', reorderOperation);
            onApplyLocalChange(reorderOperation);
            console.log('--- applyReorder completed (edit queue) ---');
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
        console.log('--- updateElementTimeOffset started ---');
        console.log('Element ID:', elementId);
        console.log('New time offset (ms):', newTimeOffsetMs);
        
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
                console.log('ERROR: No authentication token available');
                return;
            }

            const updateData = {
                timeOffsetMs: newTimeOffsetMs
            };
            
            console.log('Update data being sent:', updateData);
            console.log('API endpoint:', `/api/elements/${elementId}`);

            const response = await fetch(`/api/elements/${elementId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (response.ok) {
                console.log('API call successful, updating local elements...');
                setLocalElements(prevElements => {
                    const updatedElements = prevElements.map(el =>
                        el.elementID === elementId
                            ? { ...el, timeOffsetMs: newTimeOffsetMs }
                            : el
                    );
                    console.log('Local elements updated. Element found and updated:', 
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
            console.log('Full error object:', error);
        }
        
        console.log('--- updateElementTimeOffset completed ---');
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