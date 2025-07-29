// frontend/src/pages/script/components/modes/EditMode.tsx

import React, { forwardRef, useImperativeHandle } from 'react';
import { VStack, Text, Box, Flex } from '@chakra-ui/react';
import { useScriptElements } from '../../hooks/useScriptElements';
import { useScript } from '../../../../hooks/useScript';
import { CueElement } from '../CueElement';
import { ScriptElementsHeader } from '../ScriptElementsHeader';

interface EditModeProps {
    scriptId: string;
    colorizeDepNames?: boolean;
    showClockTimes?: boolean;
}

export interface EditModeRef {
    refetchElements: () => Promise<void>;
}

export const EditMode = forwardRef<EditModeRef, EditModeProps>(({ scriptId, colorizeDepNames = false, showClockTimes = false }, ref) => {
    const { elements, isLoading, error, refetchElements } = useScriptElements(scriptId);
    const { script } = useScript(scriptId);
    
    // Expose refetch function to parent via ref
    useImperativeHandle(ref, () => ({
        refetchElements
    }), [refetchElements]);

    return (
        <VStack height="100%" spacing={0} align="stretch">
            {/* Header Row */}
            <ScriptElementsHeader />
            
            {/* Elements List */}
            <Box flex={1} overflowY="auto">
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

                {!isLoading && !error && elements.length === 0 && (
                    <Flex justify="center" align="center" height="200px" direction="column" spacing={4}>
                        <Text color="gray.500" fontSize="lg">
                            No script elements yet
                        </Text>
                        <Text color="gray.400" fontSize="sm">
                            Use the "Add" button in the toolbar to create your first cue, note, or group
                        </Text>
                    </Flex>
                )}

                {!isLoading && !error && elements.length > 0 && (
                    <VStack spacing={0} align="stretch">
                        {elements.map((element, index) => (
                            <CueElement
                                key={element.elementID}
                                element={element}
                                index={index}
                                allElements={elements}
                                colorizeDepNames={colorizeDepNames}
                                showClockTimes={showClockTimes}
                                scriptStartTime={script?.startTime}
                                scriptEndTime={script?.endTime}
                                onClick={() => {}}
                            />
                        ))}
                    </VStack>
                )}
            </Box>
        </VStack>
    );
});