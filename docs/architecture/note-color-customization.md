# Note Color Customization System

**Date:** July 2025  
**Status:** Implemented  
**Category:** Architecture & User Interface

## Overview

The Cuebe application features a comprehensive color customization system for script notes, allowing users to assign background colors for better visual organization and identification. The system includes intelligent text contrast calculation and preset color management.

## Architecture

### Core Components

#### 1. AddScriptElementModal Component (`/frontend/src/pages/script/components/AddScriptElementModal.tsx`)

- **Purpose**: User interface for selecting note colors during creation
- **Key Features**:
  - Conditional UI rendering (color picker only shown for notes)
  - Preset color system with quick selection
  - Hex color input with validation
  - Form integration with existing element creation workflow

#### 2. CueElement Component (`/frontend/src/pages/script/components/CueElement.tsx`)

- **Purpose**: Renders script elements with proper color styling
- **Key Features**:
  - Smart text contrast calculation based on background luminance
  - Dynamic styling for notes vs cues
  - Left border color coordination
  - Font weight adjustments for custom colored elements

### Color System Design

#### Preset Colors

```typescript
const NOTE_PRESET_COLORS = [
  { name: "Red", value: "#EF4444" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Green", value: "#44aa44" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Grey", value: "#6B7280" },
  { name: "Black", value: "#1F2937" },
];
```

#### Text Contrast Algorithm

```typescript
const getTextColorForBackground = (hexColor: string): string => {
  if (!hexColor || hexColor === "") return "black";

  const color = hexColor.replace("#", "");
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);

  // Relative luminance calculation (WCAG standard)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5 ? "white" : "black";
};
```

## Technical Implementation

### Form Integration

```typescript
interface FormState {
    elementType: string;
    description: string;
    departmentID: string | null;
    customColor?: string;  // New field for note colors
    // ... other fields
}

// Conditional rendering for note color picker
{formState.elementType === 'NOTE' && (
    <FormControl>
        <FormLabel>Note Color</FormLabel>
        <HStack spacing={3} align="flex-start">
            <Input
                type="text"
                placeholder="#EF4444"
                value={formState.customColor || ''}
                onChange={(e) => setFormState(prev => ({
                    ...prev,
                    customColor: e.target.value
                }))}
                width="120px"
            />
            <Wrap spacing={2}>
                {NOTE_PRESET_COLORS.map((color, index) => (
                    <WrapItem key={index}>
                        <Box
                            w="32px"
                            h="32px"
                            bg={color.value}
                            border="2px solid"
                            borderColor="gray.300"
                            borderRadius="md"
                            cursor="pointer"
                            onClick={() => setFormState(prev => ({
                                ...prev,
                                customColor: color.value
                            }))}
                        />
                    </WrapItem>
                ))}
            </Wrap>
        </HStack>
    </FormControl>
)}
```

### Visual Styling Logic

```typescript
const isNote = (element as any).elementType === "NOTE";
const backgroundColor = element.customColor || "#EF4444";
const hasCustomBackground =
  !!element.customColor && element.customColor !== "#EF4444";

let textColor: string;
let fontWeight: string;
let leftBarColor: string;

if (isNote) {
  if (hasCustomBackground) {
    textColor = getTextColorForBackground(element.customColor!);
    fontWeight = "bold";
    leftBarColor = element.customColor!;
  } else {
    textColor = "black";
    fontWeight = "normal";
    leftBarColor = "gray.700";
  }
} else {
  // Cue styling logic
  textColor = hasCustomBackground ? "white" : "black";
  fontWeight = hasCustomBackground ? "bold" : "normal";
  leftBarColor = element.departmentColor || "gray.400";
}
```

## Design Principles

### 1. Visual Hierarchy

- **Custom colored notes**: Bold text with matching left border
- **Default notes**: Normal text with gray.700 left border
- **Cues**: Department-based coloring with standard styling

### 2. Accessibility

- **WCAG-compliant contrast**: Automatic text color calculation
- **50% luminance threshold**: Ensures readable text on all backgrounds
- **Consistent visual patterns**: Bold text indicates custom styling

### 3. User Experience

