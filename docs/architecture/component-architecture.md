# Component Architecture Guide

**Date:** July 2025  
**Status:** Current  
**Category:** Architecture & Component Design

## Overview

CallMaster uses a sophisticated component architecture built around base components that provide consistent functionality and eliminate code duplication. This guide explains the design patterns and provides examples for extending the system.

## Architecture Principles

### 1. Composition Over Inheritance
Components use composition patterns rather than class inheritance, allowing for:
- Flexible content areas
- Type-safe prop interfaces
- Runtime adaptability
- Easy testing and maintenance

### 2. Base Component Foundation
Multiple base components provide the foundation:
- **BaseCard**: For displaying entity information (shows, venues, crew, etc.)
- **BaseModal**: For forms and user interactions
- **BaseEditPage**: For entity editing workflows
- **BaseUtilityPage**: For administrative and utility interfaces

### 3. Consistent Patterns
All components follow established patterns for:
- Props interfaces
- Event handling
- State management
- Error boundaries
- Loading states

### 4. Modal State Management
Centralized modal state management using the `useModalState` hook:
- Type-safe modal naming conventions
- Centralized open/close state tracking
- Support for multiple simultaneous modals
- Integration with component lifecycle

### 5. ForwardRef Pattern for Mode Components
Script mode components use React's `forwardRef` pattern for parent-child communication:
- Eliminates useEffect dependencies
- Provides direct method access
- Prevents infinite re-render loops
- Enables imperative interactions when needed

## BaseCard Architecture

### Component Hierarchy
```
BaseCard (Foundation)
├── ShowCard
├── VenueCard
├── CrewCard
└── DepartmentCard
```

### Content Areas
BaseCard provides flexible content areas through composition:

```typescript
interface BaseCardProps {
  // Core functionality
  title: string;
  isSelected: boolean;
  isHovered: boolean;
  onCardClick: () => void;
  
  // Content areas (composition)
  headerBadges?: React.ReactNode;      // Badges next to title
  headerActions?: BaseCardAction[];    // Action buttons when selected
  quickInfo?: React.ReactNode;         // Always visible info
  expandedContent?: React.ReactNode;   // Shown when selected
  children?: React.ReactNode;          // Custom content area
  
  // Loading & performance
  isLoading?: boolean;
  skeletonVariant?: SkeletonVariant;
}
```

### Usage Example
```tsx
// ShowCard extends BaseCard
return (
  <BaseCard
    title={show.showName}
    cardId={show.showID}
    isSelected={isSelected}
    isHovered={isHovered}
    onCardClick={() => onShowClick(show.showID)}
    
    // Composed content areas
    headerActions={[
      { label: "Edit", icon: "edit", onClick: handleEdit },
      { label: "Scripts", icon: "script", onClick: handleScripts }
    ]}
    quickInfo={
      <VStack spacing={1}>
        <Text>Date: {formatDate(show.showDate)}</Text>
        <Text>Venue: {show.venue?.venueName}</Text>
      </VStack>
    }
    expandedContent={
      <ScriptsList scripts={show.scripts} />
    }
    
    // Performance optimization
    isLoading={isLoadingShows}
    skeletonVariant="show"
  />
);
```

### Loading States
BaseCard includes intelligent skeleton loading with context-aware variants:

```typescript
// Skeleton variants adapt to content type
type SkeletonVariant = 'default' | 'show' | 'venue' | 'crew' | 'department';

// Show skeleton includes dates, venues, scripts
// Venue skeleton includes capacity, equipment
// Crew skeleton includes names, roles, contact info
// Department skeleton includes colors, descriptions
```

## BaseModal Architecture

### Component Hierarchy
```
BaseModal (Foundation)
├── CreateShowModal
├── CreateVenueModal
├── CreateCrewModal
├── CreateDepartmentModal
└── CreateScriptModal
```

### Modal Structure
BaseModal provides consistent modal functionality:

```typescript
interface BaseModalProps {
  // Core modal functionality
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  
  // Form handling
  onSubmit?: (event: React.FormEvent) => void;
  
  // Action configuration
  primaryAction?: BaseModalAction;      // Main action (Create, Save, etc.)
  secondaryAction?: BaseModalAction;    // Cancel, secondary action
  customActions?: BaseModalAction[];    // Additional actions
  
  // Validation integration
  validationErrors?: FieldError[];
  showValidationErrors?: boolean;
  
  // Error boundaries
  errorBoundaryContext?: string;
}
```

