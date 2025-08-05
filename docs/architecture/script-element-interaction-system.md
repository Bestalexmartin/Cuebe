# Script Element Interaction System

**Date:** July 2025  
**Status:** Implemented  
**Category:** Architecture & User Interaction

## Overview

The CallMaster script element interaction system provides an intuitive user experience for managing script elements through integrated click-to-select and drag-to-reorder functionality. This system eliminates the need for separate drag handles while maintaining clear interaction boundaries between selection and reordering operations.

## Architecture

### Core Components

#### 1. CueElement Component (`/frontend/src/pages/script/components/CueElement.tsx`)
- **Purpose**: Unified script element display with integrated interaction capabilities
- **Key Features**:
  - Gesture-based interaction detection
  - Click-to-select functionality with visual feedback
  - Seamless drag-to-reorder integration
  - Context-aware interaction modes (edit vs view)
  - Department color visualization

#### 2. Gesture Detection System
```typescript
// Mouse interaction state management
const dragTimeoutRef = useRef<number | null>(null);
const isDragStartedRef = useRef(false);
const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

// Gesture recognition with time and movement thresholds
const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    isDragStartedRef.current = false;
    
    dragTimeoutRef.current = setTimeout(() => {
        isDragStartedRef.current = true;
    }, 150); // 150ms threshold for drag initiation
}, [isDragEnabled, onSelect]);
```

#### 3. Context-Aware Interaction Modes
- **Edit Mode**: Full interaction capabilities (select, drag, reorder)
- **View Mode**: Read-only with scroll navigation, no interactions
- **Info Mode**: Form-based editing interface

## User Interaction Patterns

### 1. Click-to-Select in Edit Mode
```typescript
// Quick click detection (< 150ms without movement)
const handleMouseUp = useCallback(() => {
    if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
    }
    
    // If drag wasn't initiated, treat as selection click
    if (!isDragStartedRef.current && onSelect) {
        onSelect();
    }
    
    isDragStartedRef.current = false;
    mouseDownPosRef.current = null;
}, [onSelect]);
```

**Selection Behavior:**
- Single click selects/deselects element
- Visual feedback through border highlighting
- Enables context-dependent toolbar actions (Edit, Duplicate, Delete)
- Maintains selection state during page navigation

### 2. Drag-to-Reorder with Movement Detection
```typescript
// Movement threshold prevents accidental drags
const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragEnabled || !mouseDownPosRef.current || isDragStartedRef.current) {
        return;
    }
    
    const deltaX = Math.abs(e.clientX - mouseDownPosRef.current.x);
    const deltaY = Math.abs(e.clientY - mouseDownPosRef.current.y);
    
    // 5px movement threshold
    if (deltaX > 5 || deltaY > 5) {
        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
            dragTimeoutRef.current = null;
        }
        isDragStartedRef.current = true;
    }
}, [isDragEnabled]);
```

**Drag Behavior:**
- 150ms time delay + 5px movement threshold prevents accidental drags
- Full element area acts as drag handle
- Visual feedback through temporary styling changes
- Integrates with @dnd-kit for smooth drag operations

### 3. Mode-Specific Interaction Control
```tsx
// Edit Mode: Full interactions enabled
<CueElement
    element={element}
    isDragEnabled={true}
    isSelected={selectedElementId === element.elementID}
    onSelect={() => {
        if (selectedElementId === element.elementID) {
            setSelectedElementId(null); // Toggle deselect
        } else {
            setSelectedElementId(element.elementID); // Select
        }
    }}
/>

// View Mode: No interactions, pointer events disabled
<CueElement
    element={element}
    // No isDragEnabled, onSelect props
/>
```

## Visual Feedback System

### 1. Selection State Indicators
```typescript
// Selection styling
const borderColor = isSelected 
    ? "blue.400" 
    : "container.border";

const borderWidth = isSelected ? "2px" : "1px";
```

### 2. Drag State Visual Changes
- **Drag Initiated**: Element gains higher z-index and modified background
- **During Drag**: Maintains opacity while showing movement
- **Drop Target**: Visual indicators for valid drop zones

### 3. Department Color Integration
```typescript
// Department color chip display
<Box
    w="10px"
    h="100%"
    bg={element.departmentColor || 'gray.400'}
    borderRadius="2px 0 0 2px"
    flexShrink={0}
/>
```

## Toolbar Integration

### 1. Dynamic Button States
```typescript
// Edit mode toolbar with context-dependent buttons
const hasSelection = !!selectedElementId;

const editModeButtons = [
    {
        id: 'edit-element',
        icon: 'element-edit',
        label: 'Edit',
        isDisabled: !hasSelection // Disabled when no selection
    },
    {
        id: 'duplicate-element', 
        icon: 'copy',
        label: 'Duplicate',
        isDisabled: !hasSelection
    },
    {
        id: 'delete-element',
        icon: 'delete', 
        label: 'Delete',
        isDisabled: !hasSelection
    }
];
```

