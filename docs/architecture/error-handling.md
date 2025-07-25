# Enhanced Error Handling System

The CallMaster application now includes a comprehensive error handling system that provides better user experience, automatic retry capabilities, and robust error recovery mechanisms.

## Components Overview

### 1. Enhanced Toast Notifications (`/utils/toastUtils.ts`)

**Features:**
- Color-coded toast notifications by severity (success, error, warning, info)
- Automatic retry buttons for retryable errors
- Consistent styling across light/dark modes
- Actionable error messages

**Usage:**
```typescript
import { useEnhancedToast } from '../utils/toastUtils';

const { showSuccess, showError, showWarning, showInfo } = useEnhancedToast();

// Success notification
showSuccess('Success', 'Operation completed successfully');

// Error with retry capability
showError(apiError, {
  onRetry: retryFunction,
  retryLabel: 'Try Again'
});
```

### 2. Global Error Handler (`/utils/errorHandler.ts`)

**Features:**
- Automatic error categorization (network, auth, validation, server)
- Exponential backoff retry logic with jitter
- Network status detection
- Consistent error response format

**Usage:**
```typescript
import { useErrorHandler } from '../hooks/useErrorHandler';

const { executeWithRetry, handleError, isOnline } = useErrorHandler();

// Execute operation with automatic retry
const result = await executeWithRetry(
  () => fetch('/api/endpoint'),
  'fetch-operation',
  { retryConfig: { maxRetries: 3 } }
);
```

### 3. Error Boundaries (`/components/ErrorBoundary.tsx`)

**Features:**
- Component crash protection
- Graceful fallback UI
- Error logging and tracking
- Recovery mechanisms (retry/reload)
- Technical details for debugging

**Usage:**
```typescript
import { ErrorBoundary, SimpleErrorBoundary } from '../components/ErrorBoundary';

// Full error boundary with detailed fallback
<ErrorBoundary context="Dashboard" onError={handleError}>
  <DashboardComponent />
</ErrorBoundary>

// Simple error boundary for smaller components
<SimpleErrorBoundary context="Card Component">
  <CardComponent />
</SimpleErrorBoundary>
```

### 4. Form Validation System (`/hooks/useValidatedForm.ts`)

**Features:**
- Field-level validation with real-time feedback
- Backend validation error integration
- Customizable validation rules
- Touch state management
- Form submission with automatic error handling

**Usage:**
```typescript
import { useValidatedForm } from '../hooks/useValidatedForm';
import { ValidationRules } from '../types/validation';

const form = useValidatedForm(initialData, {
  validationConfig: {
    email: {
      required: true,
      rules: [ValidationRules.email()]
    },
    name: {
      required: true,
      rules: [ValidationRules.minLength(2)]
    }
  },
  validateOnBlur: true
});

// Use with form components
<FormInput
  form={form}
  name="email"
  label="Email Address"
  type="email"
  isRequired
/>
```

## Error Types and Severity Levels

### Severity Levels
- **error**: Critical issues requiring immediate attention (red)
- **warning**: Important issues that need user action (orange) 
- **info**: Informational messages (teal)
- **success**: Successful operations (blue)

### Error Categories
- **NETWORK_ERROR**: Connection issues, retryable
- **UNAUTHORIZED**: Authentication required, redirects to login
- **VALIDATION_ERROR**: Input validation failures, not retryable
- **SERVER_ERROR**: Backend issues, retryable
- **NOT_FOUND**: Resource not found, not retryable
- **FORBIDDEN**: Permission denied, not retryable

## Toast Color Scheme

### Light Mode
- **Success**: Blue (#6495ED)
- **Error**: Red (#E53E3E)
- **Warning**: Orange (#DD6B20)
- **Info**: Teal (#319795)

### Dark Mode
- Same colors with adjusted shadows and borders for dark theme compatibility

## Integration Examples

### 1. API Operations with Retry
```typescript
const { executeWithRetry } = useErrorHandler();

const fetchData = async () => {
  try {
    const data = await executeWithRetry(
      () => fetch('/api/data'),
      'fetch-data',
      { 
        context: 'Loading user data',
        retryConfig: { maxRetries: 3, baseDelay: 1000 }
      }
    );
    return data;
  } catch (error) {
    // Error already handled and displayed
    throw error;
  }
};
```

### 2. Form with Validation
```typescript
const form = useValidatedForm(initialData, {
  validationConfig: VALIDATION_CONFIG,
  validateOnBlur: true,
  showFieldErrorsInToast: true
});

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    await form.submitForm('/api/endpoint', 'POST', 'Created successfully!');
    onSuccess();
  } catch (error) {
    // Validation and server errors automatically handled
  }
};
```

### 3. Protected Component
```typescript
<ErrorBoundary context="User Profile" onError={logError}>
  <UserProfileComponent />
</ErrorBoundary>
```

## Migration Guide

### From Old Toast System
```typescript
// Old way
import { useToast } from '@chakra-ui/react';
const toast = useToast();
toast({ title: 'Error', description: message, status: 'error' });

// New way
import { useEnhancedToast } from '../utils/toastUtils';
const { showError } = useEnhancedToast();
showError(message);
```

### From useFormManager to useValidatedForm
```typescript
// Old way
const { formData, updateField, submitForm } = useFormManager(initialState);

// New way with validation
const form = useValidatedForm(initialState, {
  validationConfig: VALIDATION_CONFIG
});
// Use form.formData, form.updateField, form.submitForm
```

## Best Practices

1. **Always wrap major components in ErrorBoundaries**
2. **Use validation for all form inputs**
3. **Provide specific, actionable error messages**
4. **Implement retry logic for transient failures**
5. **Log errors for monitoring and debugging**
6. **Test error scenarios during development**

## Configuration

Error handling behavior can be customized through:
- Retry configuration (max retries, delays, exponential backoff)
- Validation rules and messages
- Toast notification settings
- Error boundary fallback components

This system provides a robust foundation for error handling that improves user experience while maintaining application stability.