### Usage Example
```tsx
// CreateShowModal extends BaseModal
return (
  <BaseModal
    title="Create New Show"
    isOpen={isOpen}
    onClose={handleModalClose}
    onSubmit={handleSubmit}
    
    // Action configuration
    primaryAction={{
      label: "Create Show",
      variant: "primary",
      isLoading: form.isSubmitting,
      isDisabled: !canSubmit
    }}
    
    // Validation integration
    validationErrors={form.fieldErrors}
    showValidationErrors={form.fieldErrors.length > 0}
    errorBoundaryContext="CreateShowModal"
  >
    {/* Form content goes here */}
    <VStack spacing={4}>
      <FormInput form={form} name="showName" label="Show Name" />
      <FormInput form={form} name="showDate" label="Show Date" type="datetime-local" />
    </VStack>
  </BaseModal>
);
```

## Form Architecture

### Validation System
Centralized validation through custom hooks:

```typescript
// Reusable validation patterns
const form = useValidatedForm<FormData>(initialState, {
  validationConfig: VALIDATION_CONFIG,
  validateOnBlur: true,
  showFieldErrorsInToast: false
});

// Standard validation for common patterns
const { canSubmit } = useStandardFormValidation(form, ['requiredField1', 'requiredField2']);
```

### Error Handling
Consistent error handling across all forms:
- Validation errors displayed in real-time
- Form-level error boundaries
- Toast notifications for system errors
- Graceful fallback for network issues

## Performance Optimization

### React.memo Implementation
All components use React.memo for performance:

```typescript
// Base components use custom comparison functions
const arePropsEqual = (prevProps: Props, nextProps: Props): boolean => {
  // Intelligent comparison logic
  // Compare primitives, shallow compare React nodes
  // Skip function reference comparison
};

export const Component = React.memo(ComponentImpl, arePropsEqual);

// Card components use simple React.memo
export const ShowCard = React.memo(ShowCardComponent);
```

### Loading State Optimization
- Skeleton loading prevents layout shifts
- Context-aware placeholders match actual content
- Smooth transitions between loading and loaded states

## Development Patterns

### Creating New Card Components

1. **Define the entity interface**:
```typescript
interface MyEntity {
  id: string;
  name: string;
  // ... other properties
}

interface MyCardProps {
  entity: MyEntity;
  isSelected: boolean;
  isHovered: boolean;
  onEntityClick: (id: string) => void;
  // ... other handlers
  isLoading?: boolean;
}
```

2. **Implement the component**:
```typescript
const MyCardComponent: React.FC<MyCardProps> = ({
  entity,
  isSelected,
  isHovered,
  onEntityClick,
  isLoading = false
}) => {
  // Build content areas
  const quickInfo = (
    <VStack spacing={1}>
      <Text>Property: {entity.property}</Text>
    </VStack>
  );

  const expandedContent = (
    <Box>
      {/* Detailed information when selected */}
    </Box>
  );

  return (
    <BaseCard
      title={entity.name}
      cardId={entity.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onCardClick={() => onEntityClick(entity.id)}
      quickInfo={quickInfo}
      expandedContent={expandedContent}
      isLoading={isLoading}
      skeletonVariant="default" // or create a custom variant
    />
  );
};

export const MyCard = React.memo(MyCardComponent);
```

3. **Add skeleton variant (optional)**:
```typescript
// In BaseCard's getSkeletonContent function
case 'myEntity':
  return (
    <>
      <Skeleton height="20px" width="150px" />
      <VStack spacing={1}>
        <Skeleton height="16px" width="100px" />
        <Skeleton height="16px" width="80px" />
      </VStack>
    </>
  );
```

### Creating New Modal Components

1. **Define form data interface**:
```typescript
interface MyFormData {
  field1: string;
  field2: string;
}

interface MyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEntityCreated: () => void;
}
```

