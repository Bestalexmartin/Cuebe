# User Preferences Integration

**Date:** July 2025  
**Status:** Implemented  
**Category:** Features & User Experience

## Overview

The User Preferences Integration system provides sophisticated preference management with preview functionality, real-time updates, and seamless integration with the edit queue system. It enables users to customize their script management experience while maintaining data consistency and providing immediate visual feedback.

## Architecture

### Preference Types

CallMaster manages several categories of user preferences:

#### **Visual Preferences**
- `colorizeDepNames`: Department name colorization in script elements
- `showClockTimes`: Display absolute clock times instead of relative offsets
- `darkMode`: Application-wide dark theme preference

#### **Functional Preferences**
- `autoSortCues`: Automatic element sorting by time offset

### Hook Integration

```typescript
// Primary preference management hook
const {
    preferences: { darkMode, colorizeDepNames, showClockTimes, autoSortCues },
    updatePreference,
    updatePreferences
} = useUserPreferences();
```

## Preview System

### Active vs. Preview Preferences

The system distinguishes between saved preferences and temporary preview values:

```typescript
// Preview preferences for options modal
const [previewPreferences, setPreviewPreferences] = useState<UserPreferences | null>(null);

// Dynamic preference resolution
const activePreferences = useMemo(() =>
    modalState.isOpen(MODAL_NAMES.OPTIONS) && previewPreferences
        ? previewPreferences  // Use preview while options modal is open
        : {                   // Use saved + computed preferences otherwise
            darkMode, 
            colorizeDepNames, 
            showClockTimes, 
            autoSortCues: currentAutoSortState
        }
    , [modalState, previewPreferences, darkMode, colorizeDepNames, showClockTimes, currentAutoSortState]);
```

### Preview Functionality

#### Real-Time Visual Updates

Users can see preference changes immediately without saving:

```typescript
// Options modal preview handler
const handleOptionsPreview = (preferences: UserPreferences) => {
    setPreviewPreferences(preferences);
    // UI updates immediately using activePreferences
};

// Preview is applied to all visual elements
<ViewMode 
    colorizeDepNames={activePreferences.colorizeDepNames}
    showClockTimes={activePreferences.showClockTimes}
    // ... other props
/>
```

#### Preview Persistence

Preview preferences persist until the options modal is closed:

```typescript
const handleOptionsModalSave = async (newPreferences: UserPreferences) => {
    // Save preferences to storage/server
    await updatePreferences(newPreferences);
    
    // Clear preview state
    setPreviewPreferences(null);
};

const handleOptionsModalCancel = () => {
    // Discard preview changes
    setPreviewPreferences(null);
    modalState.closeModal(MODAL_NAMES.OPTIONS);
};
```

## Auto-Sort Integration

### Dynamic State Calculation

Auto-sort state is computed from both saved preferences and pending edit queue operations:

```typescript
const currentAutoSortState = useMemo(() => {
    // Start with base preference value
    let currentState = autoSortCues;
    
    // Apply any pending auto-sort operations from edit queue
    for (const operation of pendingOperations) {
        if (operation.type === 'ENABLE_AUTO_SORT' || operation.type === 'DISABLE_AUTO_SORT') {
            currentState = (operation as any).newPreferenceValue;
        }
    }
    
    return currentState;
}, [autoSortCues, pendingOperations]);
```

### Immediate Auto-Sort with Edit Queue

When auto-sort is enabled, elements are immediately reordered and added to edit history:

```typescript
const handleAutoSortElements = useCallback(async () => {
    if (!scriptId) return;

    // Get current elements and sort by time offset
    const currentElements = [...editQueueElements];
    const sortedElements = [...currentElements].sort((a, b) => a.timeOffsetMs - b.timeOffsetMs);

    // Check if reordering is needed
    const needsReordering = currentElements.some((element, index) => 
        element.elementID !== sortedElements[index].elementID
    );

    if (!needsReordering) {
        showSuccess('Auto-Sort Complete', 'Elements are already in correct time order.');
        return;
    }

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

    showSuccess('Elements Auto-Sorted', `Reordered ${elementChanges.length} elements by time offset.`);
}, [scriptId, editQueueElements, applyLocalChange, showSuccess, showError]);
```

