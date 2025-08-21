// frontend/src/utils/timeUtils.ts

/**
 * Utility functions for time formatting and manipulation
 */

/**
 * Format a time offset in milliseconds to a readable string
 * @param timeOffsetMs - Time offset in milliseconds from show start
 * @param useMilitaryTime - Whether to use 24-hour format (affects hour display in 12+ hour ranges)
 */
export const formatTimeOffset = (timeOffsetMs: number | null, useMilitaryTime: boolean = false): string | null => {
    if (timeOffsetMs === null || timeOffsetMs === undefined) {
        return null;
    }

    // Handle negative values (cues before start time)
    const isNegative = timeOffsetMs < 0;
    const absoluteMs = Math.abs(timeOffsetMs);

    // Convert to total seconds
    const totalSeconds = Math.floor(absoluteMs / 1000);
    
    // Calculate hours, minutes, seconds
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Format based on duration and preference
    let formatted = '';
    
    if (hours > 0) {
        if (useMilitaryTime) {
            // 24-hour format: always show 2-digit hours
            formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            // 12-hour format without AM/PM (script times): 1-digit hours when possible
            const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
            formatted = `${displayHours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    } else if (minutes > 0) {
        formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        formatted = `0:${seconds.toString().padStart(2, '0')}`;
    }

    return isNegative ? `-${formatted}` : formatted;
};

/**
 * Parse a time string (HH:MM:SS or MM:SS or SS) to milliseconds
 */
export const parseTimeToMs = (timeString: string): number | null => {
    if (!timeString?.trim()) return null;

    const isNegative = timeString.startsWith('-');
    const cleanTime = timeString.replace('-', '').trim();
    
    const parts = cleanTime.split(':');
    
    if (parts.length === 0 || parts.length > 3) return null;

    try {
        const reverseParts = parts.reverse(); // Start from seconds
        let totalSeconds = 0;

        // Seconds
        if (reverseParts[0]) {
            totalSeconds += parseInt(reverseParts[0], 10);
        }

        // Minutes
        if (reverseParts[1]) {
            totalSeconds += parseInt(reverseParts[1], 10) * 60;
        }

        // Hours
        if (reverseParts[2]) {
            totalSeconds += parseInt(reverseParts[2], 10) * 3600;
        }

        const ms = totalSeconds * 1000;
        return isNegative ? -ms : ms;
    } catch {
        return null;
    }
};

/**
 * Format duration in milliseconds to human-readable format
 */
export const formatDuration = (durationMs: number): string => {
    if (durationMs < 0) return '0s';
    
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
};

/**
 * Get current time as milliseconds offset (for real-time cue timing)
 */
export const getCurrentTimeOffset = (startTime?: Date): number => {
    const now = new Date();
    if (!startTime) return 0;
    
    return now.getTime() - startTime.getTime();
};

/**
 * Add time offset to a base date
 */
export const addTimeOffset = (baseDate: Date, offsetMs: number): Date => {
    return new Date(baseDate.getTime() + offsetMs);
};

/**
 * Format absolute time from start time + offset (for script elements - never shows AM/PM)
 * @param startTime - Show start time
 * @param offsetMs - Time offset in milliseconds
 * @param useMilitaryTime - Whether to use 24-hour format
 */
export const formatAbsoluteTime = (startTime: Date | string, offsetMs: number, useMilitaryTime: boolean = false): string => {
    const baseTime = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const absoluteTime = addTimeOffset(baseTime, offsetMs);
    
    const hours = absoluteTime.getHours();
    const minutes = absoluteTime.getMinutes();
    const seconds = absoluteTime.getSeconds();
    
    if (useMilitaryTime) {
        // 24-hour format: always show 2-digit hours (13:00:00)
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        // 12-hour format without AM/PM: 1-digit hours when possible (1:00:00)
        const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
        return `${displayHours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
};

