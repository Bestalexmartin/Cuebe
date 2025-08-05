# Script Mode System

**Date:** July 2025  
**Status:** Implemented  
**Category:** Features & User Interface

## Overview

The Script Mode System is the core interface paradigm for CallMaster's script management functionality. It provides 6 specialized modes, each optimized for specific tasks and user workflows. The system is implemented in the ManageScriptPage component and provides seamless transitions between different operational contexts.

## Architecture

### Mode State Management

The mode system is managed through the `useScriptModes` hook:

```typescript
// Located in frontend/src/features/script/hooks/useScriptModes.ts
const { activeMode, setActiveMode } = useScriptModes('view'); // Default to view mode
```

### Mode Types

```typescript
type ScriptMode = 'info' | 'view' | 'edit' | 'play' | 'share' | 'history';
```

## Mode Definitions

### 1. Info Mode (`info`)

**Purpose**: Script metadata editing and validation

#### Features
- **Form-based interface** for script metadata
- **Real-time validation** with field-level error handling
- **Change detection** to track modifications
- **Auto-save to edit queue** on mode exit

#### Form Fields
- **Script Name**: Required, 4-100 characters, with validation
- **Script Status**: Dropdown selection (DRAFT, ACTIVE, ARCHIVED, etc.)
- **Start Time**: DateTime picker for script start
- **End Time**: DateTime picker for script end
- **Notes**: Optional textarea, 0-500 characters

#### Implementation
```typescript
// Component: InfoMode
// Location: frontend/src/features/script/components/modes/InfoMode.tsx
interface InfoModeProps {
    form: ReturnType<typeof useValidatedForm<ScriptFormData>>;
}

// Validation configuration
const VALIDATION_CONFIG: FormValidationConfig = {
    scriptName: {
        required: true,
        rules: [
            ValidationRules.minLength(4),
            ValidationRules.maxLength(100)
        ]
    },
    scriptNotes: {
        required: false,
        rules: [ValidationRules.maxLength(500)]
    }
};
```

#### Exit Behavior
When leaving Info mode with unsaved changes:
1. **Change Detection**: Compares current form state vs. original data
2. **Operation Creation**: Batches all changes into `UPDATE_SCRIPT_INFO` operation
3. **Edit Queue Addition**: Adds operation to edit queue for batch saving
4. **Mode Transition**: Proceeds to target mode

### 2. View Mode (`view`)

**Purpose**: Read-only script visualization and review

#### Features
- **Non-interactive elements** (selection and editing disabled)
- **Department colorization** based on user preferences
- **Clock time display** when script start time is available
- **Scroll state tracking** for navigation controls
- **Performance optimized** for large script lists

#### Interaction Restrictions
```typescript
// All interactive behaviors disabled via CSS
css={{
    '& > *': {
        userSelect: 'none !important',
        pointerEvents: 'none !important',
        cursor: 'default !important',
        '&:hover': { /* No hover effects */ },
        '&:active': { /* No active effects */ },
        '&:focus': { /* No focus effects */ }
    }
}}
```

#### Implementation
```typescript
// Component: ViewMode
// Location: frontend/src/features/script/components/modes/ViewMode.tsx
interface ViewModeProps {
    scriptId: string;
    colorizeDepNames?: boolean;
    showClockTimes?: boolean;
    elements?: ScriptElement[];
    script?: any;
    onScrollStateChange?: (state: ScrollState) => void;
}
```

#### Scroll State Management
```typescript
const checkScrollState = () => {
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    const isAtTop = scrollTop <= 1;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
    const allElementsFitOnScreen = scrollHeight <= clientHeight;
    
    onScrollStateChange({ isAtTop, isAtBottom, allElementsFitOnScreen });
};
```

### 3. Edit Mode (`edit`)

**Purpose**: Full script editing with advanced interaction capabilities

#### Features
- **Element selection** with visual feedback
- **Drag-and-drop reordering** with gesture detection
- **Context-sensitive editing** tools
- **Auto-sort integration** with time-based ordering
- **Edit queue integration** for non-destructive editing

#### Selection System
```typescript
const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

// Selection handling
const handleSelection = (elementId: string) => {
    const newId = selectedElementId === elementId ? null : elementId;
    setSelectedElementId(newId);
    onSelectionChange?.(newId);
};
```

#### Drag-and-Drop Implementation
Uses `@dnd-kit` for sophisticated drag operations:

