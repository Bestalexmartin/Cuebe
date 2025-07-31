# UI Interaction Development Guide

## Overview

This guide covers best practices for developing interactive user interfaces in CallMaster, focusing on gesture recognition, context-aware controls, accessibility, and consistent user experience patterns.

## Gesture-Based Interaction Systems

### Click vs Drag Detection

For interfaces that need both click (selection) and drag (reordering) behaviors on the same element:

#### Implementation Pattern
```typescript
const dragTimeoutRef = useRef<number | null>(null);
const isDragStartedRef = useRef(false);
const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    isDragStartedRef.current = false;
    
    // 150ms threshold to distinguish click from drag intent
    dragTimeoutRef.current = setTimeout(() => {
        isDragStartedRef.current = true;
    }, 150);
}, []);

const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseDownPosRef.current) return;
    
    const deltaX = Math.abs(e.clientX - mouseDownPosRef.current.x);
    const deltaY = Math.abs(e.clientY - mouseDownPosRef.current.y);
    
    // 5px movement threshold prevents accidental drags
    if (deltaX > 5 || deltaY > 5) {
        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
        }
        isDragStartedRef.current = true;
    }
}, []);

const handleMouseUp = useCallback(() => {
    if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
    }
    
    // If drag wasn't started, treat as click
    if (!isDragStartedRef.current) {
        handleClick();
    }
    
    // Reset state
    mouseDownPosRef.current = null;
    isDragStartedRef.current = false;
}, [handleClick]);
```

#### Key Principles
- **Time Threshold**: 150ms distinguishes click intent from drag initiation
- **Movement Threshold**: 5px prevents accidental drag triggers
- **Full Area Interaction**: Entire element surface is interactive
- **Clear State Management**: Proper cleanup prevents state leakage

### Accessibility Considerations

#### Enhanced Click Targets
```typescript
// ✅ Full element area is clickable/draggable
const elementStyle = {
    cursor: isDragEnabled ? 'grab' : 'pointer',
    userSelect: 'none',
    // Large touch targets for mobile
    minHeight: '44px',
    width: '100%'
};
```

#### Keyboard Navigation Support
```typescript
const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
        case 'Enter':
        case ' ':
            e.preventDefault();
            handleClick();
            break;
        case 'ArrowUp':
        case 'ArrowDown':
            e.preventDefault();
            // Navigate between elements
            break;
    }
}, [handleClick]);
```

## Context-Aware UI Controls

### Dynamic Button States

Implement buttons that respond to current application context:

```typescript
interface ContextAwareButtonProps {
    id: string;
    label: string;
    icon: IconName;
    isEnabled: boolean;
    context?: {
        hasSelection?: boolean;
        currentMode?: 'view' | 'edit';
        elementCount?: number;
    };
}

const getButtonState = (button: ContextAwareButtonProps) => {
    const { id, context } = button;
    
    switch (id) {
        case 'edit-element':
        case 'duplicate-element':
        case 'delete-element':
            return context?.hasSelection ?? false;
        
        case 'jump-top':
        case 'jump-bottom':
            return (context?.elementCount ?? 0) > 5; // Only show for longer lists
        
        default:
            return button.isEnabled;
    }
};
```

### Mode-Specific Toolbars

Different interface modes should present appropriate controls:

```typescript
const getToolbarButtons = (mode: string, context: UIContext) => {
    const baseButtons = [
        { id: 'view', icon: 'view', label: 'View' },
        { id: 'info', icon: 'info', label: 'Info' }
    ];
    
    const modeSpecificButtons = {
        edit: [
            { id: 'add-element', icon: 'add', label: 'Add' },
            { id: 'edit-element', icon: 'element-edit', label: 'Edit', 
              isEnabled: context.hasSelection },
            { id: 'duplicate-element', icon: 'copy', label: 'Duplicate', 
              isEnabled: context.hasSelection },
            { id: 'delete-element', icon: 'delete', label: 'Delete', 
              isEnabled: context.hasSelection }
        ],
        view: [
            { id: 'script-edit', icon: 'script-edit', label: 'Edit' }
        ]
    };
    
    const navigationButtons = context.elementCount > 3 ? [
        { id: 'jump-top', icon: 'jump-top', label: 'Top' },
        { id: 'jump-bottom', icon: 'jump-bottom', label: 'Bottom' }
    ] : [];
    
    return [...baseButtons, ...modeSpecificButtons[mode], ...navigationButtons];
};
```

## Smart Navigation Systems

### Intelligent Container Detection

For navigation features that work across different UI modes:

```typescript
const findOptimalScrollContainer = (): HTMLElement | null => {
    // Look for containers with the most scrollable content
    const candidates = document.querySelectorAll('.scrollable-container');
    let bestContainer: HTMLElement | null = null;
    let maxScrollableHeight = 0;
    
    for (const container of candidates) {
        if (container instanceof HTMLElement) {
            const scrollableHeight = container.scrollHeight - container.clientHeight;
            if (scrollableHeight > maxScrollableHeight) {
                maxScrollableHeight = scrollableHeight;
                bestContainer = container;
            }
        }
    }
    
    return bestContainer;
};

const handleSmartNavigation = (direction: 'top' | 'bottom') => {
    const container = findOptimalScrollContainer();
    if (!container) return;
    
    const targetPosition = direction === 'top' ? 0 : container.scrollHeight;
    
    // Smooth scrolling for better UX
    container.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
    });
};
```

