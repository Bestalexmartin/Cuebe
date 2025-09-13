# TIMER SYNCHRONIZATION FIX PLAN

## CURRENT PROBLEM
- Show timer and wall clock are out of sync by ~0.5 seconds
- Three separate timing loops calling Date.now() independently:
  1. ShowTimeEngine (100ms) - calls Date.now() once per cycle ✅
  2. ClockTimingProvider on auth side (1000ms) - independent Date.now() ❌
  3. SubscriberClockProvider on scoped side (1000ms) - independent Date.now() ❌

## WHAT EXISTS (Infrastructure Ready)
- ShowTimeEngine calls Date.now() once per cycle every 100ms
- currentTimestamp is available in both ShowTimeEngineProvider and SharedShowTimeEngineProvider contexts
- onTimestampUpdate callback distributes the synchronized timestamp

## WHAT NEEDS TO BE DONE (Exact Steps)

### Step 1: Remove Independent Clock Provider on Auth Side
File: `/Users/alex/Projects/Cuebe/frontend/src/features/script/components/PlaybackOverlay.tsx`
- Remove ClockTimingContext, ClockTimingProvider
- Remove the setInterval that calls Date.now() every 1000ms
- Make wall clock components use currentTimestamp from ShowTimeEngineProvider

### Step 2: Remove Independent Clock Provider on Scoped Side  
File: `/Users/alex/Projects/Cuebe/frontend/src/shared/components/SubscriberPlaybackOverlay.tsx`
- Remove SubscriberClockContext, SubscriberClockProvider
- Remove the setInterval that calls Date.now() every 1000ms
- Make wall clock components use currentTimestamp from SharedShowTimeEngineProvider

### Step 3: Verify Single Timing Loop
- Only ShowTimeEngine should call Date.now()
- All time displays should use currentTimestamp from contexts
- No independent setInterval calls for timing

## SUCCESS CRITERIA
- Wall clock and show timer tick over at exactly the same moment
- Only one Date.now() call per 100ms cycle
- No timing drift between displays

## IMPLEMENTATION CHECKLIST
- [ ] Step 1: Fix auth side clock provider
- [ ] Step 2: Fix scoped side clock provider  
- [ ] Step 3: Verify no independent Date.now() calls remain
- [ ] Step 4: Test synchronization manually
- [ ] Step 5: Review implementation three times
- [ ] Step 6: ONLY THEN tell user to test