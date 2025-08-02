# Performance Optimizations

This document outlines the performance optimizations implemented in the codebase.

## React.memo Optimizations

### Base Components

#### BaseCard
- **Location**: `src/components/base/BaseCard.tsx`
- **Optimization**: Custom `arePropsEqual` comparison function
- **Benefits**: Prevents re-renders when props haven't meaningfully changed
- **Key comparisons**:
  - Primitive props (title, isSelected, isHovered, etc.)
  - React nodes (headerBadges, quickInfo, expandedContent)
  - headerActions array with deep comparison of action properties
  - Common BoxProps (className, style)

#### BaseModal
- **Location**: `src/components/base/BaseModal.tsx`
- **Optimization**: Custom `areModalPropsEqual` comparison function
- **Benefits**: Prevents modal re-renders during form interactions
- **Key comparisons**:
  - Modal state (title, isOpen, showValidationErrors)
  - Validation errors array with deep comparison
  - Action objects (primary, secondary, custom) with property-level comparison

### Card Components

All card components now use `React.memo` for basic prop comparison:
- **ShowCard**: `src/components/cards/ShowCard.tsx`
- **VenueCard**: `src/components/cards/VenueCard.tsx`
- **CrewCard**: `src/components/cards/CrewCard.tsx`
- **DepartmentCard**: `src/components/cards/DepartmentCard.tsx`

## Performance Benefits

1. **Reduced Re-renders**: Components only re-render when their props actually change
2. **Better UX**: Smoother interactions, especially with large lists of cards
3. **Memory Efficiency**: Less virtual DOM reconciliation work
4. **Battery Life**: Reduced CPU usage on mobile devices

## Loading State Optimizations

### Skeleton Loading
- **BaseCard**: Intelligent skeleton variants for different card types
- **Variants**: `default`, `show`, `venue`, `crew`, `department`
- **Benefits**: Immediate visual feedback without layout shifts

## Best Practices for Developers

### When using card components:
```tsx
// ✅ Good: Use useCallback for event handlers
const handleShowClick = useCallback((showId: string) => {
  // handler logic
}, [dependency]);

// ✅ Good: Memoize complex derived data
const sortedShows = useMemo(() => {
  return shows.sort(/* sorting logic */);
}, [shows, sortCriteria]);

// ❌ Avoid: Inline functions (causes unnecessary re-renders)
<ShowCard onShowClick={(id) => handleClick(id)} />

// ✅ Better: Use stable function references
<ShowCard onShowClick={handleShowClick} />
```

### When creating new components:
1. Consider React.memo for components that receive complex props
2. Use custom comparison functions for components with frequently changing function props
3. Implement loading states for better perceived performance

## Monitoring Performance

To monitor the effectiveness of these optimizations:

1. **React DevTools Profiler**: Use to identify unnecessary re-renders
2. **Browser Performance Tab**: Monitor frame rates during interactions
3. **Bundle Analysis**: Check for code splitting opportunities

## Script Management Performance Optimizations

### ManageScriptPage Optimizations

The ManageScriptPage component implements sophisticated performance optimizations to handle complex state management and mode transitions efficiently.

#### Component Memoization

**Mode Components** use custom comparison functions to prevent unnecessary re-renders:

