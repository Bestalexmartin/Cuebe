# Frontend Architecture Patterns

**Date:** January 2025  
**Status:** Current  
**Category:** Development Guide

The Cuebe frontend follows sophisticated architectural patterns designed for maintainability, performance, and scalability. This guide documents the key patterns and structures that make the codebase both powerful and maintainable.

## Overview

Cuebe's frontend architecture is built around several key principles:
- **Feature-based organization** for clear separation of concerns
- **Composition over inheritance** for reusable UI components
- **Hook-based state management** for clean, testable logic
- **Performance optimization** through React.memo and careful re-render control
- **Type safety** with comprehensive TypeScript integration

## Directory Structure & Organization

### Feature-Based Architecture

```
src/
├── features/           # Feature-specific code
│   ├── script/        # Script management (largest feature)
│   ├── shows/         # Show management
│   ├── venues/        # Venue management
│   ├── departments/   # Department management
│   └── crews/         # Crew management
├── components/        # Shared/reusable components
├── hooks/            # Shared custom hooks
├── pages/            # Page-level components
├── services/         # API services and utilities
└── utils/            # Pure utility functions
```

### Feature Internal Structure

Each feature follows a consistent internal structure:

```
features/script/
├── components/        # Feature-specific UI components
│   ├── modals/       # Modal components
│   └── modes/        # Script mode components (View, Edit, etc.)
├── hooks/            # Feature-specific hooks
├── types/            # TypeScript definitions
├── utils/            # Feature utilities
├── config/           # Configuration objects
└── constants.ts      # Feature constants
```

## Component Architecture Patterns

### 1. Base Component System

#### BaseCard Pattern
Located in `components/base/BaseCard.tsx`

**Purpose**: Provides consistent card UI across the application

```typescript
interface BaseCardProps {
    children: React.ReactNode;
    title?: string;
    isSelected?: boolean;
    isHovered?: boolean;
    onClick?: () => void;
    // Performance optimization
    data?: any; // Used for memo comparison
}

const BaseCard = React.memo<BaseCardProps>((props) => {
    // Implementation with consistent styling
}, (prevProps, nextProps) => {
    // Custom comparison for performance
    return isEqual(prevProps.data, nextProps.data) && 
           prevProps.isSelected === nextProps.isSelected;
});
```

**Key Features**:
- Consistent hover states (orange borders)
- Performance optimization with React.memo
- Custom comparison functions for complex data
- Flexible content composition

#### BaseModal Pattern
Located in `components/base/BaseModal.tsx`

**Purpose**: Standardized modal interface across all features

```typescript
interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    // Modal-specific features
    showCloseButton?: boolean;
    closeOnOverlayClick?: boolean;
    closeOnEsc?: boolean;
}
```

**Integration Pattern**:
```typescript
// Modal usage in features
const CreateShowModal: React.FC<Props> = ({ isOpen, onClose }) => (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Create New Show">
        <ShowForm onSubmit={handleSubmit} />
    </BaseModal>
);
```

#### BaseUtilityPage Pattern
Located in `components/base/BaseUtilityPage.tsx`

**Purpose**: Standardized layout for utility pages (Documentation, Test Tools, etc.)

**Features**:
- Consistent header with page title and icon
- Right-side navigation panel (QuickAccess)
- Responsive layout with mobile drawer
- Content area management

### 2. Modal Management System

#### Centralized Modal State
```typescript
// hooks/useModalManager.ts
interface ModalState {
    openModals: Set<string>;
    modalData: Map<string, any>;
}

const useModalManager = () => {
    const [state, setState] = useState<ModalState>({
        openModals: new Set(),
        modalData: new Map()
    });
    
    const openModal = useCallback((modalName: string, data?: any) => {
        setState(prev => ({
            openModals: new Set([...prev.openModals, modalName]),
            modalData: new Map([...prev.modalData, [modalName, data]])
        }));
    }, []);
    
    const closeModal = useCallback((modalName: string) => {
        setState(prev => {
            const newOpenModals = new Set(prev.openModals);
            const newModalData = new Map(prev.modalData);
            newOpenModals.delete(modalName);
            newModalData.delete(modalName);
            return { openModals: newOpenModals, modalData: newModalData };
        });
    }, []);
    
    return { openModal, closeModal, isOpen: (name: string) => state.openModals.has(name) };
};
```