2. **Implement with validation**:
```typescript
const MyModalComponent: React.FC<MyModalProps> = ({
  isOpen,
  onClose,
  onEntityCreated
}) => {
  const form = useValidatedForm<MyFormData>(INITIAL_STATE, {
    validationConfig: VALIDATION_CONFIG,
    validateOnBlur: true
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    // Submit logic
  };

  const { canSubmit } = useStandardFormValidation(form, ['field1']);

  return (
    <BaseModal
      title="Create New Entity"
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      primaryAction={{
        label: "Create",
        variant: "primary",
        isLoading: form.isSubmitting,
        isDisabled: !canSubmit
      }}
      validationErrors={form.fieldErrors}
    >
      <VStack spacing={4}>
        <FormInput form={form} name="field1" label="Field 1" isRequired />
        <FormInput form={form} name="field2" label="Field 2" />
      </VStack>
    </BaseModal>
  );
};

export const MyModal = React.memo(MyModalComponent);
```

## Best Practices

### Component Design
1. **Always extend base components** when the functionality fits
2. **Use composition** for flexible content areas
3. **Implement loading states** for better UX
4. **Follow naming conventions** (ComponentName + Component suffix for memo)

### Performance
1. **Use React.memo** for all presentational components
2. **Implement useCallback** for event handlers
3. **Memoize expensive calculations** with useMemo
4. **Avoid inline functions** in render methods

### Type Safety
1. **Define strict interfaces** for all props
2. **Use generic types** where appropriate
3. **Extend base interfaces** for consistency
4. **Document complex prop types** with comments

### Error Handling
1. **Wrap components in error boundaries**
2. **Provide meaningful error context**
3. **Implement graceful fallbacks**
4. **Use consistent validation patterns**

## Testing Components

### Unit Testing
```typescript
import { render, screen } from '@testing-library/react';
import { MyCard } from './MyCard';

test('renders entity information', () => {
  const entity = { id: '1', name: 'Test Entity' };
  render(
    <MyCard 
      entity={entity}
      isSelected={false}
      isHovered={false}
      onEntityClick={jest.fn()}
    />
  );
  
  expect(screen.getByText('Test Entity')).toBeInTheDocument();
});
```

### Integration Testing
```typescript
test('handles selection and expansion', async () => {
  const onEntityClick = jest.fn();
  render(<MyCard {...props} onEntityClick={onEntityClick} />);
  
  await user.click(screen.getByRole('button'));
  expect(onEntityClick).toHaveBeenCalledWith('1');
});
```

## BaseEditPage Architecture

### Overview
BaseEditPage provides a consistent layout and functionality pattern for all edit pages in the application, eliminating code duplication and ensuring uniform user experience across entity editing interfaces.

### Component Structure
```typescript
interface BaseEditPageProps {
  // Page configuration
  pageTitle: string;
  pageIcon?: string;
  
  // Form handling
  onSubmit?: (event: React.FormEvent) => void;
  isLoading?: boolean;
  
  // Action configuration
  primaryAction?: {
    label: string;
    variant: "primary" | "outline";
    type?: "submit" | "button";
    isLoading?: boolean;
    isDisabled?: boolean;
    onClick?: () => void;
  };
  secondaryActions?: Array<{
    label: string;
    variant: "primary" | "outline";
    onClick: () => void;
  }>;
  menuActions?: ActionItem[];
  
  // Content
  children: React.ReactNode;
}
```

### Usage Pattern
```tsx
<BaseEditPage
  pageTitle={entity?.name || 'Entity'}
  onSubmit={handleSubmit}
  isLoading={isLoadingEntity}
  primaryAction={{
    label: "Save Changes",
    variant: "primary",
    type: "submit",
    isLoading: form.isSubmitting,
    isDisabled: !isFormValid()
  }}
  secondaryActions={[{
    label: "Cancel",
    variant: "outline",
    onClick: handleClose
  }]}
  menuActions={actions}
>
  {/* Form content */}
  
  {/* Floating validation errors */}
  {form.fieldErrors.length > 0 && (
    <FloatingValidationErrors errors={form.fieldErrors} />
  )}
</BaseEditPage>
```

### Refactoring Impact
The BaseEditPage refactoring eliminated significant code duplication across edit pages:

**Before Refactoring** (estimated original line counts):
- EditShowPage: ~450 lines
- EditVenuePage: ~580 lines  
- EditCrewPage: ~650 lines
- EditDepartmentPage: ~480 lines
- EditScriptPage: ~420 lines
- **Total: ~2,580 lines**

