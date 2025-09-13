// frontend/src/utils/showTimeUtils.ts

import type { ScriptElement } from '../features/script/types/scriptElements';
import type { ShowTimeEngine } from '../contexts/ShowTimeEngine';

export interface Script {
    start_time: string;
    [key: string]: any;
}

/**
 * Calculate when an element will actually trigger in real-world time
 * This accounts for accumulated pause time without modifying element data
 */
export function getElementDisplayTime(
    element: ScriptElement, 
    script: Script, 
    showTimeEngine: ShowTimeEngine
): Date {
    const scriptStartTime = new Date(script.start_time);
    const elementShowTime = element.offset_ms || 0; // Original, immutable design time
    
    // Compute when this element will actually trigger in real world
    const realWorldTriggerTime = scriptStartTime.getTime() + 
                                elementShowTime + 
                                showTimeEngine.totalPauseTime;
    
    return new Date(realWorldTriggerTime);
}

/**
 * Calculate element state based on current show time vs element offset
 */
export function getElementState(
    element: ScriptElement, 
    currentShowTime: number,
    lookaheadMs: number = 30000
): 'inactive' | 'upcoming' | 'current' | 'past' {
    const triggerTime = element.offset_ms || 0;
    
    if (currentShowTime < triggerTime - lookaheadMs) return 'inactive';
    if (currentShowTime < triggerTime) return 'upcoming';  
    if (currentShowTime < triggerTime + 5000) return 'current'; // 5s active duration
    return 'past';
}

/**
 * Format show time for display (countdown/countup timer)
 */
export function formatShowTimer(showTime: number): string {
    const totalSeconds = Math.floor(Math.abs(showTime) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    // Use -1000 threshold to avoid showing both -0:00 and 0:00
    return showTime < -999 ? `–${timeStr}` : timeStr;
}

/**
 * Format real-time clock display
 */
export function formatRealTimeClock(timestamp: number, useMilitaryTime: boolean = false): string {
    const date = new Date(timestamp);
    const hours = useMilitaryTime ? date.getHours() : date.getHours() % 12 || 12;
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    const ampm = useMilitaryTime ? '' : (date.getHours() >= 12 ? ' PM' : ' AM');
    return `${hours}:${minutes}:${seconds}${ampm}`;
}

/**
 * Format element time for display in UI
 */
export function formatElementTime(
    element: ScriptElement,
    script: Script,
    showTimeEngine: ShowTimeEngine,
    useMilitaryTime: boolean = false
): string {
    const displayTime = getElementDisplayTime(element, script, showTimeEngine);
    return formatRealTimeClock(displayTime.getTime(), useMilitaryTime);
}

/**
 * Calculate show time from script start time (used for pre-show countdown)
 */
export function calculateShowTimeFromStart(script: Script): number {
    if (!script.start_time) return 0;
    
    const scriptStartTime = new Date(script.start_time);
    return Date.now() - scriptStartTime.getTime();
}

/**
 * Check if show has started based on script start time
 */
export function hasShowStarted(script: Script): boolean {
    if (!script.start_time) return false;
    
    const scriptStartTime = new Date(script.start_time);
    return Date.now() >= scriptStartTime.getTime();
}