### Navigation State Awareness

Track scroll position to provide contextual navigation options:

```typescript
const useScrollState = (containerRef: RefObject<HTMLElement>) => {
    const [scrollState, setScrollState] = useState({
        isAtTop: true,
        isAtBottom: false,
        canScrollUp: false,
        canScrollDown: false
    });
    
    const updateScrollState = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        
        const { scrollTop, scrollHeight, clientHeight } = container;
        const scrollableHeight = scrollHeight - clientHeight;
        
        setScrollState({
            isAtTop: scrollTop <= 1,
            isAtBottom: scrollTop >= scrollableHeight - 1,
            canScrollUp: scrollTop > 10,
            canScrollDown: scrollTop < scrollableHeight - 10
        });
    }, []);
    
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        
        container.addEventListener('scroll', updateScrollState);
        updateScrollState(); // Initial state
        
        return () => container.removeEventListener('scroll', updateScrollState);
    }, [updateScrollState]);
    
    return scrollState;
};
```

## Modal and Form Interactions

### Consistent Modal Patterns

Standardize modal behavior across the application:

```typescript
interface StandardModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    primaryAction?: {
        label: string;
        onClick: () => void;
        isLoading?: boolean;
        isDisabled?: boolean;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
}

const StandardModal: React.FC<StandardModalProps> = ({
    isOpen, onClose, title, children, primaryAction, secondaryAction
}) => {
    // Consistent keyboard handling
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
        if (e.key === 'Enter' && primaryAction && !primaryAction.isDisabled) {
            primaryAction.onClick();
        }
    }, [onClose, primaryAction]);
    
    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, handleKeyDown]);
    
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent>
                <ModalHeader>{title}</ModalHeader>
                <ModalBody>{children}</ModalBody>
                <ModalFooter>
                    {secondaryAction && (
                        <Button variant="ghost" onClick={secondaryAction.onClick}>
                            {secondaryAction.label}
                        </Button>
                    )}
                    {primaryAction && (
                        <Button
                            colorScheme="blue"
                            isLoading={primaryAction.isLoading}
                            isDisabled={primaryAction.isDisabled}
                            onClick={primaryAction.onClick}
                        >
                            {primaryAction.label}
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
```

### Form Validation Patterns

Consistent form validation with real-time feedback:

```typescript
const useFormValidation = <T extends Record<string, any>>(
    initialValues: T,
    validationRules: ValidationRules<T>
) => {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
    const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
    
    const validateField = useCallback((field: keyof T, value: any) => {
        const rule = validationRules[field];
        if (!rule) return null;
        
        if (rule.required && (!value || value.toString().trim() === '')) {
            return `${String(field)} is required`;
        }
        
        if (rule.minLength && value.length < rule.minLength) {
            return `${String(field)} must be at least ${rule.minLength} characters`;
        }
        
        if (rule.maxLength && value.length > rule.maxLength) {
            return `${String(field)} must be no more than ${rule.maxLength} characters`;
        }
        
        if (rule.pattern && !rule.pattern.test(value)) {
            return rule.message || `${String(field)} format is invalid`;
        }
        
        return null;
    }, [validationRules]);
    
    const updateField = useCallback((field: keyof T, value: any) => {
        setValues(prev => ({ ...prev, [field]: value }));
        setTouched(prev => ({ ...prev, [field]: true }));
        
        // Real-time validation
        const error = validateField(field, value);
        setErrors(prev => ({ ...prev, [field]: error }));
    }, [validateField]);
    
    const isValid = Object.keys(errors).every(key => !errors[key as keyof T]);
    const hasChanges = JSON.stringify(values) !== JSON.stringify(initialValues);
    
    return {
        values,
        errors,
        touched,
        isValid,
        hasChanges,
        updateField,
        setValues,
        setErrors
    };
};
```

## Visual Feedback Systems

### Selection and State Indicators

Provide clear visual feedback for interactive elements:

```typescript
const getElementStyles = (state: ElementState) => {
    const baseStyles = {
        transition: 'all 0.2s ease-in-out',
        cursor: 'pointer',
        borderRadius: 'md',
        padding: 4
    };
    
    const stateStyles = {
        default: {
            borderWidth: '1px',
            borderColor: 'container.border',
            backgroundColor: 'container.bg'
        },
        selected: {
            borderWidth: '2px',
            borderColor: 'blue.400',
            backgroundColor: 'blue.50',
            boxShadow: '0 0 0 1px rgba(66, 153, 225, 0.1)'
        },
        hovered: {
            borderColor: 'blue.200',
            backgroundColor: 'blue.25',
            transform: 'translateY(-1px)'
        },
        disabled: {
            opacity: 0.5,
            cursor: 'not-allowed',
            backgroundColor: 'gray.50'
        }
    };
    
    return { ...baseStyles, ...stateStyles[state.current] };
};
```