### Auto-Sort Toggle Handling

```typescript
const handleAutoSortToggle = useCallback(async (value: boolean) => {
    if (value && !activePreferences.autoSortCues && scriptId) {
        // Enabling auto-sort - trigger immediate reordering
        handleAutoSortElements();
    } else if (!value && activePreferences.autoSortCues) {
        // Disabling auto-sort - create disable operation for edit history
        const disableOperation = {
            type: 'DISABLE_AUTO_SORT',
            elementId: 'auto-sort-preference',
            oldPreferenceValue: true,
            newPreferenceValue: false
        };
        applyLocalChange(disableOperation);
    }
    
    // Update the saved preference
    await updatePreference('autoSortCues', value);
}, [updatePreference, scriptId, activePreferences.autoSortCues, handleAutoSortElements, applyLocalChange]);
```

## Options Modal Integration

### Checkbox Change Handling

Special handling for auto-sort checkbox to provide immediate feedback:

```typescript
const handleAutoSortCheckboxChange = async (newAutoSortValue: boolean) => {
    // Update the preference immediately for UI feedback
    await updatePreference('autoSortCues', newAutoSortValue);

    // If auto-sort is being enabled, trigger immediate re-sort
    if (newAutoSortValue && !autoSortCues && scriptId) {
        handleAutoSortElements();
    }
};
```

### Individual Preference Updates

```typescript
// Immediate preference updates with callback patterns
onColorizeChange={async (value: boolean) => await updatePreference('colorizeDepNames', value)}
onClockTimesChange={async (value: boolean) => await updatePreference('showClockTimes', value)}
onAutoSortChange={handleAutoSortCheckboxChange}
```

### Modal Props Structure

```typescript
<ScriptModals
    // Preview system props
    previewPreferences={previewPreferences}
    onOptionsPreview={(preferences) => setPreviewPreferences(preferences)}
    
    // Current preference values
    darkMode={activePreferences.darkMode}
    colorizeDepNames={activePreferences.colorizeDepNames}
    showClockTimes={activePreferences.showClockTimes}
    autoSortCues={activePreferences.autoSortCues}
    
    // Change handlers
    onOptionsSave={handleOptionsModalSave}
    onAutoSortChange={handleAutoSortCheckboxChange}
    onColorizeChange={async (value: boolean) => await updatePreference('colorizeDepNames', value)}
    onClockTimesChange={async (value: boolean) => await updatePreference('showClockTimes', value)}
    
    // ... other props
/>
```

## Visual Element Integration

### Department Colorization

```typescript
// Applied to CueElement components
<CueElement
    element={element}
    colorizeDepNames={activePreferences.colorizeDepNames}
    // ... other props
/>
```

### Clock Time Display

```typescript
// Conditional clock time display based on preferences and data availability
const shouldShowClockTimes = showClockTimes && !!script?.startTime;

<CueElement
    element={element}
    showClockTimes={shouldShowClockTimes}
    scriptStartTime={script?.startTime}
    scriptEndTime={script?.endTime}
    // ... other props
/>
```

### Dark Mode Integration

```typescript
// Integrated with Chakra UI's color mode system
const { colorMode, toggleColorMode } = useColorMode();

// Preference updates trigger color mode changes
useEffect(() => {
    if (darkMode !== (colorMode === 'dark')) {
        toggleColorMode();
    }
}, [darkMode, colorMode, toggleColorMode]);
```

## Data Persistence

### Bitmap Storage System

User preferences are efficiently stored using a bitmap system:

```typescript
// Preference values encoded as bits in a single integer
interface UserPreferences {
    darkMode: boolean;           // Bit 0
    colorizeDepNames: boolean;   // Bit 1
    showClockTimes: boolean;     // Bit 2
    autoSortCues: boolean;       // Bit 3
    // ... additional preferences
}
```

### Save Workflow

```typescript
const updatePreferences = async (newPreferences: UserPreferences) => {
    try {
        // Convert preferences to bitmap
        const bitmap = encodePreferencesToBitmap(newPreferences);
        
        // Save to server
        await fetch('/api/users/preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preferences: bitmap })
        });
        
        // Update local state
        setPreferences(newPreferences);
        
    } catch (error) {
        showError('Failed to save preferences');
        throw error;
    }
};
```

