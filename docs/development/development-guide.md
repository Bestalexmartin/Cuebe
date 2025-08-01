# CallMaster Development Guide

## Quick Start for Developers

### Prerequisites

- Node.js 18+
- Python 3.9+
- PostgreSQL
- Redis (optional, for rate limiting)
- Git

### Setup

1. **Clone and install**:

```bash
git clone <repository>
cd CallMaster

# Frontend setup
cd frontend
npm install

# Backend setup
cd ../backend
pip install -r requirements.txt
```

2. **Environment configuration**:

```bash
# Copy environment files
cp .env.example .env
# Configure your database and API keys
```

3. **Database setup**:

```bash
# Run migrations
alembic upgrade head
```

4. **Start development servers**:

```bash
# Backend (port 8000)
cd backend
uvicorn main:app --reload

# Frontend (port 5173)
cd frontend
npm run dev
```

## Development Workflow

### Before Starting Work

1. **Run the test suite**: Navigate to `/test-tools` in the app
2. **Check component performance**: Use React DevTools Profiler
3. **Review relevant documentation** in `/docs`

### Adding New Features

#### For UI Components

1. **Extend base components** when possible
2. **Follow the established patterns** in `/docs/architecture/component-architecture.md`
3. **Add loading states** with appropriate skeleton variants
4. **Implement React.memo** for performance
5. **Add tests** using the testing tools

#### For API Endpoints

1. **Update backend schemas** in `schemas.py`
2. **Add route handlers** in appropriate router file
3. **Test with API testing tools** in the app
4. **Update frontend types** and hooks

### Code Quality Checklist

#### Before Committing

- [ ] Code builds successfully (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] All tests pass (use in-app testing tools)
- [ ] Performance check (React DevTools)
- [ ] Error boundaries tested
- [ ] Loading states implemented

#### Component Checklist

- [ ] Extends BaseCard or BaseModal if applicable
- [ ] Uses React.memo for optimization
- [ ] Implements proper TypeScript interfaces
- [ ] Includes loading and error states
- [ ] Follows established naming conventions
- [ ] Has appropriate skeleton variant
- [ ] Uses shared utilities from `/utils/` when applicable
- [ ] Imports shared constants instead of duplicating
- [ ] No debug console.log statements (use console.error for actual errors)

## Testing Strategy

### Use the Built-in Testing Tools

Navigate to `/test-tools` in the application for:

1. **Environment Testing**: Validate configuration and setup
2. **API Testing**: Test all endpoints and data flows
3. **Authentication Testing**: Verify login/logout and permissions
4. **Performance Testing**: Monitor render times and memory usage
5. **Database Testing**: Validate data integrity and connections
6. **Network Testing**: Test connectivity and error handling

### Manual Testing Checklist

- [ ] All CRUD operations work correctly
- [ ] Forms validate properly
- [ ] Loading states display correctly
- [ ] Error handling works gracefully
- [ ] Mobile responsiveness
- [ ] Accessibility (keyboard navigation, screen readers)

## Performance Guidelines

### React Best Practices

```tsx
// ✅ Good: Memoized component with stable refs
const MyComponent = React.memo(({ data, onUpdate }) => {
  const handleClick = useCallback(
    (id) => {
      onUpdate(id);
    },
    [onUpdate],
  );

  const processedData = useMemo(() => {
    return data.map((item) => ({ ...item, processed: true }));
  }, [data]);

  return <div>{/* component JSX */}</div>;
});

// ❌ Avoid: Inline functions and objects
const MyComponent = ({ data, onUpdate }) => {
  return (
    <div onClick={(id) => onUpdate(id)}>
      {data.map((item) => (
        <Item key={item.id} style={{ margin: 10 }} />
      ))}
    </div>
  );
};
```

### Component Performance

1. **Use BaseCard/BaseModal**: Leverage optimized base components
2. **Implement skeleton loading**: Prevent layout shifts
3. **Monitor bundle size**: Keep builds under 500KB when possible
4. **Use React DevTools**: Profile components regularly

## Code Quality & DRY Principles

### Shared Utilities Pattern

When you find yourself duplicating code, extract it to shared modules:

```typescript
// ✅ Good: Use shared utilities
import { getTextColorForBackground } from "../../../utils/colorUtils";
import { msToDurationString } from "../../../utils/timeUtils";
import { SCRIPT_STATUS_OPTIONS } from "../../script/constants";

// ❌ Avoid: Duplicating utility functions across components
const getTextColorForBackground = (hexColor: string) => {
  /* duplicate code */
};
```

### Established Shared Modules

- **Constants**: `frontend/src/pages/script/constants.ts`
- **Color Utils**: `frontend/src/utils/colorUtils.ts`
- **Time Utils**: `frontend/src/utils/timeUtils.ts`
- **Type Definitions**: `frontend/src/pages/script/types/tool-button.ts`

### Debug Code Standards

```typescript
// ✅ Good: Essential error logging only
try {
  await submitForm();
} catch (error) {
  console.error("Form submission failed:", error);
  showError("Unable to save changes");
}

// ❌ Avoid: Debug console.logs in production
console.log("=== FORM SUBMIT STARTED ===");
console.log("Form data:", formData);
console.log("Validation result:", isValid);
```

### Refactoring Checklist

Before duplicating code, check:

- [ ] Does a similar utility already exist in `/utils/`?
- [ ] Can this be parameterized instead of duplicated?
- [ ] Are constants already defined in a shared location?
- [ ] Is this debugging code that should be removed?

