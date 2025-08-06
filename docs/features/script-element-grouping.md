# Script Element Grouping Feature

**Date:** August 2025  
**Status:** In Development  
**Category:** Feature Implementation  

## Overview

The Script Element Grouping feature allows users to organize script elements (cues and notes) into logical groups for better management and visual organization. This feature provides shift-select functionality for adjacent elements, custom group naming with color coding, and visual hierarchy display.

---

## Feature Requirements

### User Stories

**Primary Use Case**: As a stage manager, I want to group related script elements together so I can:
- Organize complex sequences (e.g., lighting cues for a single scene)
- Move groups of elements together while maintaining their relative timing
- Visually distinguish different sections of the script
- Collapse/expand groups to reduce visual clutter

### Core Functionality

1. **Multi-Selection with Shift-Click**
   - Shift-click selects ranges of adjacent elements only
   - Regular click selects/deselects individual elements
   - Visual feedback with blue selection borders
   - Clear selection when switching modes

2. **Group Creation**
   - Custom group names with validation (required field)
   - Color picker with 6 preset options matching note colors
   - Live preview of group appearance
   - Confirmation dialog with element count

3. **Visual Hierarchy**
   - Group header element at top of group
   - Child elements indented 10px from left
   - Group background color applied to header
   - Collapsible sections (future enhancement)

4. **Drag and Drop**
   - Entire groups move together
   - Maintains relative timing between grouped elements
   - Visual feedback during drag operations

---

## Technical Implementation

### Architecture Overview

The implementation follows CallMaster's established patterns:
- **State Management**: Edit queue system for change tracking
- **Modal System**: Integrated with existing modal framework
- **Component Separation**: Dedicated hooks for business logic
- **Type Safety**: Full TypeScript integration

### Database Schema

```sql
-- Existing fields in script_elements table already support grouping
parent_element_id UUID REFERENCES script_elements(element_id)
group_level INTEGER DEFAULT 0
custom_color VARCHAR(7)  -- Hex color for group headers
```

### Key Components

#### 1. Multi-Selection System (`EditMode.tsx`)

```typescript
// State Management
const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);

// Selection Logic
const handleElementSelect = (elementId: string, shiftKey: boolean = false) => {
    if (!shiftKey) {
        // Single selection/deselection
        const newSelection = selectedElementIds.includes(elementId) ? [] : [elementId];
        setSelectedElementIds(newSelection);
        onSelectionChange?.(newSelection);
    } else {
        // Shift-click range selection for adjacent elements only
        // [Complex range calculation logic]
    }
};
```

**Implementation Details:**
- Captures shift key state in mouseDown event
- Calculates adjacent ranges based on element indices
- Prevents non-contiguous selections
- Integrates with existing drag-and-drop system

#### 2. Group Creation Modal (`GroupElementsModal.tsx`)

```typescript
interface GroupElementsModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedElementIds: string[];
    onConfirm: (groupName: string, backgroundColor: string) => void;
}
```

**Features:**
- Form validation for required group name
- 6 preset colors: Default, Red, Grey, Black, Blue, Yellow
- Live preview showing group appearance
- Responsive color picker grid

#### 3. Toolbar Integration (`toolbarConfig.ts`)

```typescript
// Enhanced context with multi-selection awareness
interface ToolbarContext {
    hasSelection: boolean;
    hasMultipleSelection: boolean;  // New field
    // ... other fields
}

// Group button becomes enabled when 2+ elements selected
{
    id: 'group-elements',
    label: 'STACK',
    isDisabled: !hasMultipleSelection
}
```

#### 4. Element Actions Hook (`useElementModalActions.ts`)

```typescript
// Multi-selection state
const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);

// Group creation handler
const handleConfirmGroupElements = useCallback((groupName: string, backgroundColor: string) => {
    const groupOperation = {
        type: 'CREATE_GROUP',
        element_ids: selectedElementIds,
        group_name: groupName,
        background_color: backgroundColor
    };
    applyLocalChange(groupOperation);
}, [selectedElementIds, applyLocalChange]);
```

---

## Implementation Status

### ✅ Completed Components

1. **Multi-Selection System**
   - Shift-click range selection for adjacent elements
   - Visual selection feedback with blue borders
   - Integration with existing EditMode component
   - Proper event handling in CueElement component

