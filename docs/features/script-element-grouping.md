# Script Element Grouping Feature

**Date:** January 2025  
**Status:** ✅ Complete and Production Ready  
**Category:** Core Feature  

## Overview

The Script Element Grouping feature allows users to organize script elements (cues and notes) into logical groups for better management and visual organization. This comprehensive feature provides multi-selection, custom group naming with color coding, visual hierarchy display, collapse/expand functionality, and intelligent group management.

---

## How Grouping Works

### Creating Groups

1. **Select Elements**: Use shift+click to select adjacent elements, or click individual elements while holding Ctrl/Cmd
2. **Group Creation**: Click the "STACK" button in the toolbar when 2+ elements are selected
3. **Customize Group**: Enter a group name and choose from 6 color options
4. **Automatic Organization**: The system creates a group parent element and organizes children hierarchically

### Group Features

#### Visual Organization
- **Group Headers**: Display custom names and colors
- **Child Indentation**: Grouped elements are visually indented with color bars
- **Summary Notes**: Dynamic text showing "Includes X cues and Y notes"
- **Collapse/Expand**: Click the triangle to show/hide group contents

#### Smart Group Management
- **Duration Calculation**: Group duration automatically spans from first to last child element
- **Time Synchronization**: Group timing updates when children are modified
- **Automatic Cleanup**: Empty groups are removed, single-child groups are ungrouped
- **Cross-Group Operations**: Dragging elements between groups updates membership automatically

#### Group Operations
- **Duplication**: Duplicated elements maintain group membership
- **Deletion**: Smart cleanup maintains group integrity
- **Ungrouping**: Remove group structure while preserving individual elements
- **Drag & Drop**: Move entire groups or individual elements between groups
- **Group Parent Dragging**: Dragging a group parent moves the entire group together with intelligent time offset recalculation

---

## Technical Implementation

### Architecture

The implementation follows CallMaster's established patterns:
- **Edit Queue System**: All group operations are tracked and can be undone/redone
- **Component Architecture**: Modular design with dedicated hooks and components
- **Real-Time Updates**: Dynamic calculations with optimized re-rendering
- **Type Safety**: Full TypeScript integration throughout

### Database Schema

Groups leverage existing database fields without requiring schema changes:

```sql
-- script_elements table fields used for grouping
element_type ENUM ('CUE', 'NOTE', 'GROUP')  -- GROUP type for parent elements
parent_element_id UUID                       -- References group parent
group_level INTEGER DEFAULT 0               -- 0 = parent, 1 = child
is_collapsed BOOLEAN DEFAULT FALSE          -- Collapse state
custom_color VARCHAR(7)                     -- Group color
cue_notes TEXT                              -- Used for group summary (calculated dynamically)
```

### Key Components

#### 1. Group Creation System

**Multi-Selection (`EditMode.tsx`)**:
```typescript
// Prevents shift-selection when groups are involved to avoid conflicts
const hasGroupElements = allElements.some(el => 
    el.element_type === 'GROUP' || 
    (el.parent_element_id && el.group_level && el.group_level > 0)
);

if (hasGroupElements) {
    // Block shift-selection, use single selection only
    setSelectedElementIds([elementId]);
    return;
}
```

**Group Validation (`useElementModalActions.ts`)**:
```typescript
// Prevents grouping of already-grouped elements or group parents
const alreadyGrouped = selectedElements.filter(el => 
    el.element_type === 'GROUP' || 
    (el.parent_element_id && el.group_level && el.group_level > 0)
);

if (alreadyGrouped.length > 0) {
    showError(`Cannot group elements that are already in groups`);
    return;
}
```

#### 2. Dynamic Group Summary Notes

