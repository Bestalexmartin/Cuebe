# Time Handling Specification

**Date:** January 2025  
**Status:** Current - Implementation Required  
**Category:** Architecture & Data Standards

## Overview

Time is a core feature of Cuebe's theater production management system. This specification defines the canonical approach to time storage, conversion, and display throughout the application to ensure absolute consistency across all components.

## Core Requirements

### Database Storage Standards
All time data must be stored in these exact formats:

- **Time offsets/durations**: `milliseconds` (integer)
- **Start/End times**: `ISO 8601` with timezone offset (e.g., "2025-01-21T14:30:45.123-0700")

**No exceptions** - all time data going to and coming from the database must conform to these formats.

### UI Display Requirements

Time display follows two distinct patterns based on context:

#### Script Elements (offsets/durations)
**Format**: `H:MM:SS` (no AM/PM, no leading zero on hours)
- **Military time ON**: 24-hour format (0:00:00 to 23:59:59)  
- **Military time OFF**: 12-hour format (1:00:00 to 11:59:59, wrapping after 12)
- **Never show AM/PM** for script elements

#### All Other Time Displays (absolute times)
**Format**: Based on military time preference
- **Military time ON**: `HH:MM` (24-hour, leading zeros: 00:00 to 23:59)
- **Military time OFF**: `h:mm a` (12-hour with AM/PM: 1:00 AM to 11:59 PM)

## Implementation Architecture

### Consolidation Requirements

All time conversion and formatting must be consolidated into **as few components as possible** and applied **EVERYWHERE** consistently. No duplicate time handling logic is permitted.

### Central Utility Functions

#### Required Functions

**For Script Elements**:
```typescript
formatTimeOffset(timeOffsetMs: number, useMilitaryTime: boolean): string
// Examples:
// formatTimeOffset(3661000, false) → "1:01:01"
// formatTimeOffset(3661000, true) → "1:01:01"  
// formatTimeOffset(86461000, false) → "11:01:01" (wraps after 12)
// formatTimeOffset(86461000, true) → "24:01:01"
```

**For Absolute Times**:
```typescript
formatAbsoluteTime(isoDateTime: string, useMilitaryTime: boolean): string
// Examples:
// formatAbsoluteTime("2025-01-21T14:30:00-0700", false) → "2:30 PM"
// formatAbsoluteTime("2025-01-21T14:30:00-0700", true) → "14:30"
```

**For Database Conversion**:
```typescript
parseTimeToMs(timeString: string): number
// Parse various input formats to milliseconds

convertLocalToUTC(localDateTime: string | Date): string  
// Convert local input to ISO 8601 UTC for database storage

convertUTCToLocal(utcDateTime: string): string
// Convert database ISO 8601 to local datetime-local input format
```

### User Preference Integration

All time display functions must respect the `use_military_time` user preference from the bitmap system:

```typescript
// From backend/utils/user_preferences.py
USER_PREFERENCE_BITS = {
    'use_military_time': 4,  // bit position 4 (0=12hr, 1=24hr)
}
```

Frontend components must:
1. Read user preferences via `useUserPreferences()` hook
2. Pass military time preference to all time formatting functions
3. Never hardcode format preferences

## Current Issues to Resolve

### Inconsistencies Found

1. **Mixed 12-hour format behavior**:
   - Script times: No AM/PM, hours >12 converted to 1-12 range  
   - Absolute datetime: Shows AM/PM indicators
   - Mixed hour display: Sometimes 1-digit (1:00), sometimes 2-digit (01:00)

2. **Duplicate/overlapping functions**:
   - Multiple time parsing functions with different behaviors
   - `formatTimeOffset` vs `formatTimeLocal` handle 12/24-hour differently
   - Import system has separate time conversion logic

3. **Hardcoded format assumptions**:
   - Edit queue formatter hardcodes 12-hour format
   - Multiple locations ignore user preferences
   - Some components bypass central utilities

4. **Backend datetime parsing duplication**:
   - Duplicated `datetime.fromisoformat()` with Z-replacement pattern
   - Same parsing logic in `operations.py` and `script_elements.py`

### Files Requiring Updates

#### Frontend Files:
- `/src/utils/timeUtils.ts` - Primary time utility functions
- `/src/utils/dateTimeUtils.ts` - Absolute datetime utilities  
- `/src/features/script/import/utils/timeConverter.ts` - Import time conversion
- `/src/features/script/utils/editQueueFormatter.ts` - Edit history formatting
- `/src/features/script/components/CueElement.tsx` - Time display
- `/src/features/script/components/modals/EditElementModal.tsx` - Time input
- All components currently using hardcoded time formatting

#### Backend Files:
- `/backend/routers/script_elements/operations.py` - Lines 700, 707
- `/backend/routers/script_elements.py` - Lines 223, 230  
- Any other files using `datetime.fromisoformat()` with manual Z handling

## Implementation Plan

### Phase 1: Consolidate Core Functions
1. Create unified time utility functions following specifications
2. Update all existing functions to match canonical behavior  
3. Remove duplicate implementations
4. Ensure user preference integration

### Phase 2: Update All Usage Points
1. Replace all hardcoded time formatting with central utilities
2. Add military time preference parameter to all time displays
3. Verify script elements use `H:MM:SS` format without AM/PM
4. Verify absolute times use appropriate `HH:MM` or `h:mm a` format

### Phase 3: Backend Consolidation  
1. Create central datetime parsing utility
2. Replace duplicate `fromisoformat()` implementations
3. Ensure consistent ISO 8601 handling

### Phase 4: Comprehensive Testing
1. Test all time display scenarios with both military time settings
2. Verify script element chronological sorting
3. Verify database round-trip conversion accuracy
4. Test edge cases (negative offsets, timezone changes, etc.)

## Success Criteria

### Functional Requirements
- ✅ All script times display as `H:MM:SS` without AM/PM
- ✅ All absolute times respect military time preference  
- ✅ All time data converts accurately between database and UI formats
- ✅ User preference changes update all time displays immediately
- ✅ No hardcoded time format logic anywhere in codebase

### Code Quality Requirements  
- ✅ Single source of truth for each time formatting pattern
- ✅ No duplicate time conversion logic
- ✅ All time functions accept military time preference parameter
- ✅ Clear separation between script time vs absolute time formatting
- ✅ Comprehensive TypeScript typing for all time functions

### User Experience Requirements
- ✅ Consistent time display format across entire application
- ✅ Intuitive 12-hour vs 24-hour behavior matching user preference
- ✅ Natural chronological sorting in all contexts
- ✅ Accurate time calculations for pre-show, show, and post-show timing

## Quality Assurance

This specification follows Cuebe's architectural principles:

- **Mathematical Domain Modeling**: Time stored as milliseconds preserves full mathematical properties
- **Semantic Data Modeling**: Database formats match industry standards (ISO 8601)  
- **Separation of Concerns**: Clear distinction between storage, calculation, and display
- **User-Centered Design**: Respects user preferences and natural mental models
- **Future-Proof Design**: Extensible to additional time formats or timezone support

## Related Documentation

- **[Architectural Principles](./architectural-principles.md)** - Foundation design principles
- **[Script Elements Data Model](../data/script-elements-data-model.md)** - Time offset field specifications  
- **[User Preferences Bitmap System](../data/user-preferences-bitmap-system.md)** - Military time preference implementation

---

*Created: January 2025*  
*Context: Centralized time handling specification for consistent implementation*  
*Priority: Critical - Time is a core feature requiring absolute consistency*