```typescript
// Sensors for drag detection
const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
    })
);

// Drag end handling with auto-sort logic
const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Calculate new position and surrounding elements
    const oldIndex = localElements.findIndex(el => el.elementID === active.id);
    const newIndex = localElements.findIndex(el => el.elementID === over.id);
    
    // Auto-sort conflict detection
    const allHaveSameTimeOffset = checkTimeOffsetConflict(draggedEl, elementAbove, elementBelow);
    
    if (allHaveSameTimeOffset || !autoSortCues) {
        await applyReorderDirect(pendingReorderData, draggedEl);
    } else {
        // Show drag reorder modal for time offset conflicts
        setDragModalOpen(true);
    }
};
```

#### Auto-Sort Integration
```typescript
// Auto-sort toggle with immediate reordering
const handleAutoSortToggle = useCallback(async (value: boolean) => {
    if (value && !activePreferences.autoSortCues && scriptId) {
        handleAutoSortElements(); // Immediate reorder
    } else if (!value && activePreferences.autoSortCues) {
        // Create disable operation for edit history
        const disableOperation = {
            type: 'DISABLE_AUTO_SORT',
            elementId: 'auto-sort-preference',
            oldPreferenceValue: true,
            newPreferenceValue: false
        };
        applyLocalChange(disableOperation);
    }
    
    await updatePreference('autoSortCues', value);
}, [/* dependencies */]);
```

### 4. Play Mode (`play`)

**Purpose**: Script playback and performance interface

#### Current Implementation
- **Basic UI structure** in place
- **Placeholder component** for future development
- **Integration points** prepared for playback controls

#### Future Features (Planned)
- Real-time script following
- Playback controls (play, pause, seek)
- Time synchronization with external systems
- Performance timing tracking

### 5. Share Mode (`share`)

**Purpose**: Script sharing and collaboration interface

#### Current Implementation
- **Basic UI structure** in place
- **Placeholder component** for future development
- **Integration points** prepared for sharing functionality

#### Future Features (Planned)
- Export to various formats (PDF, CSV, etc.)
- Share links generation
- Collaboration permissions
- Real-time collaborative editing

### 6. History Mode (`history`)

**Purpose**: Edit queue visualization and management

#### Features
- **Operation history display** with chronological listing
- **Revert to point** functionality
- **Clear history** with two-tier confirmation
- **Operation summaries** with human-readable descriptions

#### Implementation
```typescript
// Component: EditHistoryView
// Location: frontend/src/components/EditHistoryView.tsx
{activeMode === 'history' && (
    <EditHistoryView 
        operations={pendingOperations} 
        allElements={editQueueElements} 
        summary={EditQueueFormatter.formatOperationsSummary(pendingOperations)} 
        onRevertToPoint={revertToPoint}
        onRevertSuccess={() => setActiveMode('edit')}
    />
)}
```

#### Clear History Workflow
```typescript
const handleClearHistory = () => {
    modalState.openModal(MODAL_NAMES.CLEAR_HISTORY);
};

const handleFinalClearHistoryConfirm = () => {
    discardChanges(); // Clear the edit queue
    modalState.closeModal(MODAL_NAMES.FINAL_CLEAR_HISTORY);
    setActiveMode('view'); // Return to view mode
    showSuccess('Edit History Cleared', 'All changes have been discarded.');
};
```

## Mode Transition Logic

### Central Mode Handler

```typescript
const handleModeChange = (modeId: string) => {
    // Handle EXIT button (navigation)
    if (modeId === 'exit') {
        handleCancel();
        return;
    }

    // Handle separators (do nothing)
    if (modeId === 'separator' || modeId === 'nav-separator') {
        return;
    }

    // Handle view state transitions
    if (['view', 'info', 'edit', 'history'].includes(modeId)) {
        // Check for Info mode unsaved changes
        if (activeMode === 'info' && modeId !== 'info' && hasChanges) {
            handleInfoModeExit(modeId);
            return;
        }
        
        setActiveMode(modeId);
        return;
    }

    // Handle navigation controls
    if (modeId === 'jump-top' || modeId === 'jump-bottom') {
        handleJump(modeId === 'jump-top' ? 'top' : 'bottom');
        return;
    }

    // Handle mode-specific tools
    handleModeSpecificActions(modeId);
};
```

### Info Mode Exit Handling

Special logic for handling unsaved changes when leaving Info mode:

