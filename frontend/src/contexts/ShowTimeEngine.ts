// frontend/src/contexts/ShowTimeEngine.ts

export type PlaybackState = 'STOPPED' | 'PLAYING' | 'PAUSED' | 'SAFETY' | 'COMPLETE';

export interface ShowTimeEngine {
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
    
    // Script Management
    setScript(scriptStartTime?: string | Date | number | null): void;
    
    // Sync Helpers
    setTotalPauseTime(ms: number): void;       // Set cumulative pause time (for late joiners)
    
    // Event Handlers
    onStateChange(callback: (state: PlaybackState) => void): void;
    onShowTimeUpdate(callback: (showTime: number) => void): void;
    onTimestampUpdate(callback: (timestamp: number) => void): void;
}

export class ShowTimeEngineImpl implements ShowTimeEngine {
    private _playbackState: PlaybackState = 'STOPPED';
    private _showStartedAt: number | null = null;
    private _pausedAt: number | null = null;
    private _totalPauseTime: number = 0;
    private _stateChangeCallbacks: ((state: PlaybackState) => void)[] = [];
    private _showTimeUpdateCallbacks: ((showTime: number) => void)[] = [];
    private _timestampUpdateCallbacks: ((timestamp: number) => void)[] = [];
    private _updateInterval: number | null = null;
    private _scriptStartTime: number | null = null;

    constructor(scriptStartTime?: string | Date | number) {
        if (scriptStartTime) {
            if (typeof scriptStartTime === 'string') {
                this._scriptStartTime = new Date(scriptStartTime).getTime();
            } else if (scriptStartTime instanceof Date) {
                this._scriptStartTime = scriptStartTime.getTime();
            } else {
                this._scriptStartTime = scriptStartTime;
            }
        }
    }

    // Getters for readonly properties
    get playbackState(): PlaybackState {
        return this._playbackState;
    }

    get showStartedAt(): number | null {
        return this._showStartedAt;
    }

    get pausedAt(): number | null {
        return this._pausedAt;
    }

    get totalPauseTime(): number {
        return this._totalPauseTime;
    }

    // Core Algorithm: Show Time Calculation
    getCurrentShowTime(now?: number): number {
        if (!this._scriptStartTime) return 0;
        
        // Use provided timestamp or get current time (for backwards compatibility)
        const currentTime = now ?? Date.now();
        
        // Calculate time relative to script start (can be negative for T-minus countdown)
        let showTime = currentTime - this._scriptStartTime;
        
        // Subtract accumulated pause time
        showTime -= this._totalPauseTime;
        
        // If currently paused, subtract current pause duration
        if (this._pausedAt) {
            const currentPauseDuration = currentTime - this._pausedAt;
            showTime -= currentPauseDuration;
        }
        
        return showTime;
    }

    // State Queries
    isPlaying(): boolean {
        return this._playbackState === 'PLAYING';
    }

    isPaused(): boolean {
        return this._playbackState === 'PAUSED';
    }

    isStopped(): boolean {
        return this._playbackState === 'STOPPED';
    }

    isSafety(): boolean {
        return this._playbackState === 'SAFETY';
    }

    isComplete(): boolean {
        return this._playbackState === 'COMPLETE';
    }

    // State Transitions
    start(): void {
        const now = Date.now();
        
        if (this._playbackState === 'STOPPED') {
            // Fresh start - round script start time to nearest second for precise timer alignment
            this._showStartedAt = now;
            
            if (this._scriptStartTime) {
                // Round script start time to nearest second for synchronized tick boundaries
                const roundedScriptStart = Math.round(this._scriptStartTime / 1000) * 1000;
                this._scriptStartTime = roundedScriptStart;
            }
            
            this._totalPauseTime = 0;
            this._pausedAt = null;
        } else if (this._pausedAt) {
            // Resume from pause - round to nearest second for visual timer sync
            const currentPauseDuration = now - this._pausedAt;
            const roundedPauseDuration = Math.round(currentPauseDuration / 1000) * 1000;
            this._totalPauseTime += roundedPauseDuration;
            this._pausedAt = null;
        }
        
        this._playbackState = 'PLAYING';
        this._notifyStateChange();
        this._startUpdateLoop();
    }

    pause(): void {
        if (this._playbackState === 'PLAYING') {
            this._pausedAt = Date.now();
            this._playbackState = 'PAUSED';
            this._notifyStateChange();
            this._stopUpdateLoop();
        }
    }

