# User Preferences Bitmap System

**Date:** July 2025  
**Status:** Implemented  
**Category:** Data Architecture & User Preferences

## Overview

The User Preferences Bitmap System provides an efficient, scalable approach to storing and managing boolean user preferences. Instead of storing individual preference values in JSON objects, the system uses a single integer bitmap where each bit represents a specific boolean preference.

## Architecture Benefits

### Efficiency
- **Storage**: Single integer field instead of JSON object
- **Updates**: Bitwise operations are faster than JSON parsing/serialization
- **Network**: Smaller payload for preference updates
- **Database**: More efficient indexing and querying of preference combinations

### Scalability
- **Capacity**: Support for 32-64 boolean preferences in a single field
- **Growth**: Adding new preferences requires no schema changes
- **Maintainability**: Centralized preference definitions
- **Performance**: Constant-time preference lookups and updates

### Atomicity
- **Individual updates**: Flip single bits without affecting others
- **Consistency**: No partial state issues from JSON field modifications
- **Reliability**: Reduces SQLAlchemy JSON field synchronization problems

## System Design

### Preference Definition
```typescript
const USER_PREFERENCE_BITS = {
    colorizeDepNames: 0,    // bit position 0
    autoSortCues: 1,        // bit position 1  
    showClockTimes: 2,      // bit position 2
    darkMode: 3,            // bit position 3 (future)
    compactView: 4,         // bit position 4 (future)
    // ... up to 31 (or 63 on 64-bit systems)
} as const;
```

### Core Operations
```typescript
// Set bit value
const setBit = (bitmap: number, bit: number, value: boolean): number => 
    value ? bitmap | (1 << bit) : bitmap & ~(1 << bit);

// Get bit value  
const getBit = (bitmap: number, bit: number): boolean => 
    Boolean(bitmap & (1 << bit));

// Convert bitmap to preferences object
const bitmapToPreferences = (bitmap: number): UserPreferences => {
    return Object.fromEntries(
        Object.entries(USER_PREFERENCE_BITS).map(([key, bit]) => 
            [key, getBit(bitmap, bit)]
        )
    );
};

// Convert preferences object to bitmap
const preferencesToBitmap = (preferences: Partial<UserPreferences>): number => {
    let bitmap = 0;
    for (const [key, value] of Object.entries(preferences)) {
        if (key in USER_PREFERENCE_BITS && typeof value === 'boolean') {
            bitmap = setBit(bitmap, USER_PREFERENCE_BITS[key], value);
        }
    }
    return bitmap;
};
```

## API Design

### Backend Endpoints

**GET /api/users/preferences**
```json
Response: {
    "colorizeDepNames": true,
    "autoSortCues": false, 
    "showClockTimes": true
}
```

**PATCH /api/users/preferences**
```json
Request: {
    "colorizeDepNames": false,
    "showClockTimes": true
}

Response: {
    "colorizeDepNames": false,
    "autoSortCues": false,
    "showClockTimes": true
}
```

### Frontend Interface
```typescript
// Hook maintains same API for components
const { preferences, updatePreference, updatePreferences } = useUserPreferences();

// Individual preference update
await updatePreference('showClockTimes', true);

// Batch preference update  
await updatePreferences({
    colorizeDepNames: false,
    autoSortCues: true
});
```

## Database Schema

### Current Schema
```sql
-- Replace existing JSON field
ALTER TABLE userTable DROP COLUMN userOptions;
ALTER TABLE userTable ADD COLUMN userPreferencesBitmap INTEGER DEFAULT 0;
```

### Migration Strategy
```typescript
// Migration: Convert existing JSON preferences to bitmap
const convertJsonToBitmap = (jsonPreferences: any): number => {
    if (!jsonPreferences) return 0;
    
    let bitmap = 0;
    for (const [key, value] of Object.entries(jsonPreferences)) {
        if (key in USER_PREFERENCE_BITS && typeof value === 'boolean') {
            bitmap = setBit(bitmap, USER_PREFERENCE_BITS[key], value);
        }
    }
    return bitmap;
};
```

## Implementation Flow

### Preference Loading (Login)
1. **Database Query**: Retrieve `userPreferencesBitmap` integer
2. **Bitmap Parsing**: Convert bitmap to preferences object using bit positions
3. **State Setting**: Initialize frontend state with parsed preferences
4. **Fallback**: Use default preferences (bitmap = 0) for new users

### Preference Saving (Modal Close)
1. **Preference Collection**: Gather changed preferences from modal
2. **Bitmap Calculation**: Convert preference changes to bitmap updates
3. **Database Update**: Write updated bitmap to database
4. **State Sync**: Update frontend state with confirmed values

### Individual Updates
```typescript
// Frontend calls
await updatePreference('showClockTimes', true);

// Backend processes
const currentBitmap = user.userPreferencesBitmap || 0;
const bitPosition = USER_PREFERENCE_BITS.showClockTimes; // 2
const newBitmap = setBit(currentBitmap, bitPosition, true);
user.userPreferencesBitmap = newBitmap;
```

## Error Handling

### Invalid Preferences
- **Unknown keys**: Ignored silently, not applied to bitmap
- **Non-boolean values**: Rejected with validation error
- **Bit overflow**: Protected by bit position constants

### Database Failures
- **Rollback**: Bitmap updates are atomic transactions
- **Consistency**: Frontend state reverts on save failure
- **Recovery**: Preferences reload from database on error

## Testing Strategy

### Unit Tests
- Bitmap manipulation functions (setBit, getBit)
- Preference conversion utilities
- Validation logic

### Integration Tests  
- End-to-end preference save/load cycles
- Multi-user preference isolation
- Migration from JSON to bitmap format

### Performance Tests
- Bitmap operations vs JSON parsing benchmarks
- Database query performance comparisons
- Network payload size measurements

## Future Considerations

### Non-Boolean Preferences
For preferences that aren't boolean (strings, numbers, enums):
- **Separate field**: `userPreferencesJson` for complex preferences
- **Hybrid approach**: Bitmap for booleans, JSON for complex types
- **Type safety**: Separate interfaces for boolean vs complex preferences

### Preference Categories
```typescript
const PREFERENCE_CATEGORIES = {
    UI: [0, 15],      // bits 0-15 for UI preferences
    BEHAVIOR: [16, 31], // bits 16-31 for behavior preferences
};
```

### Preference Dependencies
```typescript
// Some preferences might depend on others
const PREFERENCE_DEPENDENCIES = {
    showClockTimes: ['autoSortCues'], // clock times requires auto-sort
};
```

### Audit Trail
Track preference changes:
```sql
CREATE TABLE user_preference_audit (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES userTable(userID),
    old_bitmap INTEGER,
    new_bitmap INTEGER, 
    changed_at TIMESTAMP DEFAULT NOW()
);
```

## Migration Path

1. **Phase 1**: Implement bitmap system alongside existing JSON system
2. **Phase 2**: Migrate existing user preferences to bitmap format  
3. **Phase 3**: Update all preference-consuming code to use new API
4. **Phase 4**: Remove deprecated JSON field and old endpoints
5. **Phase 5**: Performance monitoring and optimization

This approach ensures zero-downtime migration while providing immediate benefits for new preference additions.