**Frontend Calculation (`CueElement.tsx`)**:
```typescript
const groupSummaryNotes = useMemo(() => {
    if (!isGroupParent) return null;
    
    // Find all child elements including collapsed ones
    const childElements = allElements.filter(el => 
        el.parent_element_id === element.element_id &&
        el.group_level && el.group_level > 0
    );
    
    // Count by type
    const cueCount = childElements.filter(el => el.element_type === 'CUE').length;
    const noteCount = childElements.filter(el => el.element_type === 'NOTE').length;
    
    // Generate summary
    const noteParts = [];
    if (cueCount > 0) noteParts.push(`${cueCount} cue${cueCount !== 1 ? 's' : ''}`);
    if (noteCount > 0) noteParts.push(`${noteCount} note${noteCount !== 1 ? 's' : ''}`);
    
    return noteParts.length > 0 ? `Includes ${noteParts.join(' and ')}` : "";
}, [isGroupParent, allElements, element.element_id]);
```

#### 3. Collapse/Expand System

**Toggle Functionality**:
```typescript
const toggleGroupCollapse = useCallback((elementId: string) => {
    applyLocalChange({
        type: 'TOGGLE_GROUP_COLLAPSE',
        element_id: elementId
    });
}, [applyLocalChange]);
```

**Visual Filtering (`useScriptElementsWithEditQueue.ts`)**:
```typescript
// Filter out collapsed child elements for display
const visibleElements = currentElements.filter(element => {
    if (!element.parent_element_id) return true;
    
    const parent = currentElements.find(el => el.element_id === element.parent_element_id);
    return !parent || !parent.is_collapsed;
});

// But maintain all elements for group calculations
return {
    elements: visibleElements,
    allElements: currentElements
};
```

#### 4. Cross-Group Drag Operations

**Group Parent Dragging with Time Offset Recalculation (`applyOperationToElements`)**:
```typescript
case 'REORDER':
    if (isGroupParent) {
        // Calculate new time offset for the first child based on drop position
        let newFirstChildTimeOffset = elementToMove.time_offset_ms;
        
        if (newIndex > 0 && newIndex < elementsWithoutGroup.length) {
            // Dropped between elements - interpolate time offset
            const beforeElement = elementsWithoutGroup[newIndex - 1];
            const afterElement = elementsWithoutGroup[newIndex];
            newFirstChildTimeOffset = Math.round(
                (beforeElement.time_offset_ms + afterElement.time_offset_ms) / 2
            );
        } else if (newIndex === 0) {
            // Dropped at beginning - add buffer before first element
            newFirstChildTimeOffset = Math.max(0, firstElement.time_offset_ms - 30000);
        } else {
            // Dropped at end - add buffer after last element
            newFirstChildTimeOffset = lastElement.time_offset_ms + 30000;
        }
        
        // Calculate time delta: how much the group parent is moving
        const originalGroupParentTime = elementToMove.time_offset_ms;
        const timeDelta = newFirstChildTimeOffset - originalGroupParentTime;
        
        // Apply the same delta to ALL children
        const updatedChildren = groupChildren.map(child => ({
            ...child,
            time_offset_ms: child.time_offset_ms + timeDelta
        }));
        
        const updatedGroupParent = {
            ...elementToMove,
            time_offset_ms: newFirstChildTimeOffset
        };
        
        // Insert entire group with updated timing
        result.splice(newIndex, 0, updatedGroupParent);
        updatedChildren.forEach((child, idx) => {
            result.splice(newIndex + 1 + idx, 0, child);
        });
    }
```

**Automatic Group Membership (`applyOperationToElements`)**:
```typescript
    // For regular element moves (not group parents)
    // Check if both surrounding elements are in the same group
    if (beforeElement.parent_element_id && 
        afterElement.parent_element_id &&
        beforeElement.parent_element_id === afterElement.parent_element_id) {
        
        // Add moved element to the same group
        updatedElementToMove = {
            ...updatedElementToMove,
            parent_element_id: beforeElement.parent_element_id,
            group_level: beforeElement.group_level || 1
        };
    } else if (elementToMove.parent_element_id) {
        // Remove from previous group
        updatedElementToMove = {
            ...updatedElementToMove,
            parent_element_id: undefined,
            group_level: 0
        };
    }
```

#### 5. Smart Group Cleanup

