# Time Handling Refactor Testing Checklist

**Date:** January 2025  
**Status:** Testing Required  
**Category:** Quality Assurance

## Overview

Comprehensive testing checklist to verify the time handling consolidation refactor works correctly across all contexts. Tests both military time preferences and ensures specification compliance.

---

## Prerequisites

### Test User Setup
- [ ] User with **Military Time OFF** (12-hour preference)
- [ ] User with **Military Time ON** (24-hour preference)
- [ ] Test script with elements at various times (negative, 0, positive, >12 hours)
- [ ] Test show with start/end times set

### Test Data Requirements
```
Script Elements for Testing:
- Pre-show: -00:30:00 (-30 minutes)
- Show start: 00:00:00
- Early cue: 00:05:30 (5 min 30 sec)
- Mid-show: 01:15:45 (1 hour 15 min 45 sec)
- Late show: 13:25:00 (13 hours 25 min - over 12 hours)
- Duration test: Element with 02:30:00 duration

Show Times for Testing:
- Start: 2025-01-21T19:30:00-0800 (7:30 PM PST)
- End: 2025-01-21T22:00:00-0800 (10:00 PM PST)
```

---

## Core Time Display Tests

### 1. Script Element Time Display (CueElement)

#### 12-Hour Mode Tests
- [ ] **Pre-show time**: `-0:30:00` (negative, no AM/PM)
- [ ] **Show start**: `0:00:00` (zero time)
- [ ] **Early cue**: `0:05:30` (under 1 hour)
- [ ] **Mid-show**: `1:15:45` (over 1 hour, under 12)
- [ ] **Late show**: `1:25:00` (hours > 12 wrap to 1-11 range, no AM/PM)

#### 24-Hour Mode Tests  
- [ ] **Pre-show time**: `-0:30:00` (negative, no change)
- [ ] **Show start**: `0:00:00` (zero time)
- [ ] **Early cue**: `0:05:30` (under 1 hour)
- [ ] **Mid-show**: `1:15:45` (over 1 hour, under 12)
- [ ] **Late show**: `13:25:00` (hours > 12 stay as-is)

### 2. Clock Time Display (formatAbsoluteTime)

When "Show Clock Times" option is enabled:

#### 12-Hour Mode Tests
- [ ] **Pre-show**: `7:00:00` (calculated from 7:30 PM - 30 min, no AM/PM)
- [ ] **Show start**: `7:30:00` (matches show start time, no AM/PM)
- [ ] **Mid-show**: `8:45:45` (7:30 PM + 1:15:45, no AM/PM)

#### 24-Hour Mode Tests
- [ ] **Pre-show**: `19:00:00` (19:30 - 30 min)
- [ ] **Show start**: `19:30:00` (matches show start time)  
- [ ] **Mid-show**: `20:45:45` (19:30 + 1:15:45)

### 3. User Preference Toggle

- [ ] **Switch to Military Time ON**: All script times update immediately
- [ ] **Switch to Military Time OFF**: All script times revert immediately
- [ ] **Page refresh preserves preference**: Reload page, verify setting maintained
- [ ] **Cross-tab consistency**: Change in one tab affects other tabs

---

## Standard Time Display Tests

### 4. Show Card Time Display

#### 12-Hour Mode Tests
- [ ] **Show start time**: `7:30 PM` (with AM/PM)
- [ ] **Show end time**: `10:00 PM` (with AM/PM)

#### 24-Hour Mode Tests  
- [ ] **Show start time**: `19:30` (HH:MM format, no AM/PM)
- [ ] **Show end time**: `22:00` (HH:MM format, no AM/PM)

### 5. Script Card Time Display

#### 12-Hour Mode Tests
- [ ] **Script start**: `7:30 PM` (with AM/PM)
- [ ] **Script end**: `10:00 PM` (with AM/PM)

#### 24-Hour Mode Tests
- [ ] **Script start**: `19:30` (no AM/PM)
- [ ] **Script end**: `22:00` (no AM/PM)

---

## Modal and Input Tests

### 6. Edit Element Modal

#### Time Input Parsing
- [ ] **HH:MM:SS format**: `1:30:45` → 5445000 ms
- [ ] **MM:SS format**: `30:45` → 1845000 ms  
- [ ] **SS format**: `45` → 45000 ms
- [ ] **Negative times**: `-1:30:00` → -5400000 ms
- [ ] **Import formats**: `1.5m` → 90000 ms, `90s` → 90000 ms
- [ ] **Invalid input**: Shows error message

#### Time Display in Modal
- [ ] **12-hour mode**: Shows times without AM/PM
- [ ] **24-hour mode**: Shows times in 24-hour format
- [ ] **Duration display**: Respects military time preference

### 7. Edit Group Modal

#### Time Input/Display  
- [ ] **Group time input**: Accepts all supported formats
- [ ] **Time display**: Matches military time preference
- [ ] **Invalid time handling**: Shows appropriate error

### 8. Create/Edit Show Modal

#### DateTime Input Fields
- [ ] **Show date/time input**: Uses datetime-local format
- [ ] **UTC conversion**: Properly converts local input to UTC for storage
- [ ] **Display conversion**: Shows stored UTC times in local timezone

---

## Import/Export Tests

### 9. CSV Import

#### Time Parsing
- [ ] **Standard formats**: `1:30:45`, `90:30`, `45` all parse correctly
- [ ] **Decimal minutes**: `1.5m` converts to 90000 ms
- [ ] **Seconds notation**: `90s` converts to 90000 ms  
- [ ] **Invalid times**: Show warnings but don't fail import
- [ ] **Negative times**: `-0:30:00` parses correctly

