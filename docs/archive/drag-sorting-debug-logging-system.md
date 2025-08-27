# Drag Sorting Debug Logging System

## Executive Summary

This document describes the comprehensive debug logging system implemented to diagnose drag-and-drop sorting issues in the authenticated script editing interface. The system provides end-to-end visibility into the complete drag operation flow, from initial drag events through final state persistence.

**Implementation Date**: Current session  
**Purpose**: Debug cases where dragged elements don't "stick" to their dropped positions  
**Scope**: Frontend drag-and-drop operations in EditMode component  
**Log Identifier**: `🔥` prefix for easy filtering  

## Problem Context

Users reported that dragged script elements sometimes don't remain in their dropped positions after drag operations complete. The issue required comprehensive logging to identify whether failures occur in:

1. **Visual dragging** (DOM/React DnD)
2. **Index calculations** (position logic)
3. **Decision logic** (auto-sort/time conflicts)
4. **Edit queue processing** (state management)
5. **Backend persistence** (database sync)

## Architecture Overview

The drag sorting system involves multiple layers:

```
User Drag Action
    ↓
EditMode.tsx (handleDragStart/handleDragEnd)
    ↓
applyReorderDirect (operation creation)
    ↓
useScriptElementsWithEditQueue.ts (edit queue processing)
    ↓
Backend API (persistence)
```

## Implementation Details

### 1. EditMode.tsx - Primary Drag Logic

**File**: `/frontend/src/features/script/components/modes/EditMode.tsx`

#### handleDragStart Function
**Location**: Lines ~258-286
**Purpose**: Track drag initiation and element identification

```typescript
// ADDED: Comprehensive drag start logging
console.log("🔥 DRAG START", {
    elementId: active.id,
    elementName: draggedElement?.element_name,
    elementType: (draggedElement as any)?.element_type,
    sequence: draggedElement?.sequence,
    offsetMs: draggedElement?.offset_ms,
    isGroup: isGroupParent,
    isExpanded,
    totalDisplayElements: displayElements.length,
    autoSortEnabled: autoSortCues
});
```

**Data Tracked**:
- Element identification (ID, name, type)
- Current position (sequence, offset)
- Context (total elements, auto-sort status)
- Group/expansion state

#### handleDragEnd Function
**Location**: Lines ~289-417
**Purpose**: Track complete drop logic and decision tree

**Initial Drop Validation**:
```typescript
// ADDED: Drop target validation logging
console.log("🔥 DRAG END", {
    activeId: active.id,
    overId: over?.id,
    samePosition: active.id === over?.id,
    hasOverTarget: !!over
});

// ADDED: Early exit logging
if (!over || active.id === over.id) {
    console.log("🔥 DRAG CANCELLED - No drop target or same position");
    // ... cleanup
    return;
}
```

**Index Calculation Logging**:
```typescript
// ADDED: Index calculation validation
console.log("🔥 DRAG INDICES", {
    oldIndex,
    overIndex,
    totalElements: elementsForDrag.length,
    validIndices: oldIndex !== -1 && overIndex !== -1
});

// ADDED: Dragged element details
console.log("🔥 DRAGGED ELEMENT", {
    elementId: draggedEl.element_id,
    elementName: draggedEl.element_name,
    currentSequence: draggedEl.sequence,
    currentOffsetMs: draggedEl.offset_ms,
    fromIndex: oldIndex,
    toIndex: overIndex
});
```

**Array Move Validation**:
```typescript
// ADDED: Array move result verification
console.log("🔥 ARRAY MOVE RESULT", {
    oldIndex,
    overIndex,
    newIndex,
    elementMovedToCorrectPosition: newIndex === overIndex
});
```

**Neighbor Analysis**:
```typescript
// ADDED: Neighbor element context
console.log("🔥 NEIGHBOR ELEMENTS", {
    elementAbove: elementAbove ? {
        id: elementAbove.element_id,
        name: elementAbove.element_name,
        offsetMs: elementAbove.offset_ms
    } : null,
    elementBelow: elementBelow ? {
        id: elementBelow.element_id,
        name: elementBelow.element_name,
        offsetMs: elementBelow.offset_ms
    } : null
});
```

**Decision Logic Tracking**:
```typescript
// ADDED: Time offset conflict analysis
console.log("🔥 TIME OFFSET ANALYSIS", {
    draggedTimeOffset,
    aboveTimeOffset: aboveTimeOffset ?? 'N/A',
    belowTimeOffset: belowTimeOffset ?? 'N/A',
    allHaveSameTimeOffset,
    autoSortEnabled: autoSortCues,
    willProceedDirectly: allHaveSameTimeOffset || !autoSortCues,
    willShowModal: !allHaveSameTimeOffset && autoSortCues
});

// ADDED: Decision branch logging
if (allHaveSameTimeOffset || !autoSortCues) {
    console.log("🔥 PROCEEDING WITH DIRECT REORDER");
    // ... direct reorder logic
    console.log("🔥 DIRECT REORDER COMPLETED");
    return;
}

console.log("🔥 SHOWING DRAG MODAL - Time conflicts detected");
```