**After Refactoring**:
- BaseEditPage: 130 lines (shared component)
- EditShowPage: 390 lines
- EditVenuePage: 523 lines
- EditCrewPage: 576 lines  
- EditDepartmentPage: 421 lines
- EditScriptPage: 382 lines
- **Total: 2,422 lines**

**Code Reduction**: ~158 lines eliminated (~6% reduction) while improving:
- Consistency across all edit pages
- Maintainability through centralized layout logic
- Type safety with shared interfaces
- Enhanced floating validation error styling
- Standardized action button patterns

### Key Features

1. **Consistent Layout Structure**
   - Standardized header with title and icon
   - Unified action button placement
   - Responsive form containers

2. **Enhanced Validation Display**
   - Floating validation errors positioned at bottom center
   - Enhanced styling with larger text (`fontSize="md"`)
   - Proportional sizing (`minWidth="450px"`)

3. **Flexible Action Configuration**
   - Primary action (typically "Save Changes")
   - Multiple secondary actions (Cancel, etc.)
   - Menu-based destructive actions (Delete)

4. **Form Integration**
   - Automatic form submission handling
   - Loading state management
   - Validation error display

This architecture provides a solid foundation for scalable, maintainable React components while ensuring consistent user experience and optimal performance.

## Script Management Architecture

### ForwardRef Pattern for Mode Components

The script management system uses React's forwardRef pattern to expose imperative methods from child components to their parents, eliminating the need for useEffect-based callback patterns that could cause infinite loops.

#### Implementation Pattern
```typescript
// Component definition with forwardRef
export interface ViewModeRef {
    refetchElements: () => Promise<void>;
}

export const ViewMode = forwardRef<ViewModeRef, ViewModeProps>(({ scriptId, colorizeDepNames = false }, ref) => {
    const { elements, isLoading, error, refetchElements } = useScriptElements(scriptId);
    
    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
        refetchElements
    }), [refetchElements]);

    return (
        // Component JSX
    );
});

// Parent component usage
const ManageScriptPage: React.FC = () => {
    const viewModeRef = useRef<ViewModeRef>(null);
    const editModeRef = useRef<EditModeRef>(null);

    const handleElementCreated = async () => {
        // Call refetch on the active mode without useEffect dependency issues
        if (activeMode === 'view' && viewModeRef.current) {
            await viewModeRef.current.refetchElements();
        } else if (activeMode === 'edit' && editModeRef.current) {
            await editModeRef.current.refetchElements();
        }
    };

    return (
        <>
            {activeMode === 'view' && (
                <ViewMode ref={viewModeRef} scriptId={scriptId} />
            )}
            {activeMode === 'edit' && (
                <EditMode ref={editModeRef} scriptId={scriptId} />
            )}
        </>
    );
};
```

#### Benefits of ForwardRef Pattern
1. **Eliminates useEffect Dependencies**: No need to track changing callback functions
2. **Direct Method Access**: Parent can call child methods imperatively
3. **Prevents Infinite Loops**: Avoids re-render cycles from changing dependencies
4. **Performance Optimization**: Reduces unnecessary re-renders
5. **Type Safety**: Full TypeScript support for exposed methods

### Modal State Management System

The ManageScriptPage implements a sophisticated modal state management system using the `useModalState` hook to handle 13+ different modals in a centralized, type-safe manner.

#### Modal Naming Convention
```typescript
const MODAL_NAMES = {
    DELETE: 'delete',
    FINAL_DELETE: 'final-delete',
    DUPLICATE: 'duplicate',
    PROCESSING: 'processing',
    ADD_ELEMENT: 'add-element',
    EDIT_ELEMENT: 'edit-element',
    OPTIONS: 'options',
    DELETE_CUE: 'delete-cue',
    DUPLICATE_ELEMENT: 'duplicate-element',
    UNSAVED_CHANGES: 'unsaved-changes',
    FINAL_UNSAVED_CHANGES: 'final-unsaved-changes',
    CLEAR_HISTORY: 'clear-history',
    FINAL_CLEAR_HISTORY: 'final-clear-history',
    SAVE_CONFIRMATION: 'save-confirmation',
    SAVE_PROCESSING: 'save-processing'
} as const;
```

#### Centralized Modal State
```typescript
// Single hook manages all modal states
const modalState = useModalState(Object.values(MODAL_NAMES));

// Type-safe modal operations
modalState.openModal(MODAL_NAMES.DELETE);
modalState.closeModal(MODAL_NAMES.DELETE);
const isDeleteOpen = modalState.isOpen(MODAL_NAMES.DELETE);
```