2. **Group Creation Modal**
   - Custom name input with validation
   - Color picker with 6 preset options
   - Live preview functionality
   - Modal integration with ScriptModals system

3. **Toolbar Integration**
   - Dynamic enabling of group button based on selection count
   - Proper context passing with hasMultipleSelection flag
   - Button state management through toolbarConfig utility

4. **State Management Updates**
   - Updated useElementModalActions for multi-selection
   - Backwards compatibility with single selection
   - Proper cleanup and selection clearing

### ✅ Recently Completed

1. **Infinite Loop Bug Fix** - RESOLVED
   - Issue: "Maximum update depth exceeded" error in ManageScriptPage
   - Root cause: useEffect depending on entire elementActions object
   - Solution: Removed elementActions from dependency array, only depend on activeMode
   - Status: Fixed - August 2025

### 📋 Pending Implementation

1. **Visual Hierarchy Display**
   - Group header elements with custom names and colors
   - 10px indentation for child elements
   - Proper visual nesting representation

2. **Drag and Drop Enhancement**
   - Group-aware drag operations
   - Maintain relative timing within groups
   - Visual feedback for group moves

3. **Backend API Integration**
   - CREATE_GROUP operation handling
   - Database persistence of group relationships
   - Group deletion and modification endpoints

4. **Collapsible Groups** (Future Enhancement)
   - Expand/collapse group sections
   - Persistent collapse state
   - Performance optimization for large groups

---

## Technical Challenges & Solutions

### Challenge 1: Adjacent-Only Selection

**Problem**: Users should only be able to select contiguous ranges of elements, not scattered selections.

**Solution**: 
- Calculate element indices during shift-click
- Determine range boundaries based on existing selection
- Create array of adjacent element IDs only
- Prevent non-contiguous selections through range logic

### Challenge 2: State Management Complexity

**Problem**: Managing multi-selection state across multiple components without breaking existing single-selection functionality.

**Solution**:
- Backwards compatibility: `selectedElementId` derived from first element in array
- Separate handlers for single vs multi-selection
- Clear state management boundaries between components

### Challenge 3: Infinite Loop in Selection Updates

**Problem**: Selection state changes causing cascading re-renders and infinite loops.

**Current Investigation**:
- Suspected circular dependency between EditMode and parent components
- Function recreation causing unstable references
- Selection change propagation triggering additional updates

**Attempted Fixes**:
- Memoized toolbar context calculation
- Stabilized function references with useCallback
- Reduced dependency arrays in critical hooks

### Challenge 4: Integration with Existing Systems

**Problem**: Adding grouping without breaking drag-and-drop, edit queue, or modal systems.

**Solution**:
- Minimal changes to existing interfaces
- Additive approach preserving existing functionality
- Careful integration with edit queue operations

---

## Design Decisions

### 1. Adjacent-Only Selection
**Decision**: Only allow contiguous element selection with shift-click.
**Rationale**: 
- Matches user mental model of script organization
- Simplifies group creation logic
- Prevents confusing scattered selections
- Aligns with natural script flow

### 2. Color Consistency
**Decision**: Use same color palette as existing note colors.
**Rationale**:
- Maintains visual consistency
- Leverages existing color utility functions
- Familiar to users already using note colors
- Reduces design complexity

### 3. Edit Queue Integration
**Decision**: Group operations go through existing edit queue system.
**Rationale**:
- Consistent with all other script modifications
- Maintains change tracking and undo capability
- Preserves transactional integrity
- Leverages existing save/discard workflows

### 4. Database Schema Reuse
**Decision**: Use existing parent_element_id and group_level fields.
**Rationale**:
- No schema changes required
- Fields already support hierarchical relationships
- Consistent with existing data model
- Minimizes migration complexity

---

## Testing Strategy

### Unit Tests Needed

1. **Selection Logic Tests**
   - Single element selection/deselection
   - Shift-click range selection
   - Edge cases (first/last elements, empty selection)
   - Non-contiguous selection prevention

2. **Modal Functionality Tests**
   - Form validation (required name field)
   - Color selection and preview
   - Confirmation handling
   - Cancel/close behavior

3. **State Management Tests**
   - Selection state updates
   - Backwards compatibility with single selection
   - Clear selection on mode changes
   - Function reference stability

### Integration Tests Needed

