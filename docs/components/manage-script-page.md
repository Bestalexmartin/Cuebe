# ManageScriptPage Component Guide

**Date:** July 2025  
**Status:** Current  
**Category:** Component Documentation

## Overview

The `ManageScriptPage` is the central component for script management in Cuebe, providing a comprehensive multi-mode interface for viewing, editing, and managing theatrical scripts. Located at `frontend/src/pages/ManageScriptPage.tsx`, it serves as the primary workspace for script operations.

## Architecture

### Component Structure

```
ManageScriptPage
├── Header Section (Script title + Action buttons)
├── Main Content Area
│   ├── Script Content (Left side - mode-dependent)
│   └── Toolbar (Right side - desktop only)
├── Validation Error Panel (Floating)
├── Modal System (13+ different modals)
└── Mobile Drawer (Mobile only)
```

### Key Responsibilities

- **Multi-mode script editing** with 6 distinct operational modes
- **Non-destructive editing** through edit queue integration
- **Real-time validation** with user-friendly error handling
- **Change detection** and unsaved changes protection
- **Responsive design** with mobile optimization
- **Modal state management** for complex user interactions

## Mode System

The component operates in 6 distinct modes, each optimized for specific tasks:

### 1. Info Mode (`info`)
**Purpose**: Script metadata editing
- **Form Fields**: Script name, status, start/end times, notes
- **Validation**: Real-time form validation with floating error panel
- **Change Detection**: Tracks modifications against current script state
- **Save Behavior**: Adds changes to edit queue on mode exit

```typescript
// Form validation configuration
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

### 2. View Mode (`view`)
**Purpose**: Read-only script viewing
- **Features**: Scroll state tracking, department colorization, clock time display
- **Interactions**: Non-interactive elements (click/select disabled)
- **Performance**: Optimized for rendering large script lists

### 3. Edit Mode (`edit`)
**Purpose**: Full script editing capabilities
- **Features**: Element selection, drag-and-drop reordering, editing tools
- **Auto-sort**: Intelligent element sorting by time offset
- **Edit Queue**: All changes tracked for batch saving

### 4. Play Mode (`play`)
**Purpose**: Script playback interface (basic implementation)

### 5. Share Mode (`share`)
**Purpose**: Script sharing interface (basic implementation)

### 6. History Mode (`history`)
**Purpose**: Edit queue visualization and management
- **Features**: Operation history display, revert to point functionality
- **Clear History**: Two-tier confirmation for destructive operations

## State Management

### Core State Hooks

```typescript
// Modal state management
const modalState = useModalState(Object.values(MODAL_NAMES));

// Form management for INFO mode
const form = useValidatedForm<ScriptFormData>(INITIAL_FORM_STATE, formConfig);

// Edit queue integration
const editQueueHook = useScriptElementsWithEditQueue(scriptId);

// Active mode state
const { activeMode, setActiveMode } = useScriptModes('view');

// Change detection
const { hasChanges, updateOriginalData } = useChangeDetection(/* ... */);
```

### Edit Queue Integration

The component integrates deeply with the edit queue system:

```typescript
const {
    elements: editQueueElements,
    pendingOperations,
    hasUnsavedChanges,
    revertToPoint,
    applyLocalChange,
    discardChanges,
    saveChanges
} = editQueueHook;
```

## Modal System

### Modal Categories

The component manages 13+ different modals through a centralized system:

#### **Script Management Modals**
- `DELETE` / `FINAL_DELETE` - Two-tier script deletion
- `DUPLICATE` - Script duplication
- `OPTIONS` - User preferences

#### **Element Management Modals**
- `ADD_ELEMENT` - Create new script elements
- `EDIT_ELEMENT` - Edit existing elements
- `DELETE_CUE` - Delete script elements
- `DUPLICATE_ELEMENT` - Duplicate elements

#### **Change Management Modals**
- `UNSAVED_CHANGES` / `FINAL_UNSAVED_CHANGES` - Navigation protection
- `SAVE_CONFIRMATION` / `SAVE_PROCESSING` - Save workflow
- `CLEAR_HISTORY` / `FINAL_CLEAR_HISTORY` - Edit history management

### Modal Naming Convention

```typescript
const MODAL_NAMES = {
    DELETE: 'delete',
    FINAL_DELETE: 'final-delete',
    SAVE_CONFIRMATION: 'save-confirmation',
    // ... etc
} as const;
```

## User Preferences Integration

### Active Preferences System

The component maintains both saved and preview preferences:

```typescript
const activePreferences = useMemo(() =>
    modalState.isOpen(MODAL_NAMES.OPTIONS) && previewPreferences
        ? previewPreferences
        : { darkMode, colorizeDepNames, showClockTimes, autoSortCues: currentAutoSortState }
    , [/* dependencies */]);