#### Modal Integration Pattern
```typescript
// In feature components
const ScriptToolbar: React.FC = () => {
    const modalManager = useModalManager();
    
    return (
        <>
            <Button onClick={() => modalManager.openModal(MODAL_NAMES.CREATE_ELEMENT)}>
                Add Element
            </Button>
            
            <CreateElementModal 
                isOpen={modalManager.isOpen(MODAL_NAMES.CREATE_ELEMENT)}
                onClose={() => modalManager.closeModal(MODAL_NAMES.CREATE_ELEMENT)}
            />
        </>
    );
};
```

## Hook Architecture Patterns

### 1. Data Management Hooks

#### Resource Hook Pattern
Located in `hooks/useResource.ts`

**Purpose**: Standardized data fetching and caching

```typescript
interface UseResourceReturn<T> {
    data: T | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    mutate: (newData: T) => void; // Optimistic updates
}

const useResource = <T>(
    endpoint: string,
    dependencies: any[] = []
): UseResourceReturn<T> => {
    // Implementation with caching, error handling, and optimistic updates
};

// Usage in features
const useShows = () => useResource<Show[]>('/api/shows');
const useScript = (scriptId: string) => useResource<Script>(`/api/scripts/${scriptId}`, [scriptId]);
```

#### Form Management Hooks
Located in `hooks/useFormManager.ts`

**Purpose**: Consistent form state and validation

```typescript
interface UseFormManagerReturn<T> {
    formData: T;
    errors: Record<keyof T, string>;
    isValid: boolean;
    isDirty: boolean;
    updateField: (field: keyof T, value: any) => void;
    resetForm: () => void;
    validateForm: () => boolean;
}

const useFormManager = <T>(
    initialData: T,
    validationRules: ValidationRules<T>
): UseFormManagerReturn<T> => {
    // Implementation with validation and change tracking
};
```

### 2. Feature-Specific Hook Patterns

#### Script Management Hooks
Located in `features/script/hooks/`

**Complex State Coordination**:
```typescript
// useScriptElementsWithEditQueue.ts - Combines server state with local changes
const useScriptElementsWithEditQueue = (scriptId: string) => {
    const { data: serverElements } = useScriptElements(scriptId);
    const editQueue = useEditQueue();
    
    // Compute current view state
    const elements = useMemo(() => {
        return applyEditQueueOperations(serverElements, editQueue.operations);
    }, [serverElements, editQueue.operations]);
    
    const saveChanges = useCallback(async () => {
        const operations = editQueue.operations;
        await batchUpdateElements(scriptId, operations);
        editQueue.clearQueue();
        // Refetch to ensure consistency
    }, [scriptId, editQueue]);
    
    return {
        elements,           // Current view (server + local changes)
        serverElements,     // Original server state
        pendingOperations: editQueue.operations,
        hasUnsavedChanges: editQueue.hasUnsavedChanges,
        saveChanges,
        discardChanges: editQueue.clearQueue
    };
};
```

#### Mode Management Pattern
```typescript
// useScriptModes.ts - Manages 6-mode script interface
interface ScriptModeState {
    activeMode: ScriptMode;
    availableModes: ScriptMode[];
    canSwitchTo: (mode: ScriptMode) => boolean;
    switchToMode: (mode: ScriptMode) => void;
}

const useScriptModes = (hasUnsavedChanges: boolean): ScriptModeState => {
    const [activeMode, setActiveMode] = useState<ScriptMode>('view');
    
    const canSwitchTo = useCallback((targetMode: ScriptMode) => {
        // Logic for mode transitions with unsaved changes handling
        if (hasUnsavedChanges && activeMode === 'edit') {
            return false; // Require save/discard first
        }
        return true;
    }, [hasUnsavedChanges, activeMode]);
    
    return { activeMode, canSwitchTo, switchToMode: setActiveMode };
};
```

## Performance Optimization Patterns

### 1. React.memo Usage

#### Component Memoization Strategy
```typescript
// For components with complex props
const ScriptElementCard = React.memo<Props>((props) => {
    // Component implementation
}, (prevProps, nextProps) => {
    // Custom comparison for performance
    return (
        prevProps.element.element_id === nextProps.element.element_id &&
        prevProps.element.date_updated === nextProps.element.date_updated &&
        prevProps.isSelected === nextProps.isSelected
    );
});

// For simple components, default comparison
const SaveButton = React.memo<SaveButtonProps>((props) => {
    // Implementation
}); // Uses default shallow comparison
```