```typescript
// ViewMode optimization
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

**Benefits**:
- **50% Render Reduction**: Eliminated unnecessary re-renders during mode transitions
- **Stable Performance**: Consistent performance regardless of script size
- **Callback Isolation**: Ignoring callback props prevents cascade re-renders

#### Scroll State Optimization

Efficient scroll state tracking with change detection to minimize callback frequency:

```typescript
const checkScrollState = () => {
    const container = scrollContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    const currentState = {
        isAtTop: scrollTop <= 1,
        isAtBottom: scrollTop + clientHeight >= scrollHeight - 1,
        allElementsFitOnScreen: scrollHeight <= clientHeight
    };
    
    // Only call callback if state actually changed
    const stateChanged = !lastState || 
        lastState.isAtTop !== currentState.isAtTop ||
        lastState.isAtBottom !== currentState.isBottom ||
        lastState.allElementsFitOnScreen !== currentState.allElementsFitOnScreen;
        
    if (stateChanged) {
        lastScrollStateRef.current = currentState;
        onScrollStateChange(currentState);
    }
};
```

**Benefits**:
- **Reduced Callback Frequency**: Only fires when scroll state actually changes
- **Performance**: Eliminates redundant parent component updates
- **Memory Efficiency**: Uses refs to avoid creating new objects

#### Modal State Optimization

Centralized modal state management reduces individual component re-renders:

```typescript
// Single hook manages all modal states
const modalState = useModalState(Object.values(MODAL_NAMES));

// Type-safe, efficient operations
modalState.openModal(MODAL_NAMES.DELETE);
const isDeleteOpen = modalState.isOpen(MODAL_NAMES.DELETE);
```

**Benefits**:
- **Centralized State**: Single source of truth for all modal states
- **Reduced Re-renders**: Only affected modals re-render on state changes
- **Type Safety**: Compile-time checking prevents modal name errors

#### Edit Queue Performance

The edit queue system is optimized for large change sets:

```typescript
// Memoized current script calculation
const currentScript = useMemo(() => {
    if (!script) return null;
    
    let current = { ...script };
    
    // Apply all script info operations efficiently
    for (const operation of pendingOperations) {
        if (operation.type === 'UPDATE_SCRIPT_INFO') {
            // Batch apply all changes
            Object.assign(current, processChanges(operation.changes));
        }
    }
    
    return current;
}, [script, pendingOperations]);
```

**Benefits**:
- **Batch Processing**: Multiple changes processed in single pass
- **Memoization**: Only recalculates when script or operations change
- **Memory Efficiency**: Minimal object creation during calculations

### Auto-Sort Performance

Auto-sort operations are optimized for immediate feedback with deferred processing:

```typescript
const handleAutoSortElements = useCallback(async () => {
    // Early exit for already sorted elements
    const needsReordering = currentElements.some((element, index) => 
        element.elementID !== sortedElements[index].elementID
    );

    if (!needsReordering) {
        showSuccess('Auto-Sort Complete', 'Elements are already in correct time order.');
        return;
    }

    // Efficient diff calculation
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

    // Single compound operation
    applyLocalChange({
        type: 'ENABLE_AUTO_SORT',
        elementId: 'auto-sort-preference',
        oldPreferenceValue: false,
        newPreferenceValue: true,
        elementMoves: elementChanges
    });
}, [scriptId, editQueueElements, applyLocalChange]);
```

**Benefits**:
- **Early Exit**: Avoids processing when no changes needed
- **Efficient Diffing**: Only calculates actual position changes
- **Batch Operations**: Groups all moves into single edit queue operation

### Preference System Performance

User preferences are managed with efficient bitmap storage and optimized updates:

```typescript
// Dynamic auto-sort state calculation
const currentAutoSortState = useMemo(() => {
    let currentState = autoSortCues;
    
    // Efficiently scan for preference changes
    for (const operation of pendingOperations) {
        if (operation.type === 'ENABLE_AUTO_SORT' || operation.type === 'DISABLE_AUTO_SORT') {
            currentState = operation.newPreferenceValue;
        }
    }
    
    return currentState;
}, [autoSortCues, pendingOperations]);

// Optimized active preferences calculation
const activePreferences = useMemo(() =>
    modalState.isOpen(MODAL_NAMES.OPTIONS) && previewPreferences
        ? previewPreferences
        : { darkMode, colorizeDepNames, showClockTimes, autoSortCues: currentAutoSortState }
    , [modalState, previewPreferences, darkMode, colorizeDepNames, showClockTimes, currentAutoSortState]);