**Delete Operation Handling**:
```typescript
case 'DELETE_ELEMENT':
    if (isGroupParent) {
        // Deleting group parent - ungroup all children
        updatedElements = updatedElements.map(el => {
            if (el.parent_element_id === operation.element_id) {
                return { ...el, parent_element_id: undefined, group_level: 0 };
            }
            return el;
        });
    } else if (isGroupChild) {
        const remainingChildren = updatedElements.filter(el => 
            el.parent_element_id === elementToDelete.parent_element_id
        );

        if (remainingChildren.length === 0) {
            // Remove empty group parent
        } else if (remainingChildren.length === 1) {
            // Ungroup single remaining child and remove parent
        } else {
            // Recalculate group duration with remaining children
        }
    }
```

---

## User Experience

### Visual Design

**Group Parents**:
- Custom background color from user selection
- Bold text with dynamic summary notes
- Collapse/expand triangle indicator (right arrow ► when collapsed, down arrow ▼ when expanded)
- Duration spans the full time range of child elements

**Group Children**:
- 16px colored bar on the left edge matching group parent color
- Normal cue/note appearance
- Hidden when parent is collapsed
- Maintain individual timing and properties

**Interactive Elements**:
- **Edit Mode**: Full interaction including drag, select, and edit
- **View Mode**: Only collapse/expand button is interactive, preventing accidental modifications
- **Selection**: Group elements block shift-selection to prevent conflicts
- **Hover Effects**: Contextual based on current mode and permissions

### Workflow Integration

**Creation Workflow**:
1. Select 2+ adjacent elements using shift+click
2. Click "STACK" toolbar button
3. Enter group name and select color
4. Group is created and added to edit queue
5. Save changes to persist to database

**Management Workflow**:
- **Expand/Collapse**: Click triangle in any mode
- **Modify Group**: Edit individual elements, group updates automatically
- **Move Elements**: Drag to new positions, group membership updates intelligently
- **Ungroup**: Select group parent and use ungroup functionality
- **Duplicate**: Duplicated elements maintain group membership with corrected parent references

---

## Advanced Features

### Prevention Rules

1. **No Group Nesting**: Group parents cannot be added to other groups
2. **No Mixed Selection**: Cannot shift-select when groups are present
3. **No Regrouping**: Already-grouped elements cannot be grouped again
4. **Integrity Maintenance**: Empty groups are automatically cleaned up

### Performance Optimizations

1. **Dynamic Calculations**: Group summaries calculated on-demand, not stored
2. **Efficient Filtering**: Collapsed children hidden without affecting calculations  
3. **Memoized Updates**: Component re-renders minimized with proper dependency tracking
4. **Edit Queue Integration**: All operations batched for optimal performance

### Edge Case Handling

1. **Stale Parent References**: Duplication corrects invalid parent_element_id values
2. **Duration Recalculation**: Group timing updates when children are modified
3. **Empty Groups**: Automatically removed when all children deleted
4. **Single Child Groups**: Automatically ungrouped to maintain logical structure

---

## Implementation Status

### ✅ Fully Implemented Features

1. **Multi-Selection System**
   - ✅ Adjacent element selection with shift+click
   - ✅ Individual selection with regular click
   - ✅ Visual feedback with selection borders
   - ✅ Prevention of problematic group selections

2. **Group Creation & Management**
   - ✅ Custom group naming with validation
   - ✅ 6-color selection palette matching note colors
   - ✅ Live preview of group appearance
   - ✅ Modal integration with validation

3. **Visual Hierarchy**
   - ✅ Group parent elements with custom colors
   - ✅ Child element indentation with color bars
   - ✅ Dynamic summary notes ("Includes X cues and Y notes")
   - ✅ Collapse/expand functionality in all modes

4. **Smart Group Operations**
   - ✅ Cross-group drag operations with automatic membership updates
   - ✅ Group-aware duplication with parent ID correction
   - ✅ Intelligent deletion with group cleanup
   - ✅ Automatic duration calculation and time synchronization

5. **Backend Integration**
   - ✅ CREATE_GROUP operation with element relationship management
   - ✅ TOGGLE_GROUP_COLLAPSE operation
   - ✅ UNGROUP_ELEMENTS operation
   - ✅ Edit queue integration for change tracking

6. **Advanced Features**
   - ✅ No group nesting rule enforcement
   - ✅ Prevention of shift-selection with groups
   - ✅ Dynamic group summary calculation (no database storage)
   - ✅ Collapse state persistence across modes