## Performance Optimizations

### Preference Resolution Memoization

```typescript
// Expensive preference calculations are memoized
const activePreferences = useMemo(() => ({
    darkMode,
    colorizeDepNames,
    showClockTimes,
    autoSortCues: currentAutoSortState
}), [darkMode, colorizeDepNames, showClockTimes, currentAutoSortState]);
```

### Conditional Updates

```typescript
// Only update components when relevant preferences change
const ViewModeComponent = React.memo(({ colorizeDepNames, showClockTimes, ...props }) => {
    // Component implementation
}, (prevProps, nextProps) => {
    return prevProps.colorizeDepNames === nextProps.colorizeDepNames &&
           prevProps.showClockTimes === nextProps.showClockTimes;
});
```

### Debounced Preference Saves

```typescript
// Debounce rapid preference changes to reduce server load
const debouncedUpdatePreference = useCallback(
    debounce(async (key: string, value: any) => {
        await updatePreference(key, value);
    }, 300),
    [updatePreference]
);
```

## Error Handling

### Save Failures

```typescript
const handlePreferenceSaveError = (error: Error) => {
    // Revert UI to previous state
    setPreviewPreferences(null);
    
    // Show user-friendly error message
    showError('Failed to save preferences', 'Your changes have been reverted.');
    
    // Log technical details
    console.error('Preference save error:', error);
};
```

### Network Issues

```typescript
// Graceful degradation for offline scenarios
const updatePreferenceWithRetry = async (key: string, value: any, retries = 3) => {
    try {
        await updatePreference(key, value);
    } catch (error) {
        if (retries > 0 && error.name === 'NetworkError') {
            // Retry after delay
            setTimeout(() => updatePreferenceWithRetry(key, value, retries - 1), 1000);
        } else {
            handlePreferenceSaveError(error);
        }
    }
};
```

## Usage Examples

### Basic Preference Update

```typescript
// Toggle department colorization
const handleColorizeToggle = async () => {
    await updatePreference('colorizeDepNames', !colorizeDepNames);
};
```

### Batch Preference Updates

```typescript
// Update multiple preferences at once
const applyThemePreset = async (preset: 'light' | 'dark' | 'high-contrast') => {
    const presetPreferences = {
        light: { darkMode: false, colorizeDepNames: true },
        dark: { darkMode: true, colorizeDepNames: true },
        'high-contrast': { darkMode: true, colorizeDepNames: false }
    };
    
    await updatePreferences({
        ...currentPreferences,
        ...presetPreferences[preset]
    });
};
```

### Preview with Validation

```typescript
// Preview preferences with validation
const handlePreferencesPreview = (newPreferences: UserPreferences) => {
    // Validate preferences
    const validation = validatePreferences(newPreferences);
    
    if (validation.isValid) {
        setPreviewPreferences(newPreferences);
    } else {
        showError('Invalid preferences', validation.errors.join(', '));
    }
};
```

## Integration Points

### Edit Queue System
- Auto-sort operations tracked in edit history
- Preference changes create audit trail
- Revert functionality for preference-driven changes

### Modal System
- Options modal provides preference interface
- Preview system for immediate feedback
- Save/cancel workflow with state preservation

### Component System
- All visual components respect active preferences
- Performance-optimized preference propagation
- Conditional rendering based on preference values

## Future Enhancements

### Advanced Preferences
- **User profiles** with different preference sets
- **Context-aware preferences** (per script, per show)
- **Advanced colorization** with custom color schemes
- **Accessibility preferences** for enhanced usability

### Collaboration Features
- **Team preference defaults** for new users
- **Preference sharing** between collaborators
- **Role-based preference restrictions**
- **Preference change notifications**

## Related Documentation

- [User Preferences Bitmap System](../architecture/user-preferences-bitmap-system.md)
- [Script Mode System](./script-mode-system.md)
- [Edit Queue System](../architecture/edit-queue-system.md)
- [Component Architecture](../architecture/component-architecture.md)