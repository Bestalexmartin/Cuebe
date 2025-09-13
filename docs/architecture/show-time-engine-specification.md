# Show Time Engine Specification

**Version**: 1.0  
**Date**: 2025-01-12  
**Status**: Implementation Plan  

## Problem Statement

The current timing system has fundamental flaws that cause desynchronization between auth and scoped sides during pause/resume cycles:

1. **Mixed Time Domains**: Auth side uses wall clock calculations while modifying element offset data
2. **Data Mutation**: Element `offset_ms` values are modified to handle timing adjustments
3. **Complex State Tracking**: Multiple timing-related state variables (`cumulativeDelayMs`, `lastPauseDurationMs`, etc.)
4. **Synchronization Issues**: Different timing calculation approaches between auth and scoped sides

## Solution: Unified Show Time Engine

Replace all timing logic with a **Show Time Engine** that provides pause-aware show time as a computed value without modifying element data.

## Core Principles

1. **Single Source of Truth**: One authoritative show time that accounts for all pauses
2. **Immutable Element Data**: Never modify original `offset_ms` values - they represent the show's design
3. **Computed Display**: Calculate when elements should trigger and display times based on current show time
4. **Identical Implementation**: Both auth and scoped sides implement the same specification
5. **State-Based Synchronization**: WebSocket sync sends state transitions, not timing data

## ShowTimeEngine Interface Specification

```typescript
interface ShowTimeEngine {
    // Core State
    readonly playbackState: PlaybackState;
    readonly showStartedAt: number | null;      // Wall clock when show began (ms)
    readonly pausedAt: number | null;           // Wall clock when current pause started (ms)
    readonly totalPauseTime: number;            // Cumulative pause duration (ms)
    
    // Computed Properties
    getCurrentShowTime(): number;               // Current show time accounting for pauses (ms)
    isPlaying(): boolean;
    isPaused(): boolean;
    isStopped(): boolean;
    isSafety(): boolean;
    isComplete(): boolean;
    
    // State Transitions
    start(): void;                              // Begin or resume playback
    pause(): void;                              // Pause playback
    safety(): void;                             // Safety stop (pause variant)
    complete(): void;                           // Mark show as complete
    stop(): void;                               // Stop playback entirely
    
    // Event Handlers
    onStateChange(callback: (state: PlaybackState) => void): void;
    onShowTimeUpdate(callback: (showTime: number) => void): void;
}

type PlaybackState = 'STOPPED' | 'PLAYING' | 'PAUSED' | 'SAFETY' | 'COMPLETE';
```

## Core Algorithm

### Show Time Calculation

```typescript
getCurrentShowTime(): number {
    if (!this.showStartedAt) return 0;
    
    const wallClockElapsed = Date.now() - this.showStartedAt;
    const showTimeElapsed = wallClockElapsed - this.totalPauseTime;
    
    // If currently paused, don't include current pause duration
    if (this.pausedAt) {
        const currentPauseDuration = Date.now() - this.pausedAt;
        return Math.max(0, showTimeElapsed - currentPauseDuration);
    }
    
    return Math.max(0, showTimeElapsed);
}
```

### State Transition Logic

```typescript
start(): void {
    if (this.playbackState === 'STOPPED') {
        // Fresh start
        this.showStartedAt = Date.now();
        this.totalPauseTime = 0;
        this.pausedAt = null;
    } else if (this.pausedAt) {
        // Resume from pause
        this.totalPauseTime += (Date.now() - this.pausedAt);
        this.pausedAt = null;
    }
    this.playbackState = 'PLAYING';
}

pause(): void {
    if (this.playbackState === 'PLAYING') {
        this.pausedAt = Date.now();
        this.playbackState = 'PAUSED';
    }
}

safety(): void {
    if (this.playbackState === 'PLAYING') {
        this.pausedAt = Date.now();
        this.playbackState = 'SAFETY';
    }
}
```

## UI Integration

### Element Display Times

```typescript
function getElementDisplayTime(
    element: ScriptElement, 
    script: Script, 
    showTimeEngine: ShowTimeEngine
): Date {
    const scriptStartTime = new Date(script.start_time);
    const elementShowTime = element.offset_ms; // Original, immutable design time
    
    // Compute when this element will actually trigger in real world
    const realWorldTriggerTime = scriptStartTime.getTime() + 
                                elementShowTime + 
                                showTimeEngine.totalPauseTime;
    
    return new Date(realWorldTriggerTime);
}
```

### Element State Calculation

```typescript
function getElementState(
    element: ScriptElement, 
    currentShowTime: number,
    lookaheadMs: number = 30000
): ElementState {
    const triggerTime = element.offset_ms;
    
    if (currentShowTime < triggerTime - lookaheadMs) return 'inactive';
    if (currentShowTime < triggerTime) return 'upcoming';  
    if (currentShowTime < triggerTime + 5000) return 'current'; // 5s active duration
    return 'past';
}

type ElementState = 'inactive' | 'upcoming' | 'current' | 'past';
```

### Show Timer Display

```typescript
function formatShowTimer(showTimeEngine: ShowTimeEngine, script: Script): string {
    const currentShowTime = showTimeEngine.getCurrentShowTime();
    const scriptStartTime = new Date(script.start_time);
    const timeDiff = currentShowTime; // Show time in ms since start
    
    // Format as time offset (can be negative for countdown, positive for countup)
    const totalSeconds = Math.floor(Math.abs(timeDiff) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return timeDiff < 0 ? `–${timeStr}` : timeStr;
}
```

