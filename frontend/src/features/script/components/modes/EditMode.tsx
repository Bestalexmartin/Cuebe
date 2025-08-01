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
    const { getToken } = useAuth();

    const elements = externalElements || serverElements;
    const [localElements, setLocalElements] = useState(elements);
    const [dragModalOpen, setDragModalOpen] = useState(false);
    const [draggedElement, setDraggedElement] = useState<any>(null);
    const [elementAbove, setElementAbove] = useState<any>(null);
    const [elementBelow, setElementBelow] = useState<any>(null);
    const [pendingReorder, setPendingReorder] = useState<any>(null);
    const [originalElementsBeforeDrag, setOriginalElementsBeforeDrag] = useState<any[]>([]);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
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
            localElements.some((el, index) => el.elementID !== elements?.[index]?.elementID);
            
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
            await updateElementTimeOffset(draggedElement.elementID, elementAbove.timeOffsetMs);
        }
        
        closeDragModal();
    };

    const handleMatchAfter = async () => {
        await applyReorder();

        if (elementBelow && draggedElement) {
            await updateElementTimeOffset(draggedElement.elementID, elementBelow.timeOffsetMs);
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
        
        // Update local elements immediately for UI feedback
        const updatedElements = localElements.map(el => 
            el.elementID === elementId 
                ? { ...el, timeOffsetMs: newTimeOffsetMs }
                : el
        );
        setLocalElements(updatedElements);
        
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
                            items={localElements.map(el => el.elementID)}
                            strategy={verticalListSortingStrategy}
                        >
                            <Box>
                                <VStack spacing={0} align="stretch">
                                    {localElements.map((element, index) => {
                                        // Only show clock times if we have the required script start time
                                        const shouldShowClockTimes = showClockTimes && !!script?.startTime;
                                        return (
                                            <CueElement
                                                key={element.elementID}
                                                element={element}
                                                index={index}
                                                allElements={localElements}
                                                colorizeDepNames={colorizeDepNames}
                                                showClockTimes={shouldShowClockTimes}
                                                scriptStartTime={script?.startTime}
                                                scriptEndTime={script?.endTime}
                                                isDragEnabled={true}
                                                isSelected={selectedElementId === element.elementID}
                                                onSelect={() => {
                                                    const newId =
                                                        selectedElementId === element.elementID
                                                            ? null
                                                            : element.elementID;
                                                    setSelectedElementId(newId);
                                                    onSelectionChange?.(newId);
                                                }}
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