### 2. Navigation Controls
```typescript
// Jump-to-top and jump-to-bottom functionality
const handleJumpToTop = () => {
    const hideScrollbarContainers = document.querySelectorAll('.hide-scrollbar');
    let maxScrollHeight = 0;
    let scrollContainer: HTMLElement | null = null;
    
    // Find the scrollable container with most content
    for (const container of hideScrollbarContainers) {
        if (container instanceof HTMLElement && 
            container.scrollHeight > container.clientHeight) {
            if (container.scrollHeight > maxScrollHeight) {
                maxScrollHeight = container.scrollHeight;
                scrollContainer = container;
            }
        }
    }
    
    if (scrollContainer) {
        scrollContainer.scrollTop = 0;
    }
};
```

## Performance Optimizations

### 1. Event Handler Efficiency
```typescript
// Memoized callbacks prevent unnecessary re-renders
const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Implementation
}, [isDragEnabled, onSelect]);

const handleMouseUp = useCallback(() => {
    // Implementation  
}, [onSelect]);
```

### 2. State Management
- Local component state for interaction tracking
- Minimal parent component updates
- Efficient selection state synchronization

### 3. DOM Manipulation Optimization
- Direct DOM queries only when necessary
- Cached container references where possible
- Minimal style recalculations during interactions

## Error Handling and Edge Cases

### 1. Gesture Recognition Edge Cases
- **Rapid clicks**: Timeout clearing prevents multiple rapid selections
- **Mouse leave events**: Cleanup prevents stuck drag states
- **Network lag**: Local state maintains responsive UI during server sync

### 2. Selection State Management
```typescript
// Clear selection when switching modes
React.useEffect(() => {
    if (activeMode !== 'edit') {
        setSelectedElementId(null);
    }
}, [activeMode]);
```

### 3. Container Detection Fallbacks
- Multiple selector strategies for scroll containers
- Graceful degradation when containers not found
- Console logging for debugging interaction issues

## Browser Compatibility

### 1. Mouse Event Handling
- Standard MouseEvent APIs across modern browsers
- Passive event listeners where appropriate
- Touch event consideration for future mobile support

### 2. CSS Pointer Events
```css
/* View mode interaction prevention */
.view-mode-element {
    pointer-events: none !important;
    user-select: none !important;
}
```

## Accessibility Considerations

### 1. Keyboard Navigation
- Tab order maintains logical flow through elements
- Enter key activates selection in edit mode
- Arrow keys for navigation (future enhancement)

### 2. Screen Reader Support
- ARIA labels for interaction states
- Role attributes for draggable elements
- State announcements for selection changes

### 3. Focus Management
- Clear focus indicators during interactions
- Focus restoration after modal interactions
- Keyboard alternatives for drag operations

## Integration with Existing Systems

### 1. @dnd-kit Integration
```typescript
// Sortable element wrapper
import { useSortable } from '@dnd-kit/sortable';

const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
} = useSortable({ id: element.elementID });
```

### 2. Selection State Synchronization
```typescript
// Parent component selection tracking
React.useEffect(() => {
    if (activeMode === 'edit' && editModeRef.current) {
        const editModeSelection = editModeRef.current?.selectedElementId;
        if (editModeSelection !== selectedElementId) {
            setSelectedElementId(editModeSelection || null);
        }
    }
}, [activeMode, selectedElementId]);
```

### 3. Toast Notification Integration
- Success/error feedback for operations
- Consistent messaging across interaction types
- User guidance for complex operations

## Future Enhancements

### 1. Touch Support
- Touch gesture recognition for mobile devices
- Long-press for drag initiation
- Touch feedback optimization

### 2. Multi-Select Operations
- Ctrl+click for multi-element selection
- Bulk operations on selected elements
- Range selection with Shift+click

### 3. Enhanced Visual Feedback
- Hover state animations
- Drag preview customization
- Selection animation transitions

### 4. Contextual Menus
- Right-click context menus for quick actions
- Element-specific menu options
- Keyboard shortcut integration

## Testing Strategy

### 1. Interaction Testing
- Automated gesture recognition testing
- Selection state consistency validation
- Mode transition behavior verification

### 2. Performance Testing
- Large element list interaction responsiveness
- Memory usage during extended sessions
- Scroll performance with jump navigation

### 3. Cross-Browser Testing
- Mouse event handling consistency
- CSS compatibility verification
- Performance benchmarking across browsers

---

*This documentation covers the script element interaction system as implemented in July 2025. For related functionality, see [Drag-and-Drop System](./drag-and-drop-system.md) and [Component Architecture](./component-architecture.md).*