```

**Benefits**:
- **Memoized Calculations**: Expensive computations cached
- **Efficient Scanning**: Linear scan through operations
- **Preview System**: Non-destructive preference testing

### Hook Optimization Patterns

16+ hooks have been systematically optimized using consistent patterns:

```typescript
// Pattern 1: Stable return objects
const { elements, isLoading, error } = useScriptElements(scriptId);

// Pattern 2: Memoized computations
const sortedElements = useMemo(() => 
    elements.sort((a, b) => a.timeOffsetMs - b.timeOffsetMs),
    [elements]
);

// Pattern 3: Callback stability
const handleElementCreated = useCallback((elementData: any) => {
    insertElement(elementData);
    modalState.closeModal(MODAL_NAMES.ADD_ELEMENT);
    showSuccess('Script Element Created', 'New element added to script.');
}, [insertElement, modalState, showSuccess]);
```

**Benefits**:
- **Consistent Patterns**: Predictable optimization approach
- **Stable Dependencies**: Reduces cascade re-renders
- **Memory Efficiency**: Minimal object churn

## Render Loop Optimization (July 2025)

### Critical Performance Issue Resolution

A comprehensive performance optimization was completed to resolve excessive re-renders in the ManageScriptPage component, particularly during view/edit mode transitions with "Show Clock Times" enabled.

#### Problem Analysis

**Initial Issue**: View↔Edit mode transitions were causing 20+ component re-renders per action, creating visual flickering and poor user experience.

**Root Causes Identified**:
1. **Boolean Coercion Bug**: `showClockTimes && script?.startTime` returned string values instead of booleans
2. **Redundant API Calls**: Both ViewMode and EditMode were making separate `useScript` calls
3. **Unstable Hook Returns**: Custom hooks returning new object references on every render
4. **Infinite Render Loops**: Circular dependencies in hook dependency arrays
5. **Spurious Callback Loops**: Child components triggering parent re-renders through unstable callbacks

#### Systematic Solution Process

**Phase 1: Boolean Logic Fix**
```tsx
// ❌ BUG: Returns string value when script?.startTime exists
const shouldShowClockTimes = showClockTimes && script?.startTime;

// ✅ FIXED: Returns proper boolean
const shouldShowClockTimes = showClockTimes && !!script?.startTime;
```

**Phase 2: Hook Memoization**
All custom hooks were systematically memoized to prevent object reference changes:

- **Frontend hooks** (`frontend/src/hooks/`): 16+ hooks memoized
- **Script-specific hooks** (`src/pages/script/hooks/`): 3 hooks memoized
- **Key fixes**: `useValidatedForm`, `useChangeDetection`, `useEditQueue`

```tsx
// Example: useValidatedForm fix
return useMemo(() => ({
    formData,
    setFormData,
    updateField,
    // ... rest of return object
}), [
    formData,
    setFormData,
    updateField,
    // ... all dependencies
]);
```

**Phase 3: Component Memoization**
Major components optimized with React.memo and custom comparison functions:

```tsx
// ViewMode and EditMode with custom areEqual functions
const areEqual = (prevProps: EditModeProps, nextProps: EditModeProps) => {
    return (
        prevProps.scriptId === nextProps.scriptId &&
        prevProps.colorizeDepNames === nextProps.colorizeDepNames &&
        prevProps.showClockTimes === nextProps.showClockTimes &&
        prevProps.autoSortCues === nextProps.autoSortCues &&
        prevProps.elements === nextProps.elements &&
        prevProps.script === nextProps.script
        // Deliberately ignoring callback props to prevent spurious re-renders
    );
};
export const EditMode = React.memo(EditModeComponent, areEqual);
```

**Phase 4: Stable Callback Patterns**
Eliminated circular dependencies using stable callback patterns:

```tsx
// useScriptElementsWithEditQueue stable callbacks
const editQueueRef = useRef(editQueue);
editQueueRef.current = editQueue;

