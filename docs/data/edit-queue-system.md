# Edit Queue System

**Date:** July 2025  
**Status:** Implemented  
**Category:** Data Architecture & Editing System

The Edit Queue System provides professional non-destructive editing capabilities for script management, allowing users to make changes locally, review them, and save when ready.

## Overview

The Edit Queue System transforms CallMaster from a real-time editing system to a professional workflow similar to advanced editing software like Photoshop or Premiere Pro. All changes are held in memory until the user explicitly saves, enabling experimentation without fear of data loss.

## Key Benefits

### Non-Destructive Editing
- All changes held in local memory until save
- Users can freely experiment without risk
- Complete rollback capability if needed

### Professional Undo/Redo System
- Full operation reversal with precise state tracking
- Sequential operation history
- Batch operation support for complex changes

### Comprehensive Audit Trail
- Complete change history with timestamps
- Human-readable operation descriptions
- Exportable change logs for documentation

### Performance Optimization
- Batch saves reduce server load vs real-time writes
- Optimistic updates for immediate UI feedback
- Efficient bitmap operations for boolean preferences

## Architecture Components

### 1. Edit Operations Data Structure

Located in `frontend/src/types/editQueue.ts`

```typescript
interface BaseEditOperation {
    id: string;
    timestamp: number;
    elementId: string;
    description: string;
}

type EditOperation = 
    | ReorderOperation 
    | UpdateFieldOperation 
    | CreateElementOperation 
    | DeleteElementOperation 
    | UpdateTimeOffsetOperation
    | BulkReorderOperation;
```

#### Operation Types

**ReorderOperation**: Single element position changes
- Tracks old/new index and sequence values
- Enables precise undo functionality

**UpdateFieldOperation**: Field value changes
- Stores old and new values for any element field
- Supports complex field types (text, numbers, colors, etc.)

**UpdateTimeOffsetOperation**: Time-specific changes
- Specialized for timing adjustments
- Preserves precise millisecond values

**CreateElementOperation**: New element creation
- Stores complete element data for undo
- Handles element type validation

**DeleteElementOperation**: Element removal
- Preserves full element data for restoration
- Maintains position information for proper undo

**BulkReorderOperation**: Multiple element changes
- Efficient handling of complex drag operations
- Batch processing for performance

### 2. Human-Readable Formatters

Located in `frontend/src/utils/editQueueFormatter.ts`

The formatter converts technical operations into user-friendly descriptions:

```typescript
// Technical operation
{ type: 'UPDATE_FIELD', field: 'timeOffsetMs', oldValue: 135000, newValue: 150000 }

// Becomes
"Updated 'Opening Song' time from 2:15 to 2:30"
```

#### Formatting Features

**Context-Aware Descriptions**: Include element names and meaningful context
**Field-Specific Formatting**: Time, duration, color, and text formatting
**Value Truncation**: Long values abbreviated for readability
**Operation Summaries**: Multi-operation summaries for batch changes

### 3. Edit Queue Hook

Located in `frontend/src/hooks/useEditQueue.ts`

Manages the operation queue with:
- Sequential operation tracking
- Undo/redo state management
- Batch operation support
- Operation formatting utilities

```typescript
const editQueue = useEditQueue();

// Add operations
editQueue.addOperation({
    type: 'UPDATE_FIELD',
    elementId: 'elem123',
    field: 'description',
    oldValue: 'Old text',
    newValue: 'New text'
});

// Undo/redo
const undoneOp = editQueue.undo();
const redoneOp = editQueue.redo();
```

### 4. Script Elements Integration

Located in `frontend/src/hooks/useScriptElementsWithEditQueue.ts`

Provides unified interface combining server state with local changes:

```typescript
const {
    elements,           // Current view (server + local changes)
    serverElements,     // Original server state
    pendingOperations,  // Queued changes
    hasUnsavedChanges, // Save button state
    saveChanges,       // Batch save function
    discardChanges     // Rollback function
} = useScriptElementsWithEditQueue(scriptId);
```

#### State Management Pattern

```
Current View = Server State + Applied Operations
```

Operations are applied sequentially to server data to compute the current view, enabling:
- Immediate UI feedback
- Precise undo functionality
- Complete state reconstruction

### 5. Save Button System

Located in `frontend/src/components/SaveButton.tsx`

Provides consistent save functionality across all views:

**Full Save Button**: Complete interface with discard option
**Compact Save Button**: Toolbar-optimized version
**State Indicators**: Visual feedback for unsaved changes
**Loading States**: Progress indication during save operations

