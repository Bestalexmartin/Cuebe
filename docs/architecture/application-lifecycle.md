# Application Lifecycle & Data Loading

**Date:** January 2025  
**Status:** Implemented  
**Category:** Architecture Documentation

## Overview

This document outlines the Cuebe application's startup process, data loading sequences, and critical workflow processes including the script saving system. Understanding these processes is essential for performance optimization, debugging loading issues, and maintaining consistent user experience.

## Application Startup Process

### 1. Initial App Initialization

The application follows a structured startup sequence designed for optimal performance and user experience:

```
Browser Load → React/Vite → Clerk Auth → Route Resolution → Data Loading
```

#### Phase 1: Core Framework Initialization
- **React/Vite startup** → Loads `main.tsx`
- **Clerk Provider** → Initializes authentication system
- **App.tsx** → Routes are defined but components not yet rendered
- **ChakraProvider** → UI theme and component system initialization

#### Phase 2: Authentication & Route Resolution
- **Clerk authentication state** → Determines if user is signed in
- **Route Protection**: 
  - If **signed out** → Redirect to `/sign-in` (no data loading needed)
  - If **signed in** → Proceed to protected routes
- **Default navigation** → Redirects authenticated users to `/dashboard`

### 2. Primary Data Loading (Dashboard Initialization)

When DashboardPage mounts, the following data loads **simultaneously** for optimal performance:

#### Critical Data (Always Loaded)
1. **Shows Data** (`useShows` hook)
   - **API Endpoint**: `GET /api/me/shows`
   - **Includes**: Shows + associated scripts + venue information
   - **Why Critical**: Primary dashboard content, required for navigation
   - **Loading State**: Visible spinner in dashboard

2. **User Preferences** (`useUserPreferences` hook)  
   - **API Endpoint**: `GET /api/users/preferences`
   - **Includes**: UI preferences (dark mode, colorize departments, auto-sort, clock times)
   - **Fallback Strategy**: Uses localStorage or sensible defaults if API fails
   - **Loading State**: Silent background loading

#### Lazy-Loaded Data (On-Demand)
These load only when user navigates to specific dashboard sections:

3. **Venues Data** (`useVenues` hook)
   - **API Endpoint**: `GET /api/me/venues` 
   - **Trigger**: User clicks "Venues" tab
   - **Loading State**: Individual spinner in venues view

4. **Departments Data** (`useDepartments` hook)
   - **API Endpoint**: `GET /api/me/departments`
   - **Trigger**: User clicks "Departments" tab  
   - **Loading State**: Individual spinner in departments view

5. **Crew Data** (`useCrews` hook)
   - **API Endpoint**: `GET /api/me/crews`
   - **Trigger**: User clicks "Crew" tab
   - **Loading State**: Individual spinner in crew view

### 3. Data Loading Dependencies

The application uses a **progressive loading strategy** with clear dependency chains:

```
Authentication (Required)
    ↓
Shows Data (Critical - Primary UI)
    ↓
User Preferences (Enhances UI - Has Fallbacks)
    ↓
Secondary Data (Lazy-loaded - User-initiated)
```

#### Dependency Rules
- **Authentication must complete first** → Required for all API calls
- **Shows data is critical** → Primary dashboard content, affects navigation
- **User preferences affect UI rendering** → But has sensible defaults
- **Secondary data is optional** → Can load lazily without blocking user interaction

## Script Saving Process

The script saving system implements a **two-step confirmation workflow** designed to prevent accidental data loss while maintaining clear user intent.

### Saving Workflow Overview

```
User Action → Initial Confirmation → Final Confirmation → Processing → Success
```

### Phase 1: Initial Save Confirmation

**Modal**: `SaveConfirmationModal`
- **Trigger**: User clicks "Save Changes" button
- **Purpose**: Initial confirmation and change summary
- **Content**:
  - "Are you ready to save X pending changes?"
  - **Warning** (blue.400, bold): "This will permanently save your changes to the database and reset your edit history."
- **Actions**: 
  - **Continue** → Proceeds to final confirmation
  - **Cancel** → Returns to editing

### Phase 2: Final Save Confirmation

**Modal**: `FinalSaveConfirmationModal`
- **Style**: Blue.800 background with blue.400 border (serious/professional appearance)
- **Header**: "FINAL CONFIRMATION - Save Changes"
- **Content**:
  - **Main**: "X changes will be permanently saved to the database."
  - **Warning** (blue.200): "This will apply all pending changes and reset your edit history. This action cannot be undone!"
  - **Emphasis** (blue.300, bold): "THIS ACTION CANNOT BE UNDONE!"
- **Actions**:
  - **Save Changes** (blue.400 with orange.400 hover) → Executes save
  - **Cancel** → Returns to editing

### Phase 3: Save Processing