### Toast Notification Standards

Consistent messaging across operations:

```typescript
const showOperationResult = (
    operation: string,
    success: boolean,
    details?: string
) => {
    const message = success
        ? `${operation} completed successfully`
        : `${operation} failed${details ? `: ${details}` : ''}`;
    
    toast({
        title: success ? 'Success' : 'Error',
        description: message,
        status: success ? 'success' : 'error',
        duration: success ? 3000 : 5000,
        isClosable: true,
        position: 'top-right'
    });
};

// Usage examples
showOperationResult('Script Element created', true);
showOperationResult('Script Element deleted', false, 'Network error');
```

## Performance Considerations

### Event Handler Optimization

Optimize event handlers for responsive interactions:

```typescript
// ✅ Debounce rapid user inputs
const debouncedHandler = useMemo(
    () => debounce((value: string) => {
        // Expensive operation
        performSearch(value);
    }, 300),
    []
);

// ✅ Throttle scroll events
const throttledScrollHandler = useMemo(
    () => throttle(() => {
        updateScrollState();
    }, 16), // ~60fps
    []
);

// ✅ Memoize callback functions
const handleElementClick = useCallback((elementId: string) => {
    if (selectedElementId === elementId) {
        setSelectedElementId(null); // Deselect
    } else {
        setSelectedElementId(elementId); // Select
    }
}, [selectedElementId]);
```

### DOM Interaction Efficiency

Minimize DOM queries and manipulations:

```typescript
// ✅ Cache DOM references
const containerRef = useRef<HTMLElement>();
const scrollPositionRef = useRef(0);

// ✅ Batch DOM updates
const updateMultipleElements = useCallback((updates: ElementUpdate[]) => {
    // Use DocumentFragment for multiple DOM changes
    const fragment = document.createDocumentFragment();
    
    updates.forEach(update => {
        const element = document.getElementById(update.id);
        if (element) {
            Object.assign(element.style, update.styles);
        }
    });
    
    // Single DOM update
    containerRef.current?.appendChild(fragment);
}, []);
```

## Testing Interactive Features

### Gesture Testing Patterns

Test gesture recognition and interaction flows:

```typescript
const testGestureRecognition = () => {
    // Test click detection
    fireEvent.mouseDown(element, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(element, { clientX: 100, clientY: 100 });
    expect(mockClickHandler).toHaveBeenCalled();
    
    // Test drag detection
    fireEvent.mouseDown(element, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(element, { clientX: 110, clientY: 100 }); // 10px movement
    fireEvent.mouseUp(element, { clientX: 110, clientY: 100 });
    expect(mockDragHandler).toHaveBeenCalled();
    expect(mockClickHandler).not.toHaveBeenCalled();
};
```

### Accessibility Testing

Ensure keyboard navigation and screen reader compatibility:

```typescript
const testKeyboardNavigation = () => {
    // Focus management
    element.focus();
    expect(element).toHaveFocus();
    
    // Keyboard activation
    fireEvent.keyDown(element, { key: 'Enter' });
    expect(mockActivateHandler).toHaveBeenCalled();
    
    // Arrow key navigation
    fireEvent.keyDown(element, { key: 'ArrowDown' });
    expect(nextElement).toHaveFocus();
};
```

## Best Practices Summary

### Interaction Design
1. **Use appropriate time/movement thresholds** for gesture recognition
2. **Provide immediate visual feedback** for all user actions
3. **Make click targets large enough** for both mouse and touch
4. **Support keyboard navigation** for accessibility

### Context Awareness
1. **Enable/disable controls** based on current state
2. **Show relevant actions** for the current mode
3. **Provide contextual help** and guidance
4. **Adapt to different screen sizes** and input methods

### Performance
1. **Debounce/throttle rapid events** to prevent performance issues
2. **Cache DOM references** to avoid repeated queries
3. **Memoize expensive calculations** and event handlers
4. **Batch DOM updates** when possible

### Consistency
1. **Use standard patterns** across similar interactions
2. **Maintain consistent terminology** in UI text and code
3. **Follow established design tokens** for colors, spacing, and typography
4. **Implement uniform error handling** and user feedback

---

## Related Documentation

- **[Performance Optimizations](../architecture/performance-optimizations.md)** - React render optimization and memoization strategies
- **[Code Quality Guide](./code-quality-guide.md)** - DRY principles, performance patterns, and maintainable architecture
- **[Component Architecture](../architecture/component-architecture.md)** - Base component patterns and composition principles
- **[Script Element Interaction System](../architecture/script-element-interaction-system.md)** - Specific click-to-select and drag-to-reorder implementation
- **[Development Guide](./development-guide.md)** - Complete developer setup and workflow

---

*This guide should be referenced when developing new interactive features and updated as interaction patterns evolve. For performance-specific optimizations, see [Performance Optimizations](../architecture/performance-optimizations.md).*