#### Two-Tier Confirmation Pattern
```typescript
// Initial confirmation
const handleInitialDeleteConfirm = () => {
    modalState.closeModal(MODAL_NAMES.DELETE);
    modalState.openModal(MODAL_NAMES.FINAL_DELETE);
};

// Final confirmation with action
const handleFinalDeleteConfirm = async () => {
    await performDelete();
    modalState.closeModal(MODAL_NAMES.FINAL_DELETE);
};

// Cancel handler for both tiers
const handleDeleteCancel = () => {
    modalState.closeModal(MODAL_NAMES.DELETE);
    modalState.closeModal(MODAL_NAMES.FINAL_DELETE);
};
```

### Component Consolidation Architecture

#### ScriptModals Component
The ScriptModals component consolidates all script-related modals into a single, manageable component:

```typescript
interface ScriptModalsProps {
    modalState: ReturnType<typeof useModalState>;
    modalNames: typeof MODAL_NAMES;
    script?: any;
    scriptId: string;
    // ... many other props for different modal types
}

// Usage in ManageScriptPage
<ScriptModals
    modalState={modalState}
    modalNames={MODAL_NAMES}
    script={script}
    scriptId={scriptId}
    // Event handlers for all modal actions
    onDeleteCancel={handleDeleteCancel}
    onInitialDeleteConfirm={handleInitialDeleteConfirm}
    onFinalDeleteConfirm={handleFinalDeleteConfirm}
    // ... other handlers
/>
```

#### MobileScriptDrawer Component
Provides mobile-optimized toolbar access:

```typescript
<MobileScriptDrawer
    isOpen={isMenuOpen}
    onClose={onMenuClose}
    activeMode={activeMode}
    toolButtons={toolButtons}
    onModeChange={handleModeChange}
/>
```

### Performance Optimizations

#### Component Memoization
Mode components use custom comparison functions to prevent unnecessary re-renders:

```typescript
const areEqual = (prevProps: ViewModeProps, nextProps: ViewModeProps) => {
    return (
        prevProps.scriptId === nextProps.scriptId &&
        prevProps.colorizeDepNames === nextProps.colorizeDepNames &&
        prevProps.showClockTimes === nextProps.showClockTimes &&
        prevprops.elements === nextProps.elements &&
        prevProps.script === nextProps.script
        // Deliberately ignoring callback props for performance
    );
};

export const ViewMode = React.memo(ViewModeComponent, areEqual);
```

