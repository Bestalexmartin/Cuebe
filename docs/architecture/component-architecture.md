# Component Architecture Guide

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
Two primary base components provide the foundation:
- **BaseCard**: For displaying entity information (shows, venues, crew, etc.)
- **BaseModal**: For forms and user interactions

### 3. Consistent Patterns
All components follow established patterns for:
- Props interfaces
- Event handling
- State management
- Error boundaries
- Loading states

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