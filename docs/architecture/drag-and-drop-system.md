# Drag-and-Drop Script Element Reordering System

## Overview

The CallMaster application features a comprehensive drag-and-drop system for reordering script elements (cues, notes, groups) in edit mode. This system provides intelligent conflict resolution when time offsets don't match the new element positioning.

## Architecture

### Core Components

#### 1. EditMode Component (`/frontend/src/pages/script/components/modes/EditMode.tsx`)
- **Purpose**: Container for drag-and-drop functionality in script editing
- **Key Features**:
  - Local state management for visual updates without server refresh
  - Integration with @dnd-kit library for drag operations
  - Modal-based conflict resolution for time offset mismatches
  - Server synchronization for persistent changes

#### 2. DraggableCueElement Component (`/frontend/src/pages/script/components/DraggableCueElement.tsx`)
- **Purpose**: Wrapper component that makes script elements draggable
- **Key Features**:
  - Full-row dragging (entire element is draggable)
  - Visual feedback during drag operations with color blending
  - Z-index management for proper layering during drag
  - Maintains opacity and visual consistency

#### 3. DragReorderModal Component (`/frontend/src/pages/script/components/modals/DragReorderModal.tsx`)
- **Purpose**: User choice modal for handling time offset conflicts
- **Key Features**:
  - Mobile toolbar-style buttons with orange hover and blue active states
  - Three conflict resolution options: disable auto-sort, match above, match below
  - Clear visual feedback for user decisions

### Technical Implementation

#### Library Integration
```typescript
// Core @dnd-kit dependencies
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
```

#### Local State Management
```typescript
const [localElements, setLocalElements] = useState(serverElements);
const [dragModalOpen, setDragModalOpen] = useState(false);
const [pendingReorder, setPendingReorder] = useState<any>(null);

// Sync local state with server changes
useEffect(() => {
    setLocalElements(serverElements);
}, [serverElements]);
```

#### Drag Visual Feedback
```typescript
// Color blending for drag preview
const elementBg = element.customColor || '#E2E8F0';
const standardCueBg = '#FFFFFF';
const blendedColor = `rgb(${Math.round((elementRgb.r + standardRgb.r) / 2)}, 
                          ${Math.round((elementRgb.g + standardRgb.g) / 2)}, 
                          ${Math.round((elementRgb.b + standardRgb.b) / 2)})`;

const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: 1,
    backgroundColor: isDragging ? blendedColor : undefined,
    zIndex: isDragging ? 1000 : 'auto',
};
```

## User Interaction Flow

### 1. Drag Initiation
- User clicks and drags any script element in edit mode
- Element becomes visually distinct with blended background color
- Z-index ensures dragged element appears above other elements

### 2. Drop and Conflict Detection
- System calculates new position and checks time offset conflicts
- If element times don't match new position, modal opens with options
- Local state immediately updates to show new visual position

### 3. Conflict Resolution Options

#### Option A: Disable Auto-Sort
- Maintains current element ordering without time adjustments
- Useful when manual ordering is preferred over chronological

#### Option B: Match Time Above
- Updates dragged element's time to match the element above it
- Maintains chronological consistency

#### Option C: Match Time Below
- Updates dragged element's time to match the element below it
- Alternative chronological alignment

### 4. Server Synchronization
```typescript
// Reorder API call
const reorderData = {
    elements: reorderedElements.map((el, index) => ({
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
```

## Performance Optimizations

### 1. Local State Updates
- Visual changes happen immediately in local state
- Eliminates screen refresh/flash during drag operations
- Server sync happens in background

### 2. Horizontal Scroll Prevention
```typescript
<Box flex={1} overflowY="auto" overflowX="hidden">
```

### 3. Efficient Re-rendering
- Uses React.memo patterns from existing component architecture
- Minimal re-renders during drag operations

## Integration Points

### 1. ViewMode Separation
- Drag functionality only available in EditMode
- ViewMode prevents all interactions (text selection, clicks, hovers)
- Clean separation of concerns between edit and view states

### 2. Change Tracking Integration
- Drag operations integrate with existing "Save Changes" button
- Changes remain in local state until explicitly saved
- Supports non-destructive editing workflow

### 3. Auto-Sort System
- Respects existing auto-sort preferences
- Provides option to disable auto-sort when conflicts arise
- Maintains backward compatibility with existing scripts

## Error Handling

### 1. Network Failures
```typescript
if (!response.ok) {
    console.error('Failed to reorder elements');
    setLocalElements(serverElements); // Revert to server state
}
```

### 2. State Consistency
- Local state reverts to server state on API failures
- Modal prevents incomplete operations
- User feedback for failed operations

## Browser Compatibility

### 1. Cursor States
```typescript
cursor={isDragEnabled ? "grab" : "default"}
_active={isDragEnabled ? { cursor: "grabbing" } : {}}
```

### 2. Drag Handle Accessibility
- Full-row dragging eliminates small target issues
- Keyboard accessibility through @dnd-kit built-in support
- Clear visual feedback for drag state

## Future Enhancements

### 1. Bulk Operations
- Multi-select drag operations
- Batch time offset updates
- Group reordering capabilities

### 2. Undo/Redo System
- Operation history tracking
- Granular undo for drag operations
- Integration with existing change management

### 3. Animation Improvements
- Smooth transition animations
- Custom drag preview components
- Enhanced visual feedback

## Testing Considerations

### 1. Drag Interaction Testing
- Full drag-and-drop workflow verification
- Modal interaction testing
- State consistency validation

### 2. Performance Testing
- Large script handling (100+ elements)
- Memory usage during drag operations
- Network failure scenarios

### 3. Accessibility Testing
- Keyboard navigation support
- Screen reader compatibility
- Focus management during modal interactions

---

*This documentation covers the drag-and-drop system implementation as of July 2025. For related documentation, see [Note Color Customization System](./note-color-customization.md) and [Component Architecture](./component-architecture.md).*