    safety(): void {
        if (this._playbackState === 'PLAYING') {
            this._pausedAt = Date.now();
            this._playbackState = 'SAFETY';
            this._notifyStateChange();
            this._stopUpdateLoop();
        }
    }

    complete(): void {
        // Can complete from any state except STOPPED
        if (this._playbackState !== 'STOPPED') {
            // If we were paused, finalize the pause time with rounding
            if (this._pausedAt) {
                const currentPauseDuration = Date.now() - this._pausedAt;
                const roundedPauseDuration = Math.round(currentPauseDuration / 1000) * 1000;
                this._totalPauseTime += roundedPauseDuration;
                this._pausedAt = Date.now(); // Keep pausedAt for frozen timer display
            } else {
                this._pausedAt = Date.now(); // Set pausedAt to freeze timer
            }
            this._playbackState = 'COMPLETE';
            this._notifyStateChange();
            this._stopUpdateLoop();
        }
    }

    stop(): void {
        this._playbackState = 'STOPPED';
        this._showStartedAt = null;
        this._pausedAt = null;
        this._totalPauseTime = 0;
        this._notifyStateChange();
        this._stopUpdateLoop();
    }

    // Script Management
    setScript(scriptStartTime?: string | Date | number | null): void {
        // Preserve cumulative pause time when switching scripts to avoid losing late-join status.
        const preservedPause = this._totalPauseTime;

        // Reset state without clearing total pause time
        this._playbackState = 'STOPPED';
        this._showStartedAt = null;
        this._pausedAt = null;

        if (scriptStartTime) {
            if (typeof scriptStartTime === 'string') {
                this._scriptStartTime = new Date(scriptStartTime).getTime();
            } else if (scriptStartTime instanceof Date) {
                this._scriptStartTime = scriptStartTime.getTime();
            } else {
                this._scriptStartTime = scriptStartTime;
            }
        } else {
            this._scriptStartTime = null;
        }

        this._totalPauseTime = preservedPause;
        this._notifyStateChange();
        this._stopUpdateLoop();
    }

    // Sync Helpers
    setTotalPauseTime(ms: number): void {
        const normalized = Math.max(0, Math.round((ms || 0) / 1000) * 1000);
        this._totalPauseTime = normalized;
        this._notifyShowTimeUpdate();
    }

    // Event Handler Registration
    onStateChange(callback: (state: PlaybackState) => void): void {
        this._stateChangeCallbacks.push(callback);
    }

    onShowTimeUpdate(callback: (showTime: number) => void): void {
        this._showTimeUpdateCallbacks.push(callback);
    }

    onTimestampUpdate(callback: (timestamp: number) => void): void {
        this._timestampUpdateCallbacks.push(callback);
    }

    // Private Methods
    private _notifyStateChange(): void {
        this._stateChangeCallbacks.forEach(callback => {
            try {
                callback(this._playbackState);
            } catch (error) {
                console.error('Error in state change callback:', error);
            }
        });
    }

    private _notifyShowTimeUpdate(): void {
        // Single source of truth for current time
        const now = Date.now();
        const currentTime = this.getCurrentShowTime(now);
        
        this._showTimeUpdateCallbacks.forEach(callback => {
            try {
                callback(currentTime);
            } catch (error) {
                console.error('Error in show time update callback:', error);
            }
        });
        
        // Also notify timestamp callbacks for synchronized wall clock
        this._timestampUpdateCallbacks.forEach(callback => {
            try {
                callback(now);
            } catch (error) {
                console.error('Error in timestamp update callback:', error);
            }
        });
    }

    private _startUpdateLoop(): void {
        this._stopUpdateLoop(); // Ensure no duplicate intervals
        
        // Update show time every 100ms during playback
        this._updateInterval = window.setInterval(() => {
            this._notifyShowTimeUpdate();
        }, 100);
        
        // Immediate update
        this._notifyShowTimeUpdate();
    }

    private _stopUpdateLoop(): void {
        if (this._updateInterval !== null) {
            clearInterval(this._updateInterval);
            this._updateInterval = null;
        }
        
        // Send final update when stopping
        this._notifyShowTimeUpdate();
    }

    // Cleanup method for component unmounting
    destroy(): void {
        this._stopUpdateLoop();
        this._stateChangeCallbacks.length = 0;
        this._showTimeUpdateCallbacks.length = 0;
    }
}