const applyLocalChange = useCallback((operation) => {
    editQueueRef.current.addOperation(operation);
}, []); // Empty dependency array for stability
```

**Phase 5: Internal Effect Optimization**
Optimized internal useEffect hooks to prevent unnecessary state updates:

```tsx
// EditMode scroll state optimization
const stateChanged = !lastState || 
    lastState.isAtTop !== currentState.isAtTop ||
    lastState.isAtBottom !== currentState.isAtBottom ||
    lastState.allElementsFitOnScreen !== currentState.allElementsFitOnScreen;
    
if (stateChanged) {
    lastScrollStateRef.current = currentState;
    onScrollStateChange(currentState);
} else {
    // Skip callback to prevent spurious re-renders
}
```

#### Performance Results

**Before Optimization**:
- Initial Load: Infinite render loops (20+ renders)
- View→Edit: 12+ EditMode renders
- Edit→View: 8+ ViewMode renders
- Visual flickering during clock time transitions

**After Optimization**:
- Initial Load: 6 ViewMode renders (stable)
- View→Edit: 6 EditMode renders (50% improvement)
- Edit→View: 4 ViewMode renders (excellent performance)
- No visual flickering, smooth transitions

### Expected Interaction Chain

Understanding the proper render flow helps identify when performance issues occur:

**Normal View→Edit Transition**:
1. ManageScriptPage state update (mode change)
2. EditMode component mount (1 render)
3. useScriptElementsWithEditQueue initialization (1-2 renders)
4. Element data loading completion (1-2 renders)
5. Scroll state initialization (1-2 renders)
6. **Total: ~6 renders (acceptable)**

**Normal Edit→View Transition**:
1. ManageScriptPage state update (mode change)
2. ViewMode component mount (1 render)
3. Element data loading (if needed) (1-2 renders)
4. Scroll state initialization (1 render)
5. **Total: ~4 renders (excellent)**

### Types of Re-render Issues

#### Legitimate Re-renders
- Component mounting/unmounting
- Prop or state changes with actual value differences
- Data loading state changes
- User interaction responses

#### Spurious Re-renders (Performance Problems)
- **Hook Object Reference Changes**: Custom hooks returning new objects every render
- **Boolean Coercion Bugs**: Values changing type between renders (string↔boolean)
- **Circular Dependencies**: useCallback/useMemo depending on themselves
- **Child Callback Loops**: Child components triggering parent re-renders through unstable callbacks
- **Infinite Effect Loops**: useEffect with incorrect dependencies causing continuous firing

### Best Practices for Render Performance

#### Custom Hook Design
```tsx
// ✅ Memoize hook return values
const useCustomHook = () => {
    const [state, setState] = useState();
    const stableCallback = useCallback(() => {}, []);
    
    return useMemo(() => ({
        state,
        setState,
        stableCallback
    }), [state, setState, stableCallback]);
};
```

#### Component Memoization Strategy
```tsx
// ✅ Ignore callback props in comparison functions
const areEqual = (prevProps, nextProps) => {
    return (
        prevProps.id === nextProps.id &&
        prevProps.data === nextProps.data
        // Ignore: onCallback, onAction, etc.
    );
};
export const Component = React.memo(ComponentImpl, areEqual);
```

#### Stable Callback Patterns
```tsx
// ✅ Use refs for stable callbacks with changing dependencies
const latestValueRef = useRef(value);
latestValueRef.current = value;

