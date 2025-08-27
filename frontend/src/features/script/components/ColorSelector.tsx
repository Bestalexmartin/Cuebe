// frontend/src/features/script/components/ColorSelector.tsx

import React from 'react';
import { HStack, Input, Button } from '@chakra-ui/react';

export const PRESET_COLORS = [
    { name: "Red", value: "#EF4444" },
    { name: "Yellow", value: "#EAB308" },
    { name: "Green", value: "#44aa44" },
    { name: "Blue", value: "#3B82F6" },
    { name: "Grey", value: "#6B7280" },
    { name: "Black", value: "#1F2937" },
];

interface ColorSelectorProps {
    selectedColor: string;
    onColorChange: (color: string) => void;
}

export const ColorSelector: React.FC<ColorSelectorProps> = ({
    selectedColor,
    onColorChange
}) => {
    return (
        <HStack spacing={3} align="center">
            <Input
                type="color"
                value={selectedColor}
                onChange={(e) => onColorChange(e.target.value)}
                width="60px"
                height="40px"
                padding="1"
                cursor="pointer"
            />
            <Input
                value={selectedColor}
                onChange={(e) => onColorChange(e.target.value)}
                placeholder="#EF4444"
                width="120px"
                fontFamily="mono"
            />
            <HStack spacing={1} ml={2}>
                {PRESET_COLORS.map((color) => (
                    <Button
                        key={color.value}
                        size="sm"
                        height="30px"
                        width="30px"
                        minWidth="30px"
                        backgroundColor={color.value}
                        border={selectedColor === color.value ? '3px solid' : '1px solid'}
                        borderColor={selectedColor === color.value ? 'white' : 'gray.300'}
                        onClick={() => onColorChange(color.value)}
                        _hover={{ transform: 'scale(1.1)' }}
                        title={color.name}
                        tabIndex={-1}
                    />
                ))}
            </HStack>
        </HStack>
    );
};