**Modal**: `SaveProcessingModal`
- **Purpose**: Shows progress during asynchronous save operation
- **Content**:
  - "Saving X changes to the database..."
  - "Please wait while your changes are being saved."
  - **Warning** (red.500): "Do not close this window or navigate away."
- **Features**:
  - Spinner animation
  - No close/cancel buttons (prevents interruption)
  - Blocks user interaction during save

### Phase 4: Save Execution & Completion

#### Backend Processing
1. **Info Mode Changes**: Captures any unsaved info form changes
2. **Edit Queue Operations**: Sends all pending operations to backend
3. **API Call**: `PATCH /api/scripts/{scriptId}/elements/batch-update`
4. **Database Transaction**: Applies all changes atomically
5. **Response Handling**: Processes success/error responses

#### Frontend Completion
1. **Clear Edit Queue**: Removes all pending operations
2. **Refresh Data**: Fetches updated script elements from server
3. **Mode Transition**: Automatically switches to **View mode**
4. **Success Notification**: Shows "Changes Saved" toast
5. **UI State Reset**: Clears any temporary editing state

### Error Handling in Save Process

#### Save Failure Scenarios
- **Network Issues**: Timeout or connection errors
- **Backend Validation**: Schema validation failures
- **Database Constraints**: Referential integrity violations
- **Authentication**: Token expiration during save

#### Error Recovery
1. **Close Processing Modal**: Removes blocking UI
2. **Show Error Toast**: Clear error message to user
3. **Preserve Edit Queue**: Changes remain available for retry
4. **Return to Edit Mode**: User can correct issues and retry
5. **Log Error Details**: For debugging and monitoring

## Performance Considerations

### Loading Optimization Strategy

1. **Parallel Loading**: Critical data loads simultaneously, not sequentially
2. **Progressive Enhancement**: UI shows with basic data, enhances as more loads
3. **Graceful Degradation**: Features work with fallback data when APIs fail
4. **Lazy Loading**: Non-critical data loads only when needed

### Why No Global Loading Modal

The current approach avoids a blocking "wait modal" for these reasons:

#### ✅ **Current Benefits**
- **Immediate Access**: Users see dashboard content within 1-2 seconds
- **Progressive Loading**: Individual loading states provide better feedback
- **Non-Blocking**: Users can interact with loaded content while other data loads
- **Graceful Failures**: Individual failures don't block entire application

#### ❌ **Global Loading Modal Issues**
- **Poor UX**: Blocks entire application for optional data
- **Unnecessary Delay**: Most data loads quickly enough for individual spinners
- **Complexity**: Would require orchestrating multiple async operations
- **User Expectations**: Modern apps expect immediate, progressive loading

### Performance Monitoring

#### Loading Time Targets
- **Authentication Check**: < 500ms
- **Shows Data**: < 2 seconds
- **User Preferences**: < 1 second (background)
- **Secondary Data**: < 3 seconds (user-initiated)

#### Error Rate Monitoring
- **Authentication Failures**: < 1%
- **Data Loading Failures**: < 5%
- **Save Operation Failures**: < 1%

## Implementation Details

### Key React Hooks

#### Data Loading Hooks
- `useShows()` - Primary dashboard data
- `useVenues()` - Venue management data
- `useDepartments()` - Department data
- `useCrews()` - Crew/team data
- `useUserPreferences()` - UI preference settings

#### Modal Management Hooks
- `useScriptModalHandlers()` - Save/abandon workflow logic
- `useModalState()` - Modal visibility state management
- `useElementModalActions()` - Element-specific modal operations

### State Management Patterns

#### Loading States
```typescript
interface LoadingState {
  isLoading: boolean;
  error: string | null;
  data: T[];
}
```

#### Save Process States
```typescript
interface SaveState {
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  pendingOperations: EditOperation[];
}
```

## Future Considerations

### Potential Optimizations

1. **Bundle Critical API Calls**: Combine shows + preferences into single request
2. **Implement Skeleton Loaders**: Replace spinners with skeleton UI for better perceived performance
3. **Add Offline Support**: Cache critical data for offline functionality
4. **Implement Service Worker**: Background data synchronization and caching

### Monitoring & Analytics

1. **Performance Metrics**: Track loading times and failure rates
2. **User Behavior**: Monitor which data is accessed most frequently
3. **Error Logging**: Centralized error reporting for debugging
4. **A/B Testing**: Test different loading strategies for optimization

---

## Related Documentation

- **[Performance Optimizations](./performance-optimizations.md)** - React render optimization strategies
- **[Component Architecture](./component-architecture.md)** - Modal and component patterns
- **[Edit Queue System](../data/edit-queue-system.md)** - Change tracking and undo/redo functionality
- **[Error Handling](./error-handling.md)** - Error boundaries and recovery strategies

---

_Last Updated: January 2025_  
_Status: Current implementation as of Cuebe v2.0_