#### Import Preview
- [ ] **Time display**: Shows parsed times in user's preferred format
- [ ] **Format consistency**: All times use same format in preview

### 10. CSV Export

#### Time Formatting
- [ ] **Export format**: Uses H:MM:SS format (specification compliant)
- [ ] **Negative times**: Properly formatted with minus sign
- [ ] **Duration export**: Exports duration_ms field correctly

---

## Edit History Tests

### 11. Edit Queue Formatter

#### Time Change Operations
- [ ] **Offset changes**: `Updated "Cue 1" time from 1:30:00 to 2:15:30`
- [ ] **Military time preference**: History respects current user preference
- [ ] **Group time changes**: Shows delta with proper formatting
- [ ] **Script info changes**: Start/end times formatted correctly

#### Timestamp Display  
- [ ] **Today**: Shows time only in preferred format
- [ ] **Yesterday**: Shows "Yesterday HH:MM" or "Yesterday h:mm a"
- [ ] **Other dates**: Shows "Mon DD" with time in preferred format

---

## Integration Tests

### 12. Cross-Component Consistency

#### Time Preference Changes
- [ ] **Script elements**: All update simultaneously
- [ ] **Show cards**: All update simultaneously  
- [ ] **Edit history**: All timestamps update format
- [ ] **Modal displays**: All respect new preference immediately

#### Page Navigation
- [ ] **ManageScriptPage**: All time displays consistent
- [ ] **ShowListPage**: All show times use correct format
- [ ] **EditShowPage**: DateTime inputs work correctly
- [ ] **SharedScriptPage**: Public view respects default formatting

### 13. Real-Time Features

#### Live Clock Updates
- [ ] **Current time offset**: Updates correctly during script playback
- [ ] **Clock time display**: Shows current time in preferred format
- [ ] **Performance**: No lag when switching time preferences

---

## Edge Case Tests  

### 14. Boundary Conditions

#### Time Values
- [ ] **Zero time**: `0:00:00` displays correctly
- [ ] **Exactly 12 hours**: 12:00:00 in both modes
- [ ] **24+ hours**: Very long shows (25:30:00) handle correctly
- [ ] **Microsecond precision**: Fractional seconds handled properly

#### User Preferences
- [ ] **Default state**: New users get 12-hour format by default
- [ ] **Preference persistence**: Survives browser refresh/restart
- [ ] **Invalid preference**: Gracefully falls back to default

### 15. Error Handling

#### Invalid Data
- [ ] **Null times**: Display "Not set" or appropriate placeholder
- [ ] **Invalid ISO strings**: Don't crash, show error state
- [ ] **Malformed durations**: Handle gracefully in displays
- [ ] **Network errors**: Don't affect time preference changes

#### Recovery Scenarios  
- [ ] **API failures**: Time displays still work with cached data
- [ ] **Timezone changes**: System adapts to user's current timezone
- [ ] **Date rollover**: Timestamps update correctly across midnight

---

## Performance Tests

### 16. Rendering Performance

#### Large Lists
- [ ] **100+ script elements**: Time formatting doesn't cause lag
- [ ] **Rapid preference switching**: UI responds quickly
- [ ] **Memory usage**: No memory leaks with repeated format changes

#### Bundle Analysis
- [ ] **Build success**: No circular dependencies or import errors
- [ ] **Bundle size**: Verify reduction from eliminating duplicates
- [ ] **Module loading**: Time utilities load efficiently

---

## Cross-Browser Tests

### 17. Browser Compatibility

#### Time Display
- [ ] **Chrome**: All formats render correctly
- [ ] **Firefox**: All formats render correctly  
- [ ] **Safari**: All formats render correctly
- [ ] **Mobile browsers**: Touch interactions work with time inputs

#### DateTime Inputs
- [ ] **datetime-local support**: Works on all target browsers
- [ ] **Timezone handling**: Consistent across browsers
- [ ] **Input validation**: Browser validation works correctly

---

## Specification Compliance Verification

### 18. Final Specification Check

#### Script Element Context
- [ ] ✅ **Format**: Always `H:MM:SS` (no AM/PM, no leading zero on hours)
- [ ] ✅ **Military ON**: 0:00:00 to 23:59:59
- [ ] ✅ **Military OFF**: 1:00:00 to 11:59:59 (12-hour wrap, no AM/PM)

#### Standard Time Context  
- [ ] ✅ **Military ON**: `HH:MM` (leading zeros, 24-hour)
- [ ] ✅ **Military OFF**: `h:mm a` (12-hour with AM/PM)

#### Database Storage
- [ ] ✅ **Offsets**: Stored as milliseconds (integer)
- [ ] ✅ **Absolute times**: ISO 8601 with timezone
- [ ] ✅ **Conversion accuracy**: No data loss in round-trip conversions

---

## Sign-Off Checklist

### Completion Verification
- [ ] **All core functionality tested** in both 12-hour and 24-hour modes
- [ ] **Edge cases handled** gracefully without crashes
- [ ] **Performance acceptable** with large datasets  
- [ ] **Cross-browser compatibility** verified
- [ ] **Specification compliance** 100% verified
- [ ] **No regression bugs** in existing functionality
- [ ] **Documentation updated** to reflect any testing discoveries

### Final Validation
- [ ] **Production build tested** (not just development)
- [ ] **Multiple user roles tested** (different permission levels)
- [ ] **Network conditions tested** (slow connections, offline scenarios)
- [ ] **Accessibility verified** (screen readers can announce times correctly)

---

*Created: January 2025*  
*Context: Post-refactor testing validation for time handling consolidation*  
*Usage: Complete this checklist before considering the refactor ready for production*