#### applyReorderDirect Function
**Location**: Lines ~518-601
**Purpose**: Track edit queue operation creation and submission

```typescript
// ADDED: Function entry logging
console.log("🔥 APPLY REORDER DIRECT - START", {
    elementId: draggedElement?.element_id,
    elementName: draggedElement?.element_name,
    hasEditQueue: !!onApplyLocalChange
});

// ADDED: Sequence calculation validation
console.log("🔥 SEQUENCE CALCULATION", {
    newIndex,
    oldSequence,
    newSequence,
    sequenceChanged: newSequence !== oldSequence,
    currentElementExists: !!currentElement,
    reorderedElementsCount: reorderedElements.length
});

// ADDED: Early exit for unchanged sequences
if (newSequence === oldSequence) {
    console.log("🔥 REORDER SKIPPED - Sequence unchanged");
    return;
}

// ADDED: Group operation tracking
console.log("🔥 GROUP REORDER", {
    isGroupParent,
    childrenCount: groupChildren.length,
    groupChildren: groupChildren.map(child => ({
        id: child.element_id,
        name: child.element_name,
        sequence: child.sequence
    }))
});

// ADDED: Operation submission logging
console.log("🔥 SUBMITTING REORDER OPERATION", {
    operation: reorderOperation,
    isGroup: isGroupParent,
    hasChildren: reorderOperation.group_children?.length > 0
});

onApplyLocalChange(reorderOperation);
console.log("🔥 REORDER OPERATION SUBMITTED TO EDIT QUEUE");
```

#### Modal Choice Handlers
**Location**: Lines ~420-542
**Purpose**: Track user choices when time conflicts occur

```typescript
// ADDED: Modal choice logging
const handleDisableAutoSort = async () => {
    console.log("🔥 MODAL CHOICE - Disable Auto Sort", {
        willDisableAutoSort: !!onAutoSortChange
    });
    // ... existing logic
};

const handleMatchBefore = async () => {
    console.log("🔥 MODAL CHOICE - Match Before", {
        hasElementAbove: !!elementAbove,
        elementAbove: elementAbove ? {
            id: elementAbove.element_id,
            name: elementAbove.element_name,
            offsetMs: elementAbove.offset_ms
        } : null,
        draggedElement: draggedElement ? {
            id: draggedElement.element_id,
            name: draggedElement.element_name,
            currentOffsetMs: draggedElement.offset_ms
        } : null
    });
    
    // ... operation creation
    console.log("🔥 SUBMITTING TIME OFFSET UPDATE - Match Before", updateElementOperation);
    // ... existing logic
};

// Similar logging added to handleMatchAfter and handleCustomTime
```

### 2. useScriptElementsWithEditQueue.ts - Edit Queue Processing

**File**: `/frontend/src/features/script/hooks/useScriptElementsWithEditQueue.ts`

#### applyOperationToElements Function
**Location**: Lines ~522-713
**Purpose**: Track edit queue operation processing

**REORDER Case Entry**:
```typescript
// ADDED: Operation processing start
case "REORDER":
    const reorderOp = operation as any;
    console.log("🔥 EDIT QUEUE - Processing REORDER operation", {
        operationType: operation.type,
        elementId: operation.element_id,
        oldSequence: reorderOp.old_sequence,
        newSequence: reorderOp.new_sequence,
        isGroupParent: reorderOp.is_group_parent,
        groupChildrenCount: reorderOp.group_children?.length || 0,
        totalElementsBeforeReorder: elements.length
    });

    // ... element lookup
    
    if (!elementToMove) {
        console.log("🔥 EDIT QUEUE - REORDER FAILED: Element not found", {
            elementId: operation.element_id,
            availableElementIds: elements.map(el => el.element_id)
        });
        return elements;
    }
```

**REORDER Case Completion**:
```typescript
// ADDED: Operation completion logging
const finalResult = updatedElements;

console.log("🔥 EDIT QUEUE - REORDER operation completed", {
    originalSequence: reorderOp.old_sequence,
    targetSequence: reorderOp.new_sequence,
    actualFinalSequence: finalResult.find(el => el.element_id === operation.element_id)?.sequence,
    totalElementsAfterReorder: finalResult.length,
    isGroupParent,
    elementOrderAfterReorder: finalResult.map((el, idx) => ({
        index: idx,
        id: el.element_id,
        name: el.element_name,
        sequence: el.sequence
    }))
});

return finalResult;
```