```

### Auto-Sort State Calculation

Auto-sort state is dynamically calculated from edit queue operations:

```typescript
const currentAutoSortState = useMemo(() => {
    let currentState = autoSortCues;
    
    for (const operation of pendingOperations) {
        if (operation.type === 'ENABLE_AUTO_SORT' || operation.type === 'DISABLE_AUTO_SORT') {
            currentState = (operation as any).newPreferenceValue;
        }
    }
    
    return currentState;
}, [autoSortCues, pendingOperations]);
```

## Change Detection & Protection

### Browser Navigation Protection

```typescript
// Handle browser beforeunload event
useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        if (hasUnsavedChanges) {
            event.preventDefault();
            event.returnValue = '';
            return '';
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);
```

### Mode Exit Handling

When exiting Info mode with unsaved changes:

```typescript
const handleInfoModeExit = (targetModeId: string) => {
    if (!hasChanges || !changeDetectionBaseData) {
        setActiveMode(targetModeId as any);
        return;
    }

    // Create collective operation for all form changes
    const infoFormOperation = {
        type: 'UPDATE_SCRIPT_INFO' as const,
        elementId: 'script-info',
        changes: actualChanges
    };

    applyLocalChange(infoFormOperation);
    setActiveMode(targetModeId as any);
};
```

## Responsive Design

### Desktop Layout
- **Left**: Script content area (flexible width)
- **Right**: Fixed-width toolbar (165px)
- **Header**: Action buttons aligned with scroll area

### Mobile Layout
- **Full-width**: Script content area
- **Hidden**: Desktop toolbar
- **Drawer**: Mobile script drawer for tools
- **Responsive**: Action button positioning

```typescript
const isMobile = useBreakpointValue({ base: true, lg: false });
```

## Performance Optimizations

### Scroll State Management

Efficient scroll state tracking for jump button behavior:

```typescript
const handleScrollStateChange = useCallback((newScrollState: {
    isAtTop: boolean;
    isAtBottom: boolean;
    allElementsFitOnScreen: boolean;
}) => {
    setScrollState(newScrollState);
}, []);
```

### Component Memoization

Mode components use custom comparison functions:

```typescript
const areEqual = (prevProps: ViewModeProps, nextProps: ViewModeProps) => {
    return (
        prevProps.scriptId === nextProps.scriptId &&
        prevProps.colorizeDepNames === nextProps.colorizeDepNames &&
        // ... other non-callback props
        // Deliberately ignoring callback props
    );
};

export const ViewMode = React.memo(ViewModeComponent, areEqual);
```

## Error Handling

### Validation Error Display

Floating validation error panel appears when form errors exist:

```jsx
{form.fieldErrors.length > 0 && (
    <Box
        position="fixed"
        bottom="20px"
        left="50%"
        transform="translateX(-50%)"
        bg="red.500"
        color="white"
        // ... styling
    >
        <Text fontWeight="semibold">Validation Errors:</Text>
        <Text>{form.fieldErrors.map(error => error.message).join('; ')}</Text>
    </Box>
)}
```

### Save Error Recovery

```typescript
const handleSaveScriptChanges = async () => {
    try {
        const success = await saveChanges();
        
        if (success) {
            showSuccess('Changes Saved', 'All pending changes have been saved successfully.');
            // Handle navigation if pending
        } else {
            showError('Save Failed', 'Failed to save changes. Please try again.');
        }
    } catch (error) {
        showError('Save Failed', 'An error occurred while saving changes.');
    }
};
```

## Integration Points

### Dashboard Navigation

Context-aware navigation back to dashboard:

```typescript
const { navigateWithCurrentContext } = useDashboardNavigation();

// Maintains dashboard state when returning
if (pendingNavigation === '/dashboard') {
    navigateWithCurrentContext(script, scriptId);
}
```

### Toast System

Enhanced toast notifications with contextual messages:

```typescript
const { showSuccess, showError } = useEnhancedToast();

showSuccess('Changes Added', 'Script info changes have been added to edit history');
```

## Usage Examples

### Basic Component Usage

```jsx
<ManageScriptPage 
    isMenuOpen={isMenuOpen}
    onMenuClose={onMenuClose}
/>
```

### Mode Change Handling

```typescript
const handleModeChange = (modeId: string) => {
    if (modeId === 'exit') {
        handleCancel();
        return;
    }

    if (activeMode === 'info' && modeId !== 'info' && hasChanges) {
        handleInfoModeExit(modeId);
        return;
    }
    
    setActiveMode(modeId);
};
```

## File References

- **Main Component**: `frontend/src/pages/ManageScriptPage.tsx:121-1346`
- **Mode Components**: `frontend/src/features/script/components/modes/`
- **Modal Components**: `frontend/src/features/script/components/modals/`
- **Hooks**: `frontend/src/features/script/hooks/`
- **Utilities**: `frontend/src/features/script/utils/`

## Related Documentation

- [Edit Queue System](../architecture/edit-queue-system.md)
- [Component Architecture](../architecture/component-architecture.md)
- [User Preferences Bitmap System](../architecture/user-preferences-bitmap-system.md)
- [Script Element Interaction System](../architecture/script-element-interaction-system.md)