## Architecture Patterns

### Component Composition

```tsx
// Extend BaseCard for new entity types
return (
  <BaseCard
    title={entity.name}
    cardId={entity.id}
    isSelected={isSelected}
    isHovered={isHovered}
    onCardClick={() => onEntityClick(entity.id)}
    // Compose content areas
    quickInfo={<QuickInfoComponent data={entity} />}
    expandedContent={<DetailedView entity={entity} />}
    headerActions={actions}
    // Performance & UX
    isLoading={isLoading}
    skeletonVariant="entity"
  />
);
```

### Form Patterns

```tsx
// Use established validation patterns
const form = useValidatedForm<FormData>(initialState, {
  validationConfig: VALIDATION_CONFIG,
  validateOnBlur: true,
});

const { canSubmit } = useStandardFormValidation(form, ["requiredField"]);

return (
  <BaseModal
    title="Create Entity"
    isOpen={isOpen}
    onClose={onClose}
    onSubmit={handleSubmit}
    primaryAction={{
      label: "Create",
      variant: "primary",
      isLoading: form.isSubmitting,
      isDisabled: !canSubmit,
    }}
    validationErrors={form.fieldErrors}
  >
    <FormInput form={form} name="field" label="Field" isRequired />
  </BaseModal>
);
```

## Backend Development

### Python Type Checking

The project uses Pylance/Pyright for type checking with SQLAlchemy-specific configuration:

```json
// pyrightconfig.json
{
  "reportGeneralTypeIssues": false,
  "reportOptionalMemberAccess": false,
  "reportAttributeAccessIssue": false
}
```

### SQLAlchemy Best Practices

When working with SQLAlchemy models, use these patterns to avoid type checking issues:

```python
# ✅ Good: Use .is_() for boolean column comparisons
relationship = db.query(models.CrewRelationship).filter(
    models.CrewRelationship.isActive.is_(True)
).first()

# ✅ Good: Use setattr() for column assignments
setattr(user, 'isActive', True)
setattr(user, 'dateUpdated', datetime.now(timezone.utc))

# ✅ Good: Use bool() for conditional checks on comparisons
is_same_user = bool(crew_member.userID == user.userID)

# ✅ Good: Use explicit None checks for nullable columns
user_status = user.userStatus.value if user.userStatus is not None else "guest"

# ❌ Avoid: Direct boolean checks on columns
if user.isActive:  # This causes type errors

# ❌ Avoid: Direct column assignments
user.isActive = True  # This causes type errors
```

### Rate Limiting

The application includes optional rate limiting via Redis:

- Install Redis: `brew install redis` (macOS) or equivalent
- Redis configuration is handled automatically via `utils/rate_limiter.py`
- Rate limiting gracefully degrades if Redis is unavailable
- Different limits for webhooks, system tests, and API endpoints

## Common Issues & Solutions

### Performance Issues

- **Problem**: Components re-rendering unnecessarily
- **Solution**: Check React.memo implementation, use useCallback/useMemo

### Validation Issues

- **Problem**: Form validation not working
- **Solution**: Check validation config, ensure field names match

### Loading States

- **Problem**: Layout shifts during loading
- **Solution**: Implement proper skeleton variants

### API Issues

- **Problem**: API calls failing
- **Solution**: Use API testing tools to debug, check network tab

## Development Tools

### Built-in Tools (in application)

- **Testing Suite**: Comprehensive testing at `/test-tools`
- **API Documentation**: Interactive docs at `/api-docs`
- **Performance Monitor**: Built into testing tools

### External Tools

- **React DevTools**: Browser extension for debugging
- **Redux DevTools**: If using Redux (currently using local state)
- **VS Code Extensions**: ES7+ React snippets, TypeScript Hero

## File Organization

```
frontend/src/
├── components/
│   ├── base/           # BaseCard, BaseModal, shared components
│   ├── cards/          # Entity-specific card components
│   ├── modals/         # Entity-specific modal components
│   ├── views/          # Page-level view components
│   └── test-tools/     # Testing interface components
├── hooks/              # Custom React hooks
├── pages/              # Route-level page components
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Git Workflow

### Branch Naming

- `feature/component-name` - New features
- `fix/issue-description` - Bug fixes
- `refactor/area-name` - Code refactoring
- `docs/update-description` - Documentation updates

### Commit Messages

```
feat: add skeleton loading to BaseCard component
fix: resolve validation error in CreateShowModal
refactor: optimize card component performance
docs: update component architecture guide
test: add API endpoint tests for venues
```

### Before Push

1. Run full test suite
2. Check build passes
3. Verify no TypeScript errors
4. Test key user flows manually

## Getting Help

### Documentation

1. **Architecture**: `/docs/architecture/` - Component patterns and design
2. **Testing**: `/docs/testing/` - Testing tools and strategies
3. **Performance**: `/docs/architecture/performance-optimizations.md`
4. **Code Quality**: `/docs/development/code-quality-improvements-july-2025.md` - Recent DRY improvements and refactoring
5. **Archives**: `/docs/archive/` - Historical improvements and context

### Debugging

1. **Use Testing Tools**: Built-in testing suite covers most issues
2. **Check Error Boundaries**: Look for error context in console
3. **React DevTools**: Profile components and inspect props
4. **Network Tab**: Debug API calls and responses

### Code Examples

- Look at existing card/modal components for patterns
- Check base components for extension examples
- Review test tools for API integration examples

---

_Happy coding! 🚀_