1. **Toolbar Integration**
   - Button enabling/disabling based on selection
   - Modal opening on group button click
   - State synchronization between components

2. **Edit Queue Integration**
   - Group operations added to queue
   - Change tracking and serialization
   - Save/discard functionality

### Manual Testing Checklist

- [ ] Shift-click selects adjacent ranges correctly
- [ ] Regular click works for single selection
- [ ] Group button enables only with 2+ selections
- [ ] Modal opens and validates input properly
- [ ] Color picker works and shows preview
- [ ] Group creation adds to edit queue
- [ ] Selection clears after group creation
- [ ] No infinite loops or performance issues

---

## Future Enhancements

### Phase 2: Visual Hierarchy
- Group header display with custom names
- Child element indentation
- Visual nesting indicators
- Group background color application

### Phase 3: Advanced Group Operations
- Ungroup functionality
- Group modification (rename, recolor)
- Nested groups support
- Group templates/presets

### Phase 4: Performance & UX
- Collapsible group sections
- Bulk operations on groups
- Keyboard shortcuts for grouping
- Group-aware search and filtering

---

## Dependencies

### External Libraries
- `@dnd-kit/core` - Existing drag and drop system
- `@chakra-ui/react` - UI components and styling
- React 19.1.0 - Core framework

### Internal Dependencies
- Edit queue system (`useScriptElementsWithEditQueue`)
- Modal management (`useModalState`)
- Element actions (`useElementModalActions`)
- Toolbar configuration (`toolbarConfig.ts`)

---

## Known Issues

### High Priority
1. **Infinite Loop Bug**: RESOLVED - Selection state updates causing maximum update depth exceeded error
   - Impact: Feature was unusable
   - Root cause: useEffect dependency on entire elementActions object causing circular updates
   - Solution: Removed elementActions from useEffect dependency array in ManageScriptPage.tsx:327
   - Status: Fixed - August 2025

### Medium Priority
1. **Performance**: Large selections may cause UI lag
   - Mitigation: Consider virtualization for very large scripts
   - Not blocking for initial release

### Low Priority  
1. **Accessibility**: Screen reader support for multi-selection
   - Enhancement for future release
   - Standard keyboard navigation still works

---

## Code Examples

### Basic Usage

```typescript
// Selecting elements with shift-click
const handleElementSelect = (elementId: string, shiftKey: boolean) => {
    if (shiftKey && selectedElementIds.length > 0) {
        // Calculate adjacent range
        const range = calculateAdjacentRange(elementId, selectedElementIds, elements);
        setSelectedElementIds(range);
    } else {
        // Single selection
        const newSelection = selectedElementIds.includes(elementId) ? [] : [elementId];
        setSelectedElementIds(newSelection);
    }
};

// Creating a group
const handleGroupCreation = (groupName: string, backgroundColor: string) => {
    const groupOperation = {
        type: 'CREATE_GROUP',
        element_ids: selectedElementIds,
        group_name: groupName,
        background_color: backgroundColor
    };
    applyLocalChange(groupOperation);
};
```

### Component Integration

```typescript
// Toolbar context with multi-selection awareness
const toolbarContext = useMemo((): ToolbarContext => ({
    hasSelection: selectedElementIds.length > 0,
    hasMultipleSelection: selectedElementIds.length > 1,
    // ... other properties
}), [selectedElementIds.length, /* other deps */]);

// Modal integration
<GroupElementsModal
    isOpen={modalState.isOpen('GROUP_ELEMENTS')}
    selectedElementIds={selectedElementIds}
    onConfirm={handleConfirmGroupElements}
    onClose={() => modalState.closeModal('GROUP_ELEMENTS')}
/>
```

---

## Conclusion

The Script Element Grouping feature represents a significant enhancement to CallMaster's script management capabilities. The implementation follows established architectural patterns while introducing new multi-selection and grouping paradigms.

**Current Status**: Core functionality implemented but blocked by infinite loop bug requiring investigation.

**Next Steps**: 
1. Resolve infinite loop in selection state management
2. Implement visual hierarchy display
3. Add backend API support for group persistence
4. Complete drag-and-drop group functionality

The feature architecture is solid and the implementation is largely complete. Once the state management issue is resolved, the remaining work should proceed smoothly following the established patterns and designs documented above.

---

*Last Updated: August 2025*  
*Next Review: After infinite loop resolution*