const stableCallback = useCallback(() => {
    // Use latestValueRef.current instead of value
    doSomething(latestValueRef.current);
}, []); // Empty dependency array
```

#### Effect Optimization
```tsx
// ✅ Deep comparison to prevent unnecessary effects
useEffect(() => {
    const hasChanged = !previousState ||
        previousState.prop1 !== currentState.prop1 ||
        previousState.prop2 !== currentState.prop2;
        
    if (hasChanged) {
        // Only execute when actually changed
        doExpensiveOperation();
    }
}, [currentState]);
```

### Monitoring Render Performance

#### Detection Methods
1. **Console Logging**: Add render logs to identify excessive re-renders
2. **React DevTools Profiler**: Record component render times and counts
3. **Performance API**: Measure render timing in production
4. **Visual Inspection**: Watch for flickering or layout shifts

#### Warning Signs
- Components rendering 10+ times for single user actions
- Visual flickering during state transitions
- UI lag or stuttering during interactions
- High CPU usage during normal operations
- Memory leaks from accumulating event listeners

## ManageScript Refactoring Case Study (July 2025)

### Overview
A comprehensive refactoring of ManageScriptPage addressed critical performance issues and DRY violations, achieving significant code reduction while improving maintainability and runtime performance.

### Critical Issues Addressed

#### 1. Polling Anti-Pattern Elimination
**Problem**: Component used 100ms polling to sync selection state between parent and child components.

```typescript
// ❌ BEFORE: Polling anti-pattern
useEffect(() => {
    if (activeMode === 'edit' && editModeRef.current) {
        const checkSelection = () => {
            const editModeSelection = editModeRef.current?.selectedElementId;
            if (editModeSelection !== selectedElementId) {
                setSelectedElementId(editModeSelection || null);
            }
        };
        checkSelection();
        const interval = setInterval(checkSelection, 100); // Polling every 100ms
        return () => clearInterval(interval);
    }
}, [activeMode, selectedElementId]);
```

**Solution**: Event-driven communication with proper callback patterns:

```typescript
// ✅ AFTER: Event-driven communication
// Parent component
const handleSelectionChange = useCallback((id: string | null) => {
    setSelectedElementId(id);
}, []);

// Child component (EditMode)
<CueElement 
    onSelect={() => {
        const newId = selectedElementId === element.elementID ? null : element.elementID;
        setSelectedElementId(newId);
        onSelectionChange?.(newId); // Direct callback
    }}
/>
```

**Performance Impact**: Eliminated continuous CPU usage from polling, improving battery life and reducing unnecessary re-renders.

#### 2. DRY Violation Resolution
**Problem**: ~100 lines of duplicated element insertion logic across `handleElementCreated` and `handleConfirmDuplicate`.

```typescript
// ❌ BEFORE: Duplicated auto-sort insertion logic
const handleElementCreated = async (elementData: any) => {
    if (elementData._autoSort) {
        const currentElements = editQueueElements;
        let insertIndex = currentElements.length;
        
        for (let i = 0; i < currentElements.length; i++) {
            if (currentElements[i].timeOffsetMs > elementData.timeOffsetMs) {
                insertIndex = i;
                break;
            }
        }
        // 40+ more lines of insertion logic...
    }
    // More duplication...
};

const handleConfirmDuplicate = async (description: string, timeOffsetMs: number) => {
    // Nearly identical 50+ lines of auto-sort insertion logic
    if (activePreferences.autoSortCues) {
        let insertIndex = editQueueElements.length;
        for (let i = 0; i < editQueueElements.length; i++) {
            if (editQueueElements[i].timeOffsetMs > duplicateData.timeOffsetMs) {
                insertIndex = i;
                break;
            }
        }
        // More duplicated logic...
    }
};
```

**Solution**: Extracted `useElementActions` hook with centralized insertion logic:

```typescript
// ✅ AFTER: Centralized element actions hook
export function useElementActions(elements: any[], autoSort: boolean, applyLocalChange: (op: any) => void) {
  const insertElement = useCallback((elementData: any) => {
      const cleanData = { ...elementData };
      delete (cleanData as any)._autoSort;

      let insertIndex = elements.length;
      if (autoSort) {
        for (let i = 0; i < elements.length; i++) {
          if (elements[i].timeOffsetMs > cleanData.timeOffsetMs) {
            insertIndex = i;
            break;
          }
        }
      }

      if (insertIndex === elements.length) {
        applyLocalChange({ type: 'CREATE_ELEMENT', elementId: cleanData.elementID, elementData: cleanData });
      } else {
        applyLocalChange({ type: 'CREATE_ELEMENT_AT_INDEX', elementId: cleanData.elementID, elementData: cleanData, insertIndex });
      }
    }, [elements, autoSort, applyLocalChange]);

  return { insertElement };
}

