// frontend/src/pages/script/components/DraggableCueElement.tsx

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Icon } from '@chakra-ui/react';
import { CueElement } from './CueElement';
import { ScriptElement } from '../../../types/scriptElements';

interface DraggableCueElementProps {
    element: ScriptElement;
    index: number;
    allElements: ScriptElement[];
    colorizeDepNames?: boolean;
    showClockTimes?: boolean;
    scriptStartTime?: string;
    scriptEndTime?: string;
    isDragEnabled?: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
}

export const DraggableCueElement: React.FC<DraggableCueElementProps> = ({
    element,
    index,
    allElements,
    colorizeDepNames = false,
    showClockTimes = false,
    scriptStartTime,
    scriptEndTime,
    isDragEnabled = true,
    isSelected = false,
    onSelect
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: element.elementID,
        disabled: !isDragEnabled
    });

    const elementBg = element.customColor || '#E2E8F0';
    const standardCueBg = '#FFFFFF';
    
    const parseColor = (hex: string) => {
        const color = hex.replace('#', '');
        return {
            r: parseInt(color.substr(0, 2), 16),
            g: parseInt(color.substr(2, 2), 16),
            b: parseInt(color.substr(4, 2), 16)
        };
    };
    
    const elementRgb = parseColor(elementBg);
    const standardRgb = parseColor(standardCueBg);
    
    const blendedColor = `rgb(${Math.round((elementRgb.r + standardRgb.r) / 2)}, ${Math.round((elementRgb.g + standardRgb.g) / 2)}, ${Math.round((elementRgb.b + standardRgb.b) / 2)})`;

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: 1,
        backgroundColor: isDragging ? blendedColor : undefined,
        zIndex: isDragging ? 1000 : 'auto',
    };

    return (
        <Box
            ref={setNodeRef}
            style={style}
            cursor={isDragEnabled ? "grab" : "pointer"}
            _active={isDragEnabled ? { cursor: "grabbing" } : {}}
            {...attributes}
            {...(false ? listeners : {})}
        >
            <CueElement
                element={element}
                index={index}
                allElements={allElements}
                colorizeDepNames={colorizeDepNames}
                showClockTimes={showClockTimes}
                scriptStartTime={scriptStartTime}
                scriptEndTime={scriptEndTime}
                isSelected={isSelected}
            />
        </Box>
    );
};