```typescript
const handleInfoModeExit = (targetModeId: string) => {
    if (!hasChanges || !changeDetectionBaseData) {
        setActiveMode(targetModeId as any);
        return;
    }

    // Create collective operation for all form changes
    const formChanges = {
        scriptName: {
            oldValue: changeDetectionBaseData.scriptName,
            newValue: form.formData.scriptName
        },
        // ... other fields
    };

    // Filter out unchanged fields
    const actualChanges = Object.fromEntries(
        Object.entries(formChanges).filter(([_, values]) => 
            values.oldValue !== values.newValue
        )
    );

    // Add to edit queue if there are changes
    if (Object.keys(actualChanges).length > 0) {
        const infoFormOperation = {
            type: 'UPDATE_SCRIPT_INFO',
            elementId: 'script-info',
            changes: actualChanges
        };

        applyLocalChange(infoFormOperation);
    }

    // Proceed with mode change
    setActiveMode(targetModeId as any);
};
```

## Toolbar Integration

### Context-Aware Button States

The toolbar system provides different buttons based on the active mode:

```typescript
interface ToolbarContext {
    activeMode: ScriptMode;
    scrollState: ScrollState;
    hasSelection: boolean;
    hasUnsavedChanges: boolean;
    pendingOperationsCount: number;
}

const toolbarContext: ToolbarContext = {
    activeMode,
    scrollState,
    hasSelection: !!selectedElementId,
    hasUnsavedChanges,
    pendingOperationsCount: pendingOperations.length
};

const toolButtons = getToolbarButtons(toolbarContext);
```

### Mode-Specific Button Sets

#### View Mode Buttons
- **Play**: Switch to play mode
- **Share**: Switch to share mode
- **Edit**: Switch to edit mode
- **Info**: Switch to info mode

#### Edit Mode Buttons
- **Add Element**: Create new script elements
- **Edit Element**: Modify selected element
- **Duplicate Element**: Copy selected element
- **Delete Element**: Remove selected element
- **Group Elements**: Group selected elements (future)

#### History Mode Buttons
- **Clear History**: Remove all pending changes
- **Revert to Point**: Selective undo functionality

## State Persistence

### Mode Memory
- **Last active mode** preserved across browser sessions
- **Selection state** maintained during mode transitions
- **Scroll position** preserved where appropriate

### Change Preservation
- **Form changes** in Info mode preserved until explicit save or discard
- **Edit queue operations** maintained across all mode transitions
- **User preferences** applied consistently across modes

## Performance Optimizations

### Component Memoization

Each mode component uses custom comparison functions to prevent unnecessary re-renders:

```typescript
const areEqual = (prevProps: ViewModeProps, nextProps: ViewModeProps) => {
    return (
        prevProps.scriptId === nextProps.scriptId &&
        prevProps.colorizeDepNames === nextProps.colorizeDepNames &&
        prevProps.showClockTimes === nextProps.showClockTimes &&
        prevProps.elements === nextProps.elements &&
        prevProps.script === nextProps.script
        // Deliberately ignoring callback props for performance
    );
};

export const ViewMode = React.memo(ViewModeComponent, areEqual);
```

### Conditional Rendering

```typescript
// Only render active mode component
{activeMode === 'info' && <InfoMode form={form} />}
{activeMode === 'view' && <ViewMode {...viewModeProps} />}
{activeMode === 'edit' && <EditMode {...editModeProps} />}
{activeMode === 'play' && <PlayMode />}
{activeMode === 'share' && <ShareMode />}
{activeMode === 'history' && <EditHistoryView {...historyProps} />}
```

## Error Handling

### Mode Transition Errors
- **Validation failures** prevent mode transitions
- **Save errors** revert to previous mode
- **Network failures** preserve local state

### Graceful Degradation
- **Mode unavailable**: Fall back to View mode
- **Data loading failures**: Show error state within mode
- **Permission issues**: Disable restricted modes

## Mobile Adaptations

### Responsive Mode Selection
- **Mobile drawer** replaces desktop toolbar
- **Touch-optimized** mode switching
- **Simplified interfaces** for small screens

### Mode-Specific Mobile Optimizations
- **Info Mode**: Stacked form layout
- **Edit Mode**: Touch-friendly selection and drag
- **View Mode**: Optimized scrolling performance

## Future Enhancements

### Advanced Mode Features
- **Split-screen modes** for comparison workflows
- **Custom mode configurations** per user
- **Mode-specific shortcuts** and gestures
- **Advanced search and filtering** within modes

### Integration Opportunities
- **External system sync** in Play mode
- **Real-time collaboration** in Edit mode
- **Advanced export options** in Share mode
- **Version control integration** in History mode

## Related Documentation

- [ManageScriptPage Component Guide](../components/manage-script-page.md)
- [Edit Queue System](../architecture/edit-queue-system.md)
- [Component Architecture](../architecture/component-architecture.md)
- [User Preferences Integration](./user-preferences-integration.md)