```typescript
<SaveButton 
    hasUnsavedChanges={hasUnsavedChanges}
    onSave={saveChanges}
    onDiscard={discardChanges}
    summary={operationSummary}
/>
```

### 6. Edit History View

Located in `frontend/src/components/EditHistoryView.tsx`

Read-only interface for reviewing pending changes:

**Operation List**: Chronological change history with compact single-row layout
**Copy Functionality**: Export change logs to clipboard
**Visual Indicators**: Color-coded operation type badges and timestamps
**Summary Statistics**: Change counts and categories

#### Visual Design

**Compact Layout**: Each operation displays on a single row with:
- Numbered circle icon (28px, blue background)
- Color-coded operation type badge
- Timestamp (medium weight, gray.600)
- Human-readable description

#### Color-Coded Operation Types

The edit history uses an intuitive color theme to help users quickly identify operation types:

| Color | Operation Types | Purpose | Examples |
|-------|----------------|---------|----------|
| 🟢 **Green** | `CREATE_ELEMENT`, `DUPLICATE_ELEMENT` | Additive/Creative operations | Adding new cues, duplicating elements |
| 🔵 **Blue** | `UPDATE_FIELD`, `UPDATE_TIME_OFFSET` | Modifications/Updates | Changing descriptions, adjusting timing |
| 🟣 **Purple** | `REORDER`, `BULK_REORDER` | Structural/Organization | Moving elements, reordering lists |
| 🔴 **Red** | `DELETE_ELEMENT`, `REMOVE_ELEMENT` | Destructive operations | Removing cues, deleting notes |
| 🟠 **Orange** | `BATCH_UPDATE`, `MERGE_ELEMENTS` | Complex/Batch operations | Multiple simultaneous changes |
| 🟦 **Teal** | `IMPORT_ELEMENTS`, `EXPORT_ELEMENTS`, `SYNC_ELEMENTS` | Import/Export/System | Data synchronization |
| 🟡 **Yellow** | `VALIDATE_ELEMENTS`, `REVIEW_CHANGES` | Caution/Review operations | Validation checks, reviews |
| ⚫ **Gray** | Unknown operations | System/Fallback | Unrecognized operation types |

**Color Philosophy**: 
- Green = Creation/Addition (positive actions)
- Blue = Modification (neutral changes)  
- Purple = Organization (structural changes)
- Red = Deletion (destructive actions)
- Orange = Complex operations (multiple changes)
- Teal = System operations (import/export)
- Yellow = Caution operations (requires attention)
- Gray = Unknown/fallback

## Implementation Details

### Data Source Priority - Critical Principle

**The current view state is the authoritative source of truth, not the original database values.**

When displaying data or making calculations in components:

❌ **Never reference original/stored values directly for display**
```typescript
// WRONG - uses stored database value
if (element.duration) {
    return formatDuration(element.duration);
}
```

✅ **Always use computed current state that includes edit queue changes**
```typescript
// CORRECT - uses current state with edit queue applied
const currentDuration = getCurrentElementDuration(element, currentScript);
return formatDuration(currentDuration);
```

**Why this matters:**
- Original database values don't reflect pending user changes
- Edit queue operations update logical state but stored values remain unchanged until save
- Components must prioritize current computed state over stored database values
- Only use original values for change detection (highlighting save buttons, etc.)

**Common Pitfall:** Components with fallback logic that checks stored values first will display stale data:
```typescript
// PROBLEMATIC - stored value takes precedence over current state
if (element.storedField) {
    return element.storedField; // ❌ Shows old database value
} else if (computedCurrentValue) {
    return computedCurrentValue; // ✅ This logic never runs
}
```

**Solution:** Prioritize current/computed values over stored values for display logic.

### Operation Application

Operations are applied in sequence to transform server state:

```typescript
function applyOperationToElements(elements: ScriptElement[], operation: EditOperation): ScriptElement[] {
    switch (operation.type) {
        case 'REORDER':
            // Move element and update sequences
            break;
        case 'UPDATE_FIELD':
            // Update specific field value
            break;
        // ... other operation types
    }
}
```

### Undo/Redo Implementation

The system maintains a current index in the operations array:
- **Undo**: Decrements index, excludes operation from view
- **Redo**: Increments index, includes operation in view
- **New Operation**: Truncates array from current index, adds operation

### Batch Save Protocol