#### Hook Memoization
```typescript
const useScriptElements = (scriptId: string) => {
    // Memoize expensive computations
    const sortedElements = useMemo(() => {
        return elements.sort((a, b) => a.sequence - b.sequence);
    }, [elements]);
    
    // Memoize callbacks to prevent child re-renders
    const updateElement = useCallback((elementId: string, changes: any) => {
        // Implementation
    }, [scriptId]); // Only recreate if scriptId changes
    
    return { sortedElements, updateElement };
};
```

### 2. Render Optimization

#### Conditional Rendering Patterns
```typescript
// Avoid unnecessary renders in mode systems
const ManageScriptPage: React.FC = () => {
    const { activeMode } = useScriptModes();
    
    // Only render active mode component
    const renderModeComponent = () => {
        switch (activeMode) {
            case 'view': return <ViewMode />;
            case 'edit': return <EditMode />;
            case 'info': return <InfoMode />;
            default: return null;
        }
    };
    
    return (
        <div>
            <ScriptToolbar />
            {renderModeComponent()} {/* Only one mode rendered at a time */}
        </div>
    );
};
```

#### List Optimization
```typescript
// Efficient list rendering with stable keys
const ScriptElementsList: React.FC = () => {
    const { elements } = useScriptElements();
    
    return (
        <VStack spacing={2}>
            {elements.map((element) => (
                <ScriptElementCard
                    key={element.element_id} // Stable key
                    element={element}
                    // Memoized props to prevent unnecessary re-renders
                />
            ))}
        </VStack>
    );
};
```

## State Management Patterns

### 1. Local State vs Global State

#### Local State (useState/useReducer)
- Component-specific UI state
- Form data before submission
- Modal open/closed states
- Temporary UI states (hover, focus, etc.)

#### Global State (Context/Custom Hooks)
- User authentication and preferences
- Modal management across features
- Edit queue state
- Navigation state

### 2. State Synchronization

#### Server State + Local Changes Pattern
```typescript
// Pattern used throughout the app for optimistic updates
const useSynchronizedState = <T>(
    serverData: T,
    localChanges: Change[],
    applyChanges: (data: T, changes: Change[]) => T
) => {
    const currentState = useMemo(() => {
        return applyChanges(serverData, localChanges);
    }, [serverData, localChanges, applyChanges]);
    
    return currentState;
};
```

#### Change Detection Pattern
```typescript
// Used for unsaved changes detection
const useChangeDetection = <T>(original: T, current: T) => {
    const hasChanges = useMemo(() => {
        return !isEqual(original, current);
    }, [original, current]);
    
    const changedFields = useMemo(() => {
        return getChangedFields(original, current);
    }, [original, current]);
    
    return { hasChanges, changedFields };
};
```

## Type Safety Patterns

### 1. Discriminated Unions

#### Operation Types
```typescript
// Edit queue operations use discriminated unions
type EditOperation = 
    | { type: 'UPDATE_FIELD'; field: string; oldValue: any; newValue: any; }
    | { type: 'REORDER'; oldIndex: number; newIndex: number; }
    | { type: 'CREATE_ELEMENT'; elementData: ScriptElement; }
    | { type: 'DELETE_ELEMENT'; elementId: string; };

// Type-safe operation handling
const applyOperation = (elements: ScriptElement[], operation: EditOperation) => {
    switch (operation.type) {
        case 'UPDATE_FIELD':
            // TypeScript knows this has 'field', 'oldValue', 'newValue'
            return updateElementField(elements, operation);
        case 'REORDER':
            // TypeScript knows this has 'oldIndex', 'newIndex'
            return reorderElements(elements, operation);
        // ... other cases
    }
};
```

### 2. Generic Patterns

#### API Response Types
```typescript
interface ApiResponse<T> {
    data: T;
    success: boolean;
    message?: string;
    errors?: ValidationError[];
}

// Type-safe API calls
const fetchScript = async (id: string): Promise<ApiResponse<Script>> => {
    // Implementation
};
```

#### Component Props with Generics
```typescript
interface BaseCardProps<T> {
    data: T;
    onSelect?: (item: T) => void;
    isSelected?: boolean;
    renderContent: (item: T) => React.ReactNode;
}

const BaseCard = <T,>({ data, onSelect, isSelected, renderContent }: BaseCardProps<T>) => {
    // Implementation with type safety
};
```

## Error Handling Patterns

### 1. Error Boundaries