## Expected Behavior

### Pre-Show (T-minus counting)
- Show time: Negative values (e.g., -1800000 for 30 minutes before)
- Elements: All display original scheduled times
- Timer display: "–00:30:00"

### During Show (Countup)
- Show time: Positive values from 0 upward
- Elements: Active/upcoming states based on show time vs offset_ms
- Timer display: "01:15:30"

### Pause Sequence
1. User clicks pause → `showTimeEngine.pause()`
2. Show time freezes at current value
3. Timer display freezes (no visual change during pause)
4. Element display times remain unchanged during pause
5. Pause indicator shows "PAUSED" status

### Resume Sequence
1. User clicks resume → `showTimeEngine.start()`
2. Show time continues from frozen value
3. Element display times recalculate (showing new real-world times)
4. Timer display continues from where it left off
5. Normal playback resumes

### Example Timeline
```
Wall Clock: 7:00 PM → 7:10 PM → 7:15 PM → 7:25 PM
Show Time:     0    →   10min →  10min  →  20min
Action:      START  →  PAUSE   → RESUME  →   ...

Element at offset_ms: 900000 (15 minutes)
- Before pause: "Lights Down - 7:15 PM"
- During pause: "Lights Down - 7:15 PM" (unchanged)  
- After resume: "Lights Down - 7:20 PM" (updated on resume)
```

## WebSocket Synchronization

### Commands Sent
```typescript
interface PlaybackCommand {
    command: 'START' | 'PAUSE' | 'SAFETY' | 'COMPLETE' | 'STOP';
    timestamp_ms: number;  // Wall clock when command was sent
}
```

### Commands Received
Both sides apply the same state transition:
```typescript
onPlaybackCommand(command: PlaybackCommand): void {
    switch (command.command) {
        case 'START': this.showTimeEngine.start(); break;
        case 'PAUSE': this.showTimeEngine.pause(); break;
        case 'SAFETY': this.showTimeEngine.safety(); break;
        case 'COMPLETE': this.showTimeEngine.complete(); break;
        case 'STOP': this.showTimeEngine.stop(); break;
    }
}
```

## Implementation Plan

### Phase 1: Auth Side (ManageScriptPage)
1. Create `ShowTimeEngine` class
2. Replace `PlayContext` with `ShowTimeEngineProvider`
3. Update `PlaybackOverlay` to use computed show time
4. Remove `usePlaybackAdjustment` hook entirely
5. Update element display components
6. Remove timing-related edit operations

### Phase 2: Scoped Side (SharedPage)  
1. Implement identical `ShowTimeEngine` class
2. Replace `SynchronizedPlayContext` with `ShowTimeEngineProvider`
3. Update `MobileClockBar` to use computed show time
4. Remove manual timing calculations
5. Update element display components

### Phase 3: Cleanup
1. Remove all offset adjustment logic
2. Remove `cumulativeDelayMs` tracking
3. Simplify WebSocket protocol
4. Remove timing-related edit queue operations

## Success Criteria

1. **Timing Parity**: Auth and scoped sides show identical times during all states
2. **Pause Accuracy**: Show timer freezes during pause, resumes at exact same point
3. **Element Timing**: Display times update correctly on resume (not during pause)
4. **Data Integrity**: Element `offset_ms` values never modified
5. **Simplified Code**: Elimination of complex timing state tracking
6. **Synchronization**: Both sides remain synchronized through any pause/resume cycle

## Testing Requirements

### Automated Tests
- ShowTimeEngine state transitions
- Show time calculations with various pause scenarios
- Element state computation
- Display time formatting

### Manual Test Cases
1. Start show, pause at T+5min, resume after 2min pause → Timer shows T+5min, elements delayed by 2min
2. Multiple pause/resume cycles → Cumulative delay correctly applied
3. Pre-show pause → Start time shifts appropriately  
4. Safety stop → Same behavior as pause
5. Network disconnection during pause → Scoped side maintains correct timing
6. Late joiner during pause → Receives correct timing state

## Migration Risk Mitigation

- Implement alongside existing system initially
- Feature flag to switch between implementations
- Comprehensive test suite before cutover
- Clean dev tree allows full rollback if needed

## Files to be Modified

### Auth Side
- `/contexts/PlayContext.tsx` → Replace with `ShowTimeEngineProvider`
- `/features/script/components/PlaybackOverlay.tsx` → Use computed timing
- `/features/script/hooks/usePlaybackAdjustment.ts` → Remove entirely
- `/pages/ManageScriptPage.tsx` → Update timing integration

### Scoped Side  
- `/contexts/SynchronizedPlayContext.tsx` → Replace with `ShowTimeEngineProvider`
- `/shared/SharedPage.tsx` → Update MobileClockBar timing
- `/shared/components/SubscriberPlaybackOverlay.tsx` → Use computed timing

### Shared
- `/hooks/useScriptSync.ts` → Simplify playback command protocol

## Expected Code Reduction

- **Remove**: ~300 lines of timing adjustment logic
- **Remove**: ~150 lines of pause state tracking  
- **Remove**: ~200 lines of offset modification operations
- **Add**: ~400 lines of ShowTimeEngine implementation
- **Net**: ~250 lines reduction with significantly improved reliability

---

This specification ensures both sides implement identical timing behavior while eliminating the fundamental architectural flaws in the current system.