When saving, the system:
1. Collects all pending operations
2. Sends batch request to `/api/scripts/{id}/elements/batch-update`
3. Clears local queue on success
4. Refreshes from server to ensure consistency
5. Rolls back on failure with error handling

## Script Info Operations

### UPDATE_SCRIPT_INFO Operation

The edit queue system supports script metadata changes through a specialized operation type:

```typescript
interface UpdateScriptInfoOperation extends BaseEditOperation {
    type: 'UPDATE_SCRIPT_INFO';
    elementId: 'script-info';
    changes: Record<string, { oldValue: any; newValue: any }>;
}
```

#### Script Metadata Fields

Supported script information fields:
- `scriptName`: Script title with validation (4-100 characters)
- `scriptStatus`: Script status (DRAFT, ACTIVE, ARCHIVED, etc.)
- `startTime`: Script start time (ISO datetime)
- `endTime`: Script end time (ISO datetime)
- `scriptNotes`: Optional notes field (0-500 characters)

#### Collective Form Change Handling

When exiting Info mode with unsaved changes, all modified fields are batched into a single operation:

```typescript
const handleInfoModeExit = (targetModeId: string) => {
    // Create collective operation for all form changes
    const formChanges = {
        scriptName: {
            oldValue: changeDetectionBaseData.scriptName,
            newValue: form.formData.scriptName
        },
        scriptStatus: {
            oldValue: changeDetectionBaseData.scriptStatus,
            newValue: form.formData.scriptStatus
        },
        // ... other fields
    };

    // Filter out unchanged fields
    const actualChanges = Object.fromEntries(
        Object.entries(formChanges).filter(([_, values]) => 
            values.oldValue !== values.newValue
        )
    );

    if (Object.keys(actualChanges).length > 0) {
        applyLocalChange({
            type: 'UPDATE_SCRIPT_INFO',
            elementId: 'script-info',
            changes: actualChanges
        });
    }
};
```

## Auto-Sort Operations

### Auto-Sort State Management

The edit queue system tracks auto-sort preference changes through specialized operations:

```typescript
interface EnableAutoSortOperation extends BaseEditOperation {
    type: 'ENABLE_AUTO_SORT';
    elementId: 'auto-sort-preference';
    oldPreferenceValue: boolean;
    newPreferenceValue: boolean;
    elementMoves?: Array<{
        elementId: string;
        oldIndex: number;
        newIndex: number;
        oldSequence: number;
        newSequence: number;
    }>;
}

interface DisableAutoSortOperation extends BaseEditOperation {
    type: 'DISABLE_AUTO_SORT';
    elementId: 'auto-sort-preference';
    oldPreferenceValue: boolean;
    newPreferenceValue: boolean;
}
```

#### Immediate Element Reordering

When auto-sort is enabled, elements are immediately reordered by time offset:

```typescript
const handleAutoSortElements = useCallback(async () => {
    // Sort elements by timeOffsetMs
    const sortedElements = [...currentElements].sort((a, b) => a.timeOffsetMs - b.timeOffsetMs);
    
    // Check if reordering is needed
    const needsReordering = currentElements.some((element, index) => 
        element.elementID !== sortedElements[index].elementID
    );

    if (needsReordering) {
        // Create element move operations
        const elementChanges = [];
        for (let newIndex = 0; newIndex < sortedElements.length; newIndex++) {
            const element = sortedElements[newIndex];
            const oldIndex = currentElements.findIndex(el => el.elementID === element.elementID);
            
            if (oldIndex !== newIndex) {
                elementChanges.push({
                    elementId: element.elementID,
                    oldIndex,
                    newIndex,
                    oldSequence: oldIndex + 1,
                    newSequence: newIndex + 1
                });
            }
        }

        // Apply compound operation: preference change + resulting sort
        applyLocalChange({
            type: 'ENABLE_AUTO_SORT',
            elementId: 'auto-sort-preference',
            oldPreferenceValue: false,
            newPreferenceValue: true,
            elementMoves: elementChanges
        });
    }
}, [/* dependencies */]);
```

#### Dynamic Auto-Sort State Calculation

The current auto-sort state is calculated from edit queue operations:

```typescript
const currentAutoSortState = useMemo(() => {
    let currentState = autoSortCues; // Base preference value
    
    // Check for any auto-sort operations in pending operations
    for (const operation of pendingOperations) {
        if (operation.type === 'ENABLE_AUTO_SORT' || operation.type === 'DISABLE_AUTO_SORT') {
            currentState = (operation as any).newPreferenceValue;
        }
    }
    
    return currentState;
}, [autoSortCues, pendingOperations]);
```