#### Scroll State Optimization
Efficient scroll state tracking with change detection:

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
        lastState.isAtBottom !== currentState.isAtBottom ||
        lastState.allElementsFitOnScreen !== currentState.allElementsFitOnScreen;
        
    if (stateChanged) {
        lastScrollStateRef.current = currentState;
        onScrollStateChange(currentState);
    }
};
```

### ManageScriptPage Refactoring Results

The ManageScriptPage underwent significant refactoring to improve maintainability and reduce complexity:

#### Code Reduction
- **Before**: ~1,500 lines in a single component
- **After**: ~1,350 lines with extracted components
- **Net Reduction**: ~150 lines (10% reduction)

#### Component Extraction
1. **ScriptModals**: Consolidated 13+ modal definitions
2. **MobileScriptDrawer**: Mobile-specific toolbar functionality
3. **Toolbar Configuration**: Extracted button logic to utilities
4. **Modal State Management**: Centralized with `useModalState`

#### Architectural Improvements
1. **Single Responsibility**: Each component has a focused purpose
2. **Reusability**: Extracted components can be used elsewhere
3. **Testability**: Smaller components are easier to test
4. **Maintainability**: Changes are localized to specific components

### Options Modal and Display Customization

The script management system includes an Options modal that allows users to customize the display of script elements.

#### Options Modal Implementation
```typescript
export const OptionsModal: React.FC<OptionsModalProps> = ({
    isOpen,
    onClose,
    colorizeDepNames,
    onColorizeDepNamesChange
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalContent>
                <ModalHeader>Script Display Options</ModalHeader>
                <ModalBody>
                    <VStack spacing={6} align="stretch">
                        <FormControl>
                            <HStack align="center">
                                <Checkbox
                                    isChecked={colorizeDepNames}
                                    onChange={(e) => onColorizeDepNamesChange(e.target.checked)}
                                />
                                <FormLabel>Colorize Department Names</FormLabel>
                            </HStack>
                        </FormControl>
                    </VStack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};
```

#### Department Colorization Feature
When enabled, the department colorization feature:
- Applies colored backgrounds to department name cells using `element.departmentColor`
- Changes text color to bold white for better contrast
- Implements conditional border logic to hide vertical separators for seamless colored backgrounds
- Maintains NOTE element styling (no colorization, always shows borders)

#### Conditional Border Logic
```typescript
// In CueElement.tsx - borders are conditionally shown based on colorization and element type
<Box
    borderRight={colorizeDepNames && (element as any).elementType !== 'NOTE' ? 'none' : '1px solid'}
    borderLeft={colorizeDepNames && (element as any).elementType !== 'NOTE' ? 'none' : '1px solid'}
    borderColor="gray.400"
>
    {/* Cell content */}
</Box>

// Department name cell with conditional styling
{colorizeDepNames && element.departmentColor && (element as any).elementType !== 'NOTE' ? (
    <Box
        bg={element.departmentColor}
        borderRadius="sm"
        width="100%"
        height="100%"
        mx="2px"
        my="2px"
        display="flex"
        alignItems="center"
        justifyContent="center"
    >
        <Text fontSize="sm" color="white" fontWeight="bold" isTruncated>
            {element.departmentName || ''}
        </Text>
    </Box>
) : (
    <Text fontSize="sm" color={textColor} textAlign="center" isTruncated fontWeight={fontWeight}>
        {(element as any).elementType === 'NOTE' ? '' : (element.departmentName || '')}
    </Text>
)}
```

### Visual Enhancements

#### Cue Element Styling
- **Height Reduction**: Reduced cue element height from 40px to 32px for more compact display
- **Consistent Borders**: Standardized all vertical separators to use `gray.400` color
- **Element Separation**: Added 1px margin bottom (`mb="1px"`) between elements instead of borders
- **Dynamic Cue IDs**: Auto-generated cue IDs follow pattern: `[DEPT]-[##]` (e.g., `FL-01`, `SM-03`)
- **Empty Cell Handling**: Uses non-breaking space (`\u00A0`) for empty cue IDs to maintain column structure

#### Header Alignment
The ScriptElementsHeader component uses manually adjusted column widths to align with content rows:
- Time column: 82px width
- Priority column: 122px width
- Consistent height (32px) and styling with content rows
- Sticky positioning for scroll persistence

### Database Schema Updates

#### TimeOffset Field Migration
Removed legacy `timeOffset` field in favor of `timeOffsetMs` for better precision:

```sql
-- Migration: 13fe35e29ccb_remove_timeoffset_legacy_field.py
def upgrade():
    with op.batch_alter_table('script_elements', schema=None) as batch_op:
        batch_op.drop_index('ix_script_elements_timeOffset')
        batch_op.drop_column('timeOffset')

def downgrade():
    with op.batch_alter_table('script_elements', schema=None) as batch_op:
        batch_op.add_column(sa.Column('timeOffset', sa.INTEGER(), nullable=True))
        batch_op.create_index('ix_script_elements_timeOffset', ['timeOffset'], unique=False)
```

#### Time Display Logic
```typescript
// Convert timeOffsetMs to MM:SS format
const timeValue = (element as any).timeOffsetMs || 0;
const totalSeconds = Math.round(timeValue / 1000);
const minutes = Math.floor(totalSeconds / 60);
const seconds = totalSeconds % 60;
return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
```

This architecture ensures maintainable, performant script management with customizable display options and consistent user experience across all modes.

## ManageScriptPage Refactoring (July 2025)

### Overview
The ManageScriptPage underwent a comprehensive refactoring to address code duplication, improve maintainability, and reduce component complexity. This refactoring eliminated ~350 lines of code while introducing reusable patterns for modal management, navigation, and component organization.

### Refactoring Objectives
The refactoring addressed several critical issues identified in the original 1,533-line component:
- **Modal State Management Duplication**: 11+ individual `useState` calls for modal states
- **Navigation Logic Duplication**: Repeated dashboard navigation patterns throughout the component
- **Component Size**: Massive component with mixed concerns (modals, toolbar, navigation, modes)
- **Complex Toolbar Configuration**: 150+ line `getToolButtons` function with nested conditionals
- **Mobile Drawer Complexity**: 152 lines of embedded drawer logic

### Architecture Improvements

#### 1. Modal State Management Hook
Created `useModalState` hook to centralize management of multiple modal states:

```typescript
// Before: Individual useState for each modal
const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
// ... 8+ more modal states

// After: Centralized modal state management
const modalState = useModalState(Object.values(MODAL_NAMES));

// Usage patterns
modalState.openModal(MODAL_NAMES.DUPLICATE);
modalState.closeModal(MODAL_NAMES.DELETE);
modalState.isOpen(MODAL_NAMES.PROCESSING);
```

**Hook Features**:
- Centralized state management for multiple modals
- Type-safe modal name constants
- Batch operations (close all modals)
- Data association for complex modals
- Performance optimized with useCallback and useMemo

#### 2. Dashboard Navigation Hook
Created `useDashboardNavigation` hook for consistent navigation patterns:

```typescript
// Before: Repeated navigation logic
const navigate = useNavigate();
const navigateToDashboard = (options) => {
  navigate('/dashboard', {
    state: {
      view: 'shows',
      selectedShowId: script?.showID,
      selectedScriptId: scriptId,
      returnFromManage: true
    }
  });
};

// After: Standardized navigation hook
const { navigateWithCurrentContext } = useDashboardNavigation();

// Usage
navigateWithCurrentContext(script, scriptId);
```

**Hook Benefits**:
- Eliminates duplicated navigation logic
- Consistent state management across navigation calls
- Reusable across multiple components
- Type-safe navigation options

#### 3. Component Extraction Pattern

##### ScriptModals Component
Consolidated all 11+ modal components into a single `ScriptModals` component:

```typescript
// Before: 11+ individual modal imports and JSX
<DuplicateScriptModal isOpen={isDuplicateModalOpen} />
<ProcessingModal isOpen={isProcessingModalOpen} />
<DeleteConfirmationModal isOpen={isDeleteModalOpen} />
// ... 8+ more modals (200+ lines)

// After: Single consolidated component
<ScriptModals
  modalState={modalState}
  modalNames={MODAL_NAMES}
  script={script}
  scriptId={scriptId}
  // ... other props
/>
```

**Component Features**:
- Centralized modal rendering logic
- Props-based configuration for all modals
- Reduced main component by ~200 lines
- Improved maintainability and testing

##### MobileScriptDrawer Component
Extracted mobile drawer logic into dedicated component:

```typescript
// Before: 152 lines of embedded drawer JSX
<Drawer isOpen={isMenuOpen} placement="right" onClose={onMenuClose}>
  <DrawerOverlay />
  <DrawerContent>
    {/* 150+ lines of complex button rendering logic */}
  </DrawerContent>
</Drawer>

// After: Clean component extraction
<MobileScriptDrawer
  isOpen={isMenuOpen}
  onClose={onMenuClose}
  activeMode={activeMode}
  toolButtons={toolButtons}
  onModeChange={handleModeChange}
/>
```

**Component Features**:
- Organized button groups (navigation, view states, tools)
- Logical separators and conditional rendering
- Reusable button rendering patterns
- Reduced main component by 152 lines

#### 4. Toolbar Configuration Utilities
Split complex toolbar configuration into organized utility functions:

```typescript
// Before: Single 150+ line function
const getToolButtons = (activeMode, scrollState, hasSelection, hasUnsavedChanges) => {
  const buttons = [];
  // ... 150+ lines of complex conditional logic
  return buttons;
};

// After: Organized utility functions
export const getToolbarButtons = (context: ToolbarContext): ToolButton[] => {
  const buttons = [];
  buttons.push(...getNavigationButtons(context.scrollState));
  buttons.push(...getViewStateButtons(context.activeMode));
  buttons.push(...getActionButtons(context.activeMode, context.hasUnsavedChanges));
  if (context.activeMode === 'edit') {
    buttons.push(...getElementManagementButtons(context.hasSelection));
  }
  return buttons;
};
```

**Utility Structure**:
- `getNavigationButtons()`: Jump to top/bottom functionality
- `getViewStateButtons()`: View, edit, info, history mode buttons
- `getActionButtons()`: Mode-specific actions (play, share, clear)
- `getElementManagementButtons()`: Edit mode element operations
- `groupToolbarButtons()`: Helper for button organization

### Implementation Results

#### Code Reduction Summary
- **ManageScriptPage.tsx**: 1,533 → 1,181 lines (352 lines reduced, ~23% reduction)
- **New Components Created**: 4 reusable components/hooks
- **Total New Code**: ~500 lines across new files
- **Net Impact**: Improved maintainability with modular, reusable architecture

#### Component Distribution
- **useModalState.ts**: 147 lines - Reusable modal state management
- **useDashboardNavigation.ts**: 95 lines - Consistent navigation patterns  
- **ScriptModals.tsx**: 207 lines - Consolidated modal components
- **MobileScriptDrawer.tsx**: 115 lines - Mobile interface component
- **toolbarConfig.ts**: 217 lines - Organized toolbar utilities

#### Performance Benefits
- **Reduced Bundle Size**: Eliminated duplicate code patterns
- **Improved Tree Shaking**: Modular exports enable better dead code elimination
- **Enhanced Memoization**: Smaller components enable more effective React.memo usage
- **Faster Development**: Reusable hooks reduce implementation time for similar patterns

### Development Patterns Established

#### Modal Management Pattern
```typescript
// Standard modal setup pattern
const MODAL_NAMES = {
  DUPLICATE: 'duplicate',
  DELETE: 'delete',
  PROCESSING: 'processing'
};

const modalState = useModalState(Object.values(MODAL_NAMES));

// Modal usage in JSX
<ScriptModals
  modalState={modalState}
  modalNames={MODAL_NAMES}
  // ... handler props
/>
```

#### Navigation Pattern
```typescript
// Standard navigation setup
const { navigateWithCurrentContext, navigateToDashboard } = useDashboardNavigation();

// Context-aware navigation
const handleExit = () => {
  navigateWithCurrentContext(script, scriptId);
};
```

#### Component Extraction Pattern
When extracting components from large pages:
1. **Identify Logical Boundaries**: Group related functionality (modals, navigation, drawers)
2. **Define Clear Interfaces**: Create TypeScript interfaces for all props
3. **Minimize Prop Drilling**: Use context or state management where appropriate
4. **Maintain Functionality**: Ensure all interactions work identically
5. **Add Documentation**: Document component purpose and usage patterns

### Testing Considerations

#### Unit Testing Approach
```typescript
// Test modal state management
describe('useModalState', () => {
  it('should manage multiple modal states', () => {
    const { result } = renderHook(() => useModalState(['modal1', 'modal2']));
    
    act(() => {
      result.current.openModal('modal1');
    });
    
    expect(result.current.isOpen('modal1')).toBe(true);
    expect(result.current.isOpen('modal2')).toBe(false);
  });
});

// Test component integration
describe('ScriptModals', () => {
  it('should render modals based on state', () => {
    const mockModalState = {
      isOpen: jest.fn().mockReturnValue(true),
      closeModal: jest.fn()
    };
    
    render(<ScriptModals modalState={mockModalState} modalNames={MODAL_NAMES} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
```

#### Integration Testing
- **Navigation Flow Testing**: Verify dashboard navigation maintains correct state
- **Modal Interaction Testing**: Ensure modal open/close cycles work correctly
- **Toolbar Configuration Testing**: Validate buttons appear correctly for each mode
- **Mobile Drawer Testing**: Confirm drawer interactions match toolbar functionality

### Scalability Benefits

#### Reusability
The refactored components can be reused across the application:
- **useModalState**: Any component needing multiple modals
- **useDashboardNavigation**: Any component navigating to dashboard
- **ScriptModals**: Pattern for consolidating related modals
- **Toolbar utilities**: Extensible for other toolbar implementations

#### Maintainability
- **Single Responsibility**: Each component/hook has a clear, focused purpose
- **Type Safety**: All interfaces are strongly typed with TypeScript
- **Documentation**: Components include comprehensive JSDoc comments
- **Testing**: Smaller components are easier to test individually

#### Performance
- **Code Splitting**: Extracted components can be lazy-loaded if needed
- **Memory Efficiency**: Reduced closure complexity in main component
- **Render Optimization**: Smaller components enable more granular re-rendering

This refactoring establishes patterns that can be applied to other large components in the codebase, providing a blueprint for improving maintainability while preserving functionality.