---

## Technical Challenges Solved

### Challenge 1: Group Summary Notes Persistence
**Problem**: Group summary notes ("Includes X cues") disappeared when groups were collapsed.
**Solution**: Separated visible elements from all elements, passing complete element list for group calculations while showing filtered list for display.

### Challenge 2: Cross-Group Drag Operations  
**Problem**: Moving elements between groups required manual group membership management.
**Solution**: Implemented intelligent drag logic that automatically detects group context and updates membership based on drop position.

### Challenge 3: Group Integrity Maintenance
**Problem**: Empty groups, single-child groups, and stale references created inconsistent state.
**Solution**: Comprehensive cleanup logic that maintains group integrity through all operations including deletion, duplication, and modification.

### Challenge 4: Performance with Dynamic Calculations
**Problem**: Real-time group summary calculations could impact performance.
**Solution**: Dynamic frontend calculation with memoization, eliminating database storage overhead while maintaining accuracy.

---

## Usage Examples

### Basic Grouping
```typescript
// 1. User selects multiple elements
selectedElementIds = ['cue-1', 'cue-2', 'note-1'];

// 2. User opens group creation modal and configures
groupName = "Act 1 Opening";
backgroundColor = "#E53E3E"; // Red

// 3. System creates group operation
const groupOperation = {
    type: 'CREATE_GROUP',
    element_ids: selectedElementIds,
    group_name: groupName,
    background_color: backgroundColor
};

// 4. Group created with parent-child relationships
// Group Parent: "Act 1 Opening" (red background)
// ├─ Cue 1 (red left bar, indented)
// ├─ Cue 2 (red left bar, indented)  
// └─ Note 1 (red left bar, indented)
```

### Advanced Operations
```typescript
// Collapse/expand
toggleGroupCollapse('group-parent-id');

// Group parent dragging (moves entire group with uniform time delta)
// Example: Group parent at 0:10 with children at 0:10, 0:20, 0:30 dragged to 0:40
// 1. Calculates time delta: 0:40 - 0:10 = +30s
// 2. Applies same +30s delta to ALL elements
// 3. Result: Parent 0:40, children at 0:40, 0:50, 1:00
// 4. Maintains exact relative timing relationships

// Cross-group drag (automatic membership update)
// Dragging individual element between groups automatically updates parent_element_id

// Smart cleanup on deletion
// Deleting group parent ungroupes all children
// Deleting all children removes empty group parent
// Deleting all but one child ungroupes remaining child
```

---

## Future Enhancement Opportunities

### Potential Improvements
1. **Keyboard Shortcuts**: Add keyboard shortcuts for common group operations
2. **Group Templates**: Pre-defined group types with standard colors and naming
3. **Nested Groups**: Support for groups within groups (complex implementation)
4. **Bulk Operations**: Select and modify multiple groups simultaneously
5. **Export/Import**: Save and load group configurations

### Performance Enhancements
1. **Virtualization**: For very large scripts with many groups
2. **Lazy Loading**: Load group details on demand
3. **Caching**: Cache group calculations for frequently accessed groups

---

## Conclusion

The Script Element Grouping feature is now **fully implemented and production-ready**. It provides comprehensive group management with intelligent automation, visual organization, and seamless integration with CallMaster's existing systems.

### Key Achievements
- ✅ **Complete Feature Implementation**: All planned functionality delivered
- ✅ **Robust Edge Case Handling**: Comprehensive error prevention and cleanup
- ✅ **Performance Optimized**: Dynamic calculations with minimal overhead  
- ✅ **User Experience**: Intuitive interface with visual feedback
- ✅ **Technical Excellence**: Clean architecture following established patterns

### Production Readiness
The feature has been thoroughly implemented with:
- Full TypeScript type safety
- Comprehensive edge case handling  
- Integration with existing edit queue system
- Visual design consistent with CallMaster UI patterns
- Performance optimizations for real-world usage

**Status**: ✅ Ready for production use  
**Maintenance**: Ongoing monitoring for user feedback and potential optimizations

---

*Last Updated: January 2025*  
*Status: Complete - Production Ready*