- **Preset colors first**: Default color at beginning of quick selection
- **Hex input validation**: Manual color entry for precise control
- **Conditional interface**: Color picker only appears for notes
- **Visual feedback**: Immediate preview of selected colors

## Color Psychology and Theater Usage

### Preset Color Meanings

- **Red**: Critical notes, safety warnings, emergency cues
- **Yellow**: Caution, attention-required items, standby cues
- **Blue**: Information, standard operational notes
- **Gray**: Secondary information, background notes
- **Black**: High-priority, director notes, critical timing
- **Default**: General notes, standard information

### Visual Organization Benefits

- **Quick identification**: Color-coded notes for instant recognition
- **Priority signaling**: Important notes stand out visually
- **Department coordination**: Colors can represent different crews
- **Show flow**: Visual rhythm helps with script reading

## Integration Points

### 1. Database Schema

```sql
-- ScriptElement table includes customColor field
customColor VARCHAR(7) NULL  -- Hex color format (#RRGGBB)
```

### 2. API Integration

```typescript
// Element creation with custom color
const elementData = {
  elementType: "NOTE",
  description: formState.description,
  customColor: formState.customColor || null,
  departmentID: null, // Notes don't require departments
  // ... other fields
};
```

### 3. TypeScript Interfaces

```typescript
interface ScriptElement {
  elementID: string;
  elementType: "CUE" | "NOTE" | "GROUP";
  customColor?: string;
  departmentColor?: string;
  // ... other properties
}
```

## Performance Considerations

### 1. Color Calculation Optimization

- **Memoization**: Cache color calculations for repeated elements
- **Efficient parsing**: Direct hex-to-RGB conversion without libraries
- **Minimal re-renders**: Color calculations only on color changes

### 2. Rendering Performance

```typescript
// Efficient color parsing
const parseColor = (hex: string) => {
  const color = hex.replace("#", "");
  return {
    r: parseInt(color.substr(0, 2), 16),
    g: parseInt(color.substr(2, 2), 16),
    b: parseInt(color.substr(4, 2), 16),
  };
};
```

### 3. Memory Management

- **No color libraries**: Pure JavaScript calculations
- **Minimal state**: Only store hex values, calculate derived colors
- **Efficient updates**: Only re-render affected elements

## Error Handling

### 1. Invalid Color Values

```typescript
// Fallback to default color for invalid hex values
const backgroundColor = element.customColor || "#E2E8F0";

// Validation in contrast calculation
if (!hexColor || hexColor === "") return "black";
```

### 2. Form Validation

- **Hex format validation**: Ensure proper color format
- **Graceful degradation**: Invalid colors fall back to default
- **User feedback**: Clear indication of color selection

## Browser Compatibility

### 1. Color Support

- **Hex colors**: Universal browser support
- **RGB calculations**: Native JavaScript parseInt
- **CSS color values**: Standard browser color handling

### 2. Input Elements

- **Text input**: Fallback for color selection
- **Click handlers**: Standard event handling
- **Visual feedback**: CSS-based color previews

## Future Enhancements

### 1. Extended Color Palette

- **Color categories**: Organize colors by function
- **Custom palettes**: User-defined color sets
- **Color themes**: Predefined theater-specific themes

### 2. Advanced Features

- **Color gradients**: Subtle background variations
- **Pattern overlays**: Texture options for accessibility
- **Color history**: Recently used colors

### 3. Integration Improvements

- **Department colors**: Link note colors to department themes
- **Script templates**: Predefined color schemes for show types
- **Export options**: Color-coded PDF generation

## Testing Strategy

### 1. Color Accuracy

- **Contrast validation**: Ensure WCAG compliance
- **Color rendering**: Cross-browser color consistency
- **Accessibility testing**: Screen reader compatibility

### 2. User Interface

- **Color picker interaction**: Click and selection testing
- **Form integration**: Validation and submission testing
- **Visual regression**: Screenshot comparison testing

### 3. Performance Testing

- **Large scripts**: Color calculation performance with many elements
- **Memory usage**: Color data storage efficiency
- **Rendering speed**: Visual update performance

---

_This documentation covers the note color customization system implementation as of July 2025. For related documentation, see [Drag-and-Drop System](./drag-and-drop-system.md) and [Script Elements Data Model](./script-elements-data-model.md)._
