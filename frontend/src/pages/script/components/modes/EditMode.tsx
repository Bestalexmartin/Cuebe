// frontend/src/pages/script/components/modes/EditMode.tsx

import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
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
import { DraggableCueElement } from '../DraggableCueElement';
import { CueElement } from '../CueElement';
import { ScriptElementsHeader } from '../ScriptElementsHeader';
import { DragReorderModal } from '../modals/DragReorderModal';

interface EditModeProps {
    scriptId: string;
    colorizeDepNames?: boolean;
    showClockTimes?: boolean;
    autoSortCues?: boolean;
    onAutoSortChange?: (value: boolean) => void;
}

export interface EditModeRef {
    refetchElements: () => Promise<void>;
}

export const EditMode = forwardRef<EditModeRef, EditModeProps>(({ 
    scriptId, 
    colorizeDepNames = false, 
    showClockTimes = false,
    autoSortCues = false,
    onAutoSortChange
}, ref) => {
    const { elements: serverElements, isLoading, error, refetchElements } = useScriptElements(scriptId);
    const { script } = useScript(scriptId);
    const { getToken } = useAuth();
    
    const [localElements, setLocalElements] = useState(serverElements);
    const [dragModalOpen, setDragModalOpen] = useState(false);
    const [draggedElement, setDraggedElement] = useState<any>(null);
    const [elementAbove, setElementAbove] = useState<any>(null);
    const [elementBelow, setElementBelow] = useState<any>(null);
    const [pendingReorder, setPendingReorder] = useState<any>(null);
    
    useEffect(() => {
        setLocalElements(serverElements);
    }, [serverElements]);
    
    // Expose refetch function to parent via ref
    useImperativeHandle(ref, () => ({
        refetchElements
    }), [refetchElements]);

    // Drag sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Handle drag end
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = localElements.findIndex(el => el.elementID === active.id);
        const newIndex = localElements.findIndex(el => el.elementID === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const draggedEl = localElements[oldIndex];
        const elementAbove = newIndex > 0 ? localElements[newIndex - 1] : null;
        const elementBelow = newIndex < localElements.length - 1 ? localElements[newIndex + 1] : null;

        const reorderedElements = arrayMove(localElements, oldIndex, newIndex);
        setPendingReorder({
            oldIndex,
            newIndex,
            reorderedElements
        });

        setLocalElements(reorderedElements);

        // Set modal data
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

    const handleMatchAbove = async () => {
        await applyReorder();
        
        if (elementAbove && draggedElement) {
            await updateElementTimeOffset(draggedElement.elementID, elementAbove.timeOffsetMs);
        }
        closeDragModal();
    };

    const handleMatchBelow = async () => {
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
    };

    const applyReorder = async () => {
        if (!pendingReorder) return;

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
                setLocalElements(serverElements);
            }
        } catch (error) {
            console.error('Error reordering elements:', error);
        }
    };

    const updateElementTimeOffset = async (elementId: string, newTimeOffsetMs: number) => {
        try {
            const token = await getToken();
            if (!token) return;

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
                setLocalElements(prevElements => 
                    prevElements.map(el => 
                        el.elementID === elementId 
                            ? { ...el, timeOffsetMs: newTimeOffsetMs }
                            : el
                    )
                );
            } else {
                console.error('Failed to update element time offset');
            }
        } catch (error) {
            console.error('Error updating element time offset:', error);
        }
    };

    return (
        <VStack height="100%" spacing={0} align="stretch">
            {/* Header Row */}
            <ScriptElementsHeader />
            
            {/* Elements List */}
            <Box flex={1} overflowY="auto" overflowX="hidden">
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
                                        <DraggableCueElement
                                            key={element.elementID}
                                            element={element}
                                            index={index}
                                            allElements={localElements}
                                            colorizeDepNames={colorizeDepNames}
                                            showClockTimes={showClockTimes}
                                            scriptStartTime={script?.startTime}
                                            scriptEndTime={script?.endTime}
                                            isDragEnabled={true}
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
                onMatchAbove={handleMatchAbove}
                onMatchBelow={handleMatchBelow}
            />
        </VStack>
    );
});