// Usage - both handlers now use single line
const handleElementCreated = async (elementData: any) => {
    insertElement(elementData);
    // Show success message...
};

const handleConfirmDuplicate = async (description: string, timeOffsetMs: number) => {
    insertElement(duplicateData);
    // Show success message...
};
```

**Code Reduction**: Eliminated ~80 lines of duplicated code while improving maintainability.

### Performance Improvements Achieved

#### Quantitative Results
- **Component Size**: ManageScriptPage reduced from 1,163 to 1,092 lines (6% reduction)
- **Code Duplication**: ~100 lines of duplicate auto-sort logic eliminated
- **CPU Usage**: Polling eliminated - no more 100ms intervals consuming CPU cycles
- **Re-render Optimization**: Event-driven communication reduces unnecessary parent re-renders

#### Qualitative Improvements
- **Maintainability**: Single source of truth for element insertion logic
- **Type Safety**: Improved with centralized interfaces and hooks
- **Architecture**: Event-driven patterns replace polling anti-patterns
- **Developer Experience**: Cleaner, more predictable codebase

### Best Practices Established

#### 1. Event-Driven Communication Pattern
```typescript
// ✅ Use callback props for parent-child communication
interface ChildProps {
    onSelectionChange?: (id: string | null) => void;
    onScrollStateChange?: (state: ScrollState) => void;
}

// Parent provides stable callbacks
const handleSelectionChange = useCallback((id: string | null) => {
    setSelectedElementId(id);
}, []);
```

#### 2. Custom Hook Extraction for Business Logic
```typescript  
// ✅ Extract reusable business logic into custom hooks
const useElementActions = (elements, autoSort, applyLocalChange) => {
    const insertElement = useCallback((elementData) => {
        // Centralized insertion logic
    }, [elements, autoSort, applyLocalChange]);
    
    return { insertElement };
};
```

#### 3. Systematic DRY Analysis
1. **Identify concrete duplications** (not just similar-looking code)
2. **Extract common functionality** into focused utilities
3. **Update all usage sites** to use shared implementation
4. **Measure impact** in terms of lines saved and maintainability

### Monitoring Performance Improvements

#### Detection Methods for Polling Issues
```typescript
// Add performance monitoring to detect polling patterns
const usePerformanceMonitor = (componentName: string) => {
    useEffect(() => {
        const intervals = [];
        const originalSetInterval = window.setInterval;
        
        window.setInterval = (...args) => {
            const intervalId = originalSetInterval(...args);
            intervals.push(intervalId);
            console.warn(`${componentName}: setInterval created (${intervals.length} active)`);
            return intervalId;
        };
        
        return () => {
            intervals.forEach(clearInterval);
            window.setInterval = originalSetInterval;
        };
    }, [componentName]);
};
```

#### Success Metrics
- **Zero polling intervals** in production builds
- **Reduced component render counts** during user interactions  
- **Improved bundle analysis scores** from eliminated duplications
- **Faster development cycles** from improved maintainability

### Future Optimizations

Potential areas for further improvement:
1. **Code Splitting**: Split large components into separate chunks
2. **Virtual Scrolling**: For very large lists of cards
3. **Service Worker**: Cache static assets and API responses
4. **Intersection Observer**: Lazy load off-screen content
5. **React Concurrent Features**: Explore Suspense and time slicing for better UX