# Code Quality Guide

**Date:** July 2025  
**Status:** Current  
**Category:** Development Standards & Best Practices

## Overview

This guide documents systematic approaches to maintaining and improving code quality in the Cuebe codebase, focusing on DRY (Don't Repeat Yourself) principles, performance optimization, and maintainable architecture patterns.

## DRY Principles & Code Deduplication

### Approach Methodology

When identifying and eliminating code duplication:

1. **Identify Concrete Duplications**: Focus on actual repeated code, not just similar patterns
2. **Create Shared Utilities**: Extract common functionality into focused modules
3. **Update Imports**: Systematically update all affected files
4. **Measure Impact**: Document lines saved and maintainability improvements

### Common Duplication Patterns

#### 1. Constants and Configuration
**Problem**: Same arrays/objects defined in multiple files
**Solution**: Create shared constants modules

```typescript
// ❌ Before: Duplicated in 3 files
const SCRIPT_STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'COPY', label: 'Copy' },
    { value: 'WORKING', label: 'Working' },
    // ...
];

// ✅ After: Single source of truth
// frontend/src/pages/script/constants.ts
export const SCRIPT_STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'COPY', label: 'Copy' },
    { value: 'WORKING', label: 'Working' },
    // ...
];
```

#### 2. Interface Definitions
**Problem**: Same TypeScript interfaces in multiple files
**Solution**: Create shared type definition modules

```typescript
// ❌ Before: Duplicated interface definitions
// ScriptToolbar.tsx and ManageScriptPage.tsx both define ToolButton

// ✅ After: Shared interface
// frontend/src/pages/script/types/tool-button.ts
export interface ToolButton {
    id: string;
    icon: 'view' | 'play' | 'info' | /* ... */;
    label: string;
    description: string;
    isActive: boolean;
    isDisabled?: boolean;
}
```

#### 3. Utility Functions
**Problem**: Same calculations/transformations in multiple files
**Solution**: Centralized utility modules

```typescript
// ❌ Before: Color contrast calculation in 2+ files

// ✅ After: Shared utility
// frontend/src/utils/colorUtils.ts
export const getTextColorForBackground = (hexColor: string): string => {
    if (!hexColor || hexColor === '') return 'black';
    const color = hexColor.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5 ? 'white' : 'black';
};
```

#### 4. Logic Patterns
**Problem**: Similar algorithmic logic with only parameter differences
**Solution**: Parameterized functions

```typescript
// ❌ Before: 76 lines of duplicated DOM logic
const handleJumpToTop = () => { /* 38 lines */ };
const handleJumpToBottom = () => { /* 38 lines */ };

// ✅ After: 24 lines with unified logic
const handleJump = (direction: 'top' | 'bottom') => {
    // Unified DOM selection logic
    let scrollContainer = findScrollContainer();
    if (scrollContainer) {
        scrollContainer.scrollTop = direction === 'top' ? 0 : scrollContainer.scrollHeight;
    }
};
```

#### 5. Business Logic Duplication
**Problem**: Complex business logic repeated across multiple handlers
**Solution**: Custom hooks with centralized logic

```typescript
// ❌ Before: ~100 lines of duplicated element insertion logic
const handleElementCreated = async (elementData: any) => {
    if (elementData._autoSort) {
        const currentElements = editQueueElements;
        let insertIndex = currentElements.length;
        // 40+ lines of auto-sort logic...
    }
    // More insertion logic...
};

const handleConfirmDuplicate = async (description: string, timeOffsetMs: number) => {
    if (activePreferences.autoSortCues) {
        let insertIndex = editQueueElements.length;
        // Nearly identical 50+ lines of auto-sort logic...
    }
    // More duplicate logic...
};

// ✅ After: Centralized business logic in custom hook
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

// Usage - handlers become single-line
const { insertElement } = useElementActions(editQueueElements, activePreferences.autoSortCues, applyLocalChange);

const handleElementCreated = async (elementData: any) => {
    insertElement(elementData);
    showSuccess('Script Element Created', 'New element added to script. Save to apply changes.');
};

const handleConfirmDuplicate = async (description: string, timeOffsetMs: number) => {
    insertElement(duplicateData);
    showSuccess('Script Element Duplicated', 'Script element has been duplicated. Save to apply changes.');
};
```

**Impact**: Eliminated ~80 lines of duplicated code while improving maintainability and reducing potential for bugs.

### File Organization Patterns

```
frontend/src/
├── pages/[domain]/
│   ├── constants.ts           # Domain-specific constants
│   └── types/
│       └── [interface].ts     # Shared interfaces for this domain
└── utils/
    ├── [category]Utils.ts     # Cross-domain utilities (colorUtils, timeUtils)
    └── [specific]Utils.ts     # Specialized utilities
```

## Performance Optimization

### React Component Optimization

#### 1. Memoization Strategy
Use React.memo with custom comparison functions for complex components:

```typescript
const areEqual = (prevProps: ComponentProps, nextProps: ComponentProps) => {
    return (
        prevProps.id === nextProps.id &&
        prevProps.data === nextProps.data
        // Deliberately ignore callback props to prevent spurious re-renders
    );
};
export const Component = React.memo(ComponentImpl, areEqual);
```

#### 2. Custom Hook Memoization
Always memoize hook return values to prevent object reference changes:

```typescript
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

#### 3. Stable Callback Patterns
Use refs for callbacks with changing dependencies:

```typescript
const latestValueRef = useRef(value);
latestValueRef.current = value;

const stableCallback = useCallback(() => {
    doSomething(latestValueRef.current);
}, []); // Empty dependency array for stability
```

### Common Performance Anti-Patterns

#### 1. Unstable Object References
```typescript
// ❌ Creates new object every render
const config = { option1: true, option2: false };

// ✅ Memoized object
const config = useMemo(() => ({ option1: true, option2: false }), []);
```

#### 2. Inline Functions in JSX
```typescript
// ❌ Creates new function every render
<Button onClick={(id) => handleClick(id)} />

// ✅ Stable function reference
<Button onClick={handleClick} />
```

#### 3. Unnecessary Effect Dependencies
```typescript
// ❌ Effect runs when callback changes
useEffect(() => {
    doSomething();
}, [callback]);

// ✅ Use callback ref pattern
const callbackRef = useRef(callback);
callbackRef.current = callback;
useEffect(() => {
    callbackRef.current();
}, []); // Stable dependencies
```

#### 4. Polling Anti-Patterns
```typescript
// ❌ CPU-intensive polling for state synchronization
useEffect(() => {
    const interval = setInterval(() => {
        const childState = childRef.current?.getState();
        if (childState !== parentState) {
            setParentState(childState);
        }
    }, 100); // Polling every 100ms
    return () => clearInterval(interval);
}, [parentState]);

// ✅ Event-driven communication
interface ChildProps {
    onStateChange?: (state: any) => void;
}

const Child = ({ onStateChange }) => {
    const handleUpdate = (newState) => {
        setState(newState);
        onStateChange?.(newState); // Direct callback
    };
};

const Parent = () => {
    const handleChildStateChange = useCallback((state) => {
        setParentState(state);
    }, []);
    
    return <Child onStateChange={handleChildStateChange} />;
};
```

**Impact**: Eliminated continuous CPU usage from polling intervals, improving battery life and reducing unnecessary re-renders.

## Debug Code Management

### Development vs Production Code

#### Debugging Standards
- **Remove** `console.log()` statements before production
- **Preserve** `console.error()` for actual error conditions  
- **Use** meaningful error messages for troubleshooting
- **Implement** proper error boundaries for user-facing errors

#### Debug Cleanup Process
1. Search for `console.log` patterns in codebase
2. Evaluate each for production necessity
3. Replace debugging logs with proper error handling
4. Keep essential error logging with descriptive messages

```typescript
// ❌ Debug pollution
console.log('User clicked button', buttonId);
console.log('State updated:', newState);

// ✅ Production-appropriate
try {
    performOperation();
} catch (error) {
    console.error('Operation failed:', error.message);
    // Handle error appropriately
}
```

## Type Safety Improvements

### TypeScript Best Practices

#### 1. Strict Interface Definitions
```typescript
// ✅ Comprehensive interface with strict types
export interface ToolButton {
    id: string;
    icon: 'view' | 'play' | 'info' | 'script-edit'; // Union types
    label: string;
    description: string;
    isActive: boolean;
    isDisabled?: boolean; // Optional properties clearly marked
}
```

#### 2. Proper Null Handling
```typescript
// ❌ Potential runtime errors
const result = data.someProperty.value;

// ✅ Safe property access
const result = data?.someProperty?.value ?? defaultValue;
```

#### 3. Type Guards for External Data
```typescript
const isValidScript = (data: unknown): data is Script => {
    return typeof data === 'object' && 
           data !== null && 
           'scriptID' in data &&
           'title' in data;
};
```

## Component Complexity Reduction

### Large Component Refactoring Strategy

When dealing with oversized components (>1000 lines), strategic extraction can dramatically improve maintainability even when it increases total line count. **Complexity reduction is often more valuable than line count minimization.**

#### Case Study: ManageScriptPage Refactoring

**Before**: 1,281 lines in single component  
**After**: 724 lines + 5 extracted modules (693 lines)  
**Net Result**: +136 lines total, but **43.5% complexity reduction** in main component

#### Extraction Strategy

**1. Element Action Handlers → `useElementModalActions` Hook (227 lines)**
```typescript
// ❌ Before: 200+ lines of inline handlers in main component
const handleElementCreated = async (elementData: any) => { /* 25 lines */ };
const handleElementDuplicate = async () => { /* 35 lines */ };
const handleConfirmDuplicate = async (description: string, timeOffsetMs: number) => { /* 40 lines */ };
const handleElementEditSave = async (changes: Record<string, any>) => { /* 30 lines */ };
const handleElementEdit = () => { /* 20 lines */ };
const handleElementDelete = async () => { /* 25 lines */ };
const handleConfirmDeleteCue = async () => { /* 35 lines */ };
// + state management and refs

// ✅ After: Single hook call with organized functionality
const elementActions = useElementModalActions({
    scriptId,
    editQueueElements,
    applyLocalChange,
    insertElement,
    modalState,
    modalNames: MODAL_NAMES
});

// All handlers available as: elementActions.handleElementCreated, etc.
```

**2. Modal State Management → `useScriptModalHandlers` Hook (196 lines)**
```typescript
// ❌ Before: 100+ lines of modal coordination logic scattered throughout component
const handleUnsavedChangesCancel = () => { /* 15 lines */ };
const handleInitialUnsavedConfirm = () => { /* 10 lines */ };
const handleSaveScriptChanges = async () => { /* 45 lines */ };
const handleDeleteClick = () => { /* 5 lines */ };
const handleFinalDeleteConfirm = async () => { /* 40 lines */ };
// + state and navigation coordination

// ✅ After: Centralized modal workflow management
const modalHandlers = useScriptModalHandlers({
    scriptId,
    script,
    hasUnsavedChanges,
    saveChanges,
    discardChanges,
    modalState,
    modalNames: MODAL_NAMES
});
```

**3. Navigation & Lifecycle → `useScriptNavigation` Hook (74 lines)**
```typescript
// ❌ Before: 80+ lines of browser interaction handling
useEffect(() => { /* beforeunload logic */ }, [hasUnsavedChanges]);
useEffect(() => { /* history.pushState logic */ }, []);
useEffect(() => { /* popstate handling */ }, [hasUnsavedChanges, modalState]);
const handleCancel = () => { /* navigation logic */ };

// ✅ After: Encapsulated browser interaction management
const navigation = useScriptNavigation({
    hasUnsavedChanges,
    script,
    scriptId,
    onUnsavedChangesDetected: (pendingPath: string) => {
        modalHandlers.setPendingNavigation(pendingPath);
        modalState.openModal(MODAL_NAMES.UNSAVED_CHANGES);
    }
});
```

**4. Form Synchronization → `useScriptFormSync` Hook (146 lines)**
```typescript
// ❌ Before: 60+ lines of complex state calculation and form syncing
const currentScript = useMemo(() => {
    if (!script) return null;
    // 40+ lines of edit queue operation processing
}, [script, pendingOperations]);

const { hasChanges } = useChangeDetection(/* complex dependencies */);

const handleInfoModeExit = (targetModeId: string) => {
    // 40+ lines of form change processing
};

// ✅ After: Unified form and state management
const { currentScript, hasChanges, handleInfoModeExit } = useScriptFormSync({
    script,
    pendingOperations,
    form,
    activeMode,
    applyLocalChange,
    setActiveMode
});
```

**5. Configuration Extraction → `actionMenuConfig.ts` (50 lines)**
```typescript
// ❌ Before: 35+ lines of inline configuration object
const actions: ActionItem[] = [
    {
        id: 'options',
        label: 'Options',
        onClick: () => modalState.openModal(MODAL_NAMES.OPTIONS),
        isDestructive: false,
        isDisabled: false
    },
    // ... 4 more similar objects
];

// ✅ After: Reusable configuration factory
const actions = createActionMenuConfig({
    onOptionsClick: () => modalState.openModal(MODAL_NAMES.OPTIONS),
    onDuplicateClick: () => modalState.openModal(MODAL_NAMES.DUPLICATE),
    onDeleteClick: modalHandlers.handleDeleteClick
});
```

#### Key Benefits Achieved

**1. Complexity Reduction (Primary Goal)**
- Main component reduced from 1,281 → 724 lines (43.5% reduction)
- Cognitive load significantly decreased
- Easier to understand and modify main component logic

**2. Separation of Concerns**
- Element operations isolated in dedicated hook
- Modal workflows centralized and reusable
- Navigation logic encapsulated with browser APIs
- Form/state synchronization unified

**3. Improved Testability**
- Each hook can be unit tested independently
- Mock dependencies more easily for isolated testing
- Business logic separated from component rendering

**4. Enhanced Reusability**
- Hooks can be used in other script management components
- Configuration patterns easily extended
- Modal workflows applicable to similar pages

**5. Better Maintainability**
- Related functionality grouped logically
- Single responsibility principle enforced
- Easier to locate and modify specific features

#### Strategic Decision Making

**When to Accept Line Count Increases for Complexity Reduction:**

✅ **Worth It:**
- Main component >1000 lines
- Multiple concerns mixed together
- Difficulty locating specific functionality
- Repeated similar patterns across handlers
- Complex state coordination

❌ **Not Worth It:**
- Adding 50+ lines to save 10 lines
- Over-abstracting simple operations
- Creating unnecessary indirection
- Breaking cohesive functionality apart

#### Measurement Criteria

**Complexity Reduction Metrics:**
- **Main component size reduction**: Target 40%+ for large components
- **Logical cohesion**: Related functionality grouped together
- **Reusability potential**: Extracted code useful elsewhere
- **Testability improvement**: Can test business logic in isolation
- **Maintainability**: Easier to locate and modify specific features

**Trade-off Analysis:**
```
Before: 1 file × 1,281 lines = 1,281 total lines
After:  6 files × average 148 lines = 889 total lines + structure
Net:    +136 lines (+10.6%) for -43.5% main component complexity
Verdict: Excellent trade-off for maintainability
```

#### Best Practices for Large Component Refactoring

**1. Identify Extraction Boundaries**
- Group related handlers and state
- Look for natural cohesion patterns
- Separate pure logic from component-specific concerns

**2. Maintain Functionality**
- Extract logic, not just handlers
- Keep the same public interface
- Preserve all existing behavior

**3. Use Descriptive Names**
- Hook names should clearly indicate their responsibility
- Export descriptive interfaces and types
- Document the extracted functionality

**4. Test Incrementally**
- Extract one concern at a time
- Test after each extraction
- Verify no regressions in functionality

**Remember: Complexity reduction often justifies moderate line count increases when it significantly improves maintainability and separation of concerns.**

## Architecture Improvements

### Component Design Patterns

#### 1. Composition over Inheritance
```typescript
// ✅ Use base components with composition
const CustomCard = ({ children, ...props }) => (
    <BaseCard {...props}>
        <CustomContent>{children}</CustomContent>
    </BaseCard>
);
```

#### 2. Separation of Concerns
- **View Components**: Handle rendering and user interactions
- **Custom Hooks**: Manage state and business logic
- **Utils**: Pure functions for calculations and transformations
- **Services**: API calls and external integrations

#### 3. Consistent Error Handling
```typescript
// Standardized error handling pattern
const useApiOperation = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const executeOperation = async (data: OperationData) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await apiCall(data);
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Operation failed';
            setError(message);
            console.error('API operation failed:', message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };
    
    return { executeOperation, isLoading, error };
};
```

## Quality Metrics

### Measurable Improvements
- **Code Reduction**: Track lines of duplicated code eliminated
- **File Consolidation**: Number of shared modules created
- **Import Updates**: Files updated to use shared utilities
- **Type Safety**: Reduction in TypeScript errors/warnings
- **Performance**: Render count improvements and response times

### Quality Indicators
- ✅ **DRY Compliance**: No concrete code duplication
- ✅ **Type Safety**: All interfaces properly defined and shared
- ✅ **Maintainability**: Single-location updates for shared concerns
- ✅ **Performance**: Optimized re-render patterns with event-driven communication
- ✅ **Architecture**: Proper separation of concerns with zero polling intervals

## Best Practices Summary

### Code Organization
1. **Group related functionality** in focused modules
2. **Use descriptive names** for files, functions, and variables
3. **Create shared utilities** for cross-cutting concerns
4. **Maintain consistent patterns** across similar components

### Development Workflow
1. **Identify concrete duplications** before abstracting
2. **Test changes thoroughly** to ensure no regressions
3. **Update documentation** when creating new patterns
4. **Measure impact** of refactoring efforts

### Performance Considerations
1. **Memoize expensive calculations** and component props
2. **Use stable references** for callbacks and objects
3. **Minimize effect dependencies** to reduce unnecessary runs
4. **Profile component render patterns** to identify issues

### Maintenance
1. **Regular code reviews** to catch new duplications early
2. **Consistent error handling** patterns across the application
3. **Documentation updates** when architectural patterns change
4. **Performance monitoring** to catch regressions

---

## Related Documentation

- **[Performance Optimizations](../architecture/performance-optimizations.md)** - Comprehensive render loop optimization and React performance techniques
- **[UI Interaction Guide](./ui-interaction-guide.md)** - Gesture recognition, accessibility, and responsive interaction patterns
- **[Component Architecture](../architecture/component-architecture.md)** - Base component patterns and composition principles
- **[Development Guide](./development-guide.md)** - Complete developer setup, workflow, and daily practices

---

*This guide should be updated as new patterns emerge and quality standards evolve. For specific render optimization techniques, see the [Performance Optimizations](../architecture/performance-optimizations.md) document.*