## Log Flow Analysis

### Successful Drag Operation Example

```
🔥 DRAG START → Element identification and context
🔥 DRAG END → Drop validation
🔥 DRAG INDICES → Position calculations  
🔥 DRAGGED ELEMENT → Element details
🔥 ARRAY MOVE RESULT → Visual reorder validation
🔥 NEIGHBOR ELEMENTS → Context analysis
🔥 TIME OFFSET ANALYSIS → Conflict detection
🔥 PROCEEDING WITH DIRECT REORDER → Decision branch
🔥 APPLY REORDER DIRECT - START → Operation setup
🔥 SEQUENCE CALCULATION → Target position logic
🔥 SUBMITTING REORDER OPERATION → Edit queue submission
🔥 REORDER OPERATION SUBMITTED TO EDIT QUEUE → Confirmation
🔥 EDIT QUEUE - Processing REORDER operation → Queue processing
🔥 EDIT QUEUE - REORDER operation completed → Final state
🔥 DIRECT REORDER COMPLETED → Success confirmation
```

### Key Success Indicators

1. **Index Alignment**: `elementMovedToCorrectPosition: true`
2. **Sequence Mapping**: `actualFinalSequence` matches `targetSequence`
3. **No Early Exits**: All log statements in sequence without cancellation logs
4. **Edit Queue Success**: Operation processed without "FAILED" logs

### Failure Pattern Indicators

**Visual Drag Issues**:
- `🔥 DRAG CANCELLED` logs
- `validIndices: false`
- `elementMovedToCorrectPosition: false`

**Logic Issues**:
- `🔥 REORDER SKIPPED - Sequence unchanged`
- Mismatched `actualFinalSequence` vs `targetSequence`
- `🔥 EDIT QUEUE - REORDER FAILED: Element not found`

**Timing Conflicts**:
- `🔥 SHOWING DRAG MODAL` instead of direct reorder
- Modal choice logs without subsequent operation submission

## Usage Instructions

### Activating Debug Mode

Debug logs are automatically active when the code is deployed. No configuration required.

### Filtering Console Output

**Chrome DevTools**:
```
🔥
```
Use this filter in the console to show only drag-related logs.

### Log Interpretation

**Index Issues**: Look for `elementMovedToCorrectPosition: false` or `validIndices: false`
**Sequence Issues**: Compare `targetSequence` with `actualFinalSequence`
**Edit Queue Issues**: Look for "FAILED" or "Element not found" messages
**Decision Logic Issues**: Check `willProceedDirectly` vs actual flow path

## Debugging Workflow

### Step 1: Reproduce Issue
Perform the drag operation that doesn't "stick"

### Step 2: Collect Full Log Sequence
Copy complete console output from `🔥 DRAG START` through final completion

### Step 3: Analyze Key Checkpoints
- **Visual Drag**: Did indices calculate correctly?
- **Decision Logic**: Did it take the right path (direct vs modal)?
- **Edit Queue**: Did the operation process successfully?
- **Final State**: Does final sequence match intended sequence?

### Step 4: Identify Failure Point
The logs will show exactly where the operation diverged from expected behavior

## Code Removal Instructions

When debugging is complete, remove all lines containing:
- `console.log("🔥`
- Associated multi-line console.log statements with the fire emoji prefix

**Files to Clean**:
1. `/frontend/src/features/script/components/modes/EditMode.tsx`
2. `/frontend/src/features/script/hooks/useScriptElementsWithEditQueue.ts`

**Removal Method**: Manual line-by-line editing (never use automated tools like sed)

## Performance Impact

**Console Output**: Moderate - generates 10-15 log statements per drag operation
**Runtime Impact**: Minimal - logging operations are lightweight
**Recommendation**: Remove after debugging is complete to reduce console noise

## Future Considerations

### Permanent Logging
Consider keeping minimal logging for critical checkpoints:
- Operation failures
- Sequence mismatches
- Edit queue errors

### Enhancement Opportunities
- Add visual indicators in UI for debugging mode
- Export log sequences to external files
- Add performance timing measurements
- Create automated test cases based on log patterns

## Files Modified

### Frontend
- `/frontend/src/features/script/components/modes/EditMode.tsx`: Complete drag event flow logging
- `/frontend/src/features/script/hooks/useScriptElementsWithEditQueue.ts`: Edit queue processing logging

## Conclusion

This debug logging system provides complete visibility into the drag sorting operation pipeline. It enables rapid identification of where drag operations fail and provides the detailed context needed to implement targeted fixes.

The system has proven effective in confirming successful operations and will be equally valuable for diagnosing failure cases when they occur during testing.