#### Feature-Level Error Boundaries
```typescript
// ErrorBoundary component wraps each major feature
const ErrorBoundary: React.FC<{ context: string; children: React.ReactNode }> = ({
    context,
    children
}) => {
    const [hasError, setHasError] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    
    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            console.error(`Error in ${context}:`, event.error);
            setError(event.error);
            setHasError(true);
        };
        
        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
    }, [context]);
    
    if (hasError) {
        return <ErrorFallback context={context} error={error} />;
    }
    
    return <>{children}</>;
};
```

### 2. API Error Handling

#### Consistent Error Handling
```typescript
const useApiCall = <T,>(apiCall: () => Promise<T>) => {
    const [state, setState] = useState<{
        data: T | null;
        loading: boolean;
        error: string | null;
    }>({ data: null, loading: false, error: null });
    
    const execute = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const result = await apiCall();
            setState({ data: result, loading: false, error: null });
        } catch (error) {
            setState(prev => ({ 
                ...prev, 
                loading: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            }));
        }
    }, [apiCall]);
    
    return { ...state, execute };
};
```

## Mobile Responsiveness Patterns

### 1. Responsive Hooks

#### Screen Size Detection
```typescript
const useScreenSize = () => {
    const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
    
    useEffect(() => {
        const checkScreenSize = () => {
            const width = window.innerWidth;
            if (width < 768) setScreenSize('mobile');
            else if (width < 1024) setScreenSize('tablet');
            else setScreenSize('desktop');
        };
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);
    
    return screenSize;
};
```

### 2. Adaptive Components

#### Mobile-First Component Design
```typescript
const ScriptElementsList: React.FC = () => {
    const screenSize = useScreenSize();
    
    if (screenSize === 'mobile') {
        return <MobileScriptDrawer />; // Specialized mobile component
    }
    
    return <DesktopScriptView />; // Full desktop interface
};
```

## Testing Patterns

### 1. Hook Testing

#### Custom Hook Testing
```typescript
// Testing custom hooks with renderHook
import { renderHook, act } from '@testing-library/react';

describe('useEditQueue', () => {
    test('should add operation to queue', () => {
        const { result } = renderHook(() => useEditQueue());
        
        act(() => {
            result.current.addOperation({
                type: 'UPDATE_FIELD',
                elementId: 'test-id',
                field: 'name',
                oldValue: 'old',
                newValue: 'new'
            });
        });
        
        expect(result.current.operations).toHaveLength(1);
        expect(result.current.hasUnsavedChanges).toBe(true);
    });
});
```

### 2. Component Testing

#### Component Testing with Mocks
```typescript
// Testing components with mocked hooks
jest.mock('../hooks/useScript', () => ({
    useScript: () => ({
        data: mockScript,
        isLoading: false,
        error: null
    })
}));

describe('ScriptView', () => {
    test('should render script elements', () => {
        render(<ScriptView scriptId="test-id" />);
        expect(screen.getByText('Test Script')).toBeInTheDocument();
    });
});
```

## Performance Monitoring

### 1. Render Count Monitoring

#### Development-Only Performance Tracking
```typescript
const useRenderCount = (componentName: string) => {
    const renderCount = useRef(0);
    
    useEffect(() => {
        renderCount.current += 1;
        if (process.env.NODE_ENV === 'development') {
            console.log(`${componentName} rendered ${renderCount.current} times`);
            if (renderCount.current > 10) {
                console.warn(`${componentName} has rendered ${renderCount.current} times - check for optimization opportunities`);
            }
        }
    });
};
```

### 2. Performance Budgets

#### Component Performance Guidelines
- **Maximum 10 renders per user action** - If exceeded, investigate memo opportunities
- **Modal open time < 200ms** - Optimize modal content loading
- **List rendering < 100ms for 100 items** - Use virtualization for larger lists
- **Form validation < 50ms** - Debounce validation for complex forms

## Future Architecture Considerations

### 1. State Management Evolution
- Consider React Query/SWR for server state management
- Evaluate Zustand or Valtio for complex global state
- Implement service worker for offline capabilities

### 2. Performance Enhancements
- Code splitting at the feature level
- Lazy loading for non-critical components
- Virtual scrolling for large element lists
- Web Workers for heavy computations

### 3. Developer Experience
- Storybook integration for component development
- Enhanced TypeScript strictness
- Automated performance regression testing
- Component API documentation generation

This architecture provides a solid foundation for scaling the Cuebe frontend while maintaining code quality, performance, and developer productivity.