### Preview Preferences System

The options modal supports preview functionality without immediate persistence:

```typescript
// Preview preferences for options modal
const [previewPreferences, setPreviewPreferences] = useState<UserPreferences | null>(null);

// Use preview preferences when options modal is open
const activePreferences = useMemo(() =>
    modalState.isOpen(MODAL_NAMES.OPTIONS) && previewPreferences
        ? previewPreferences
        : { darkMode, colorizeDepNames, showClockTimes, autoSortCues: currentAutoSortState }
    , [modalState, previewPreferences, darkMode, colorizeDepNames, showClockTimes, currentAutoSortState]);
```

## Usage Examples

### Basic Field Update

```typescript
// User changes element description
editQueue.addOperation({
    type: 'UPDATE_FIELD',
    elementId: element.elementID,
    field: 'description',
    oldValue: 'Old Description',
    newValue: 'New Description'
});
```

### Script Info Update

```typescript
// User changes script metadata in Info mode
editQueue.addOperation({
    type: 'UPDATE_SCRIPT_INFO',
    elementId: 'script-info',
    changes: {
        scriptName: {
            oldValue: 'Old Script Name',
            newValue: 'New Script Name'
        },
        scriptNotes: {
            oldValue: '',
            newValue: 'Added notes about the script'
        }
    }
});
```

### Element Reordering

```typescript
// Drag and drop reorder
editQueue.addOperation({
    type: 'REORDER',
    elementId: draggedElement.elementID,
    oldIndex: 2,
    newIndex: 5,
    oldSequence: 3,
    newSequence: 6
});
```

### Auto-Sort Enabling

```typescript
// Enable auto-sort with immediate reordering
editQueue.addOperation({
    type: 'ENABLE_AUTO_SORT',
    elementId: 'auto-sort-preference',
    oldPreferenceValue: false,
    newPreferenceValue: true,
    elementMoves: [
        {
            elementId: 'elem-123',
            oldIndex: 3,
            newIndex: 1,
            oldSequence: 4,
            newSequence: 2
        }
        // ... other moved elements
    ]
});
```

### Batch Operations

```typescript
// Complex multi-element change
editQueue.startBatch();
elements.forEach(el => {
    editQueue.addOperation({
        type: 'UPDATE_FIELD',
        elementId: el.elementID,
        field: 'departmentID',
        oldValue: el.departmentID,
        newValue: newDepartmentID
    });
});
editQueue.endBatch('Updated department for all elements');
```

## User Interface Integration

### ManageScript Page

The edit history is accessible through a dedicated "History" mode:
- History icon in toolbar (clock/document icon)
- Read-only view of all pending changes
- Copy functionality for change documentation
- Summary statistics and operation counts

### Mode Integration

```typescript
{activeMode === 'history' && (
    <EditHistoryView 
        operations={pendingOperations} 
        allElements={elements} 
        summary={EditQueueFormatter.formatOperationsSummary(pendingOperations)} 
    />
)}
```

## Error Handling

### Save Failures
- Operations remain in queue
- User notified of failure
- Retry functionality available
- No data loss on network issues

### Invalid Operations
- Type checking prevents invalid operations
- Element existence validation
- Field validation before application
- Graceful degradation for missing data

## Performance Considerations

### Memory Management
- Operations are lightweight objects
- Automatic cleanup on save
- Configurable queue size limits
- Efficient string formatting

### UI Responsiveness
- Optimistic updates for immediate feedback
- Background save processing
- Non-blocking operation application
- Minimal re-renders through React optimization

## Future Enhancements

### Advanced Features
- Operation search and filtering
- Change conflict resolution
- Multi-user collaboration support
- Automatic save intervals
- Change branching and merging

### Integration Opportunities
- Version control integration
- Change approval workflows
- Automated testing of changes
- Performance analytics
- User behavior insights

## Migration from Real-Time System

The edit queue system is designed to coexist with the existing real-time system:

1. **Gradual Migration**: Components can adopt edit queue incrementally
2. **Backward Compatibility**: Existing API endpoints remain functional
3. **Feature Flags**: Toggle between real-time and queued editing
4. **Data Consistency**: Server validation ensures data integrity
5. **User Choice**: Users can choose their preferred editing mode

This architecture provides a solid foundation for professional script editing while maintaining the flexibility to support various user workflows and preferences.