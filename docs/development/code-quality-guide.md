# Code Quality Guide

## Overview

This guide documents systematic approaches to maintaining and improving code quality in the CallMaster codebase, focusing on DRY (Don't Repeat Yourself) principles, performance optimization, and maintainable architecture patterns.

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
- ✅ **Performance**: Optimized re-render patterns
- ✅ **Architecture**: Proper separation of concerns

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