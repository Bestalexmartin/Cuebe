// frontend/src/utils/timeUtils.ts

/**
 * CONSOLIDATED TIME UTILITIES
 * Central source of truth for all time formatting and conversion.
 * Implements the Time Handling Specification (docs/architecture/time-handling-specification.md)
 */

/**
 * Format a time offset in milliseconds for SCRIPT ELEMENTS
 * Always uses H:MM:SS format (no AM/PM, no leading zero on hours)
 * @param timeOffsetMs - Time offset in milliseconds from show start (can be negative)
 * @param useMilitaryTime - Whether to use 24-hour format (0-23) vs 12-hour format (1-12 wrap)
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
            // 24-hour format: 0:00:00 to 23:59:59 (no leading zero on single digit hours)
            formatted = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            // 12-hour format without AM/PM: 1:00:00 to 11:59:59, then wraps to 1:00:00
            // Note: This is for script offsets, not clock times, so no AM/PM
            const displayHours = hours % 12 === 0 ? 12 : hours % 12;
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
 * Parse a time string to milliseconds - handles multiple input formats
 * Supports: HH:MM:SS, MM:SS, SS, negative values, and import formats (1.5m, 90s, etc.)
 * @param timeString - Time string in various formats
 * @returns Milliseconds or null if invalid
 */
export const parseTimeToMs = (timeString: string): number | null => {
    if (!timeString?.trim()) return null;

    const trimmed = timeString.trim();
    const isNegative = trimmed.startsWith('-');
    const cleanTime = trimmed.replace(/^-/, '');

    // Try colon-separated format first (HH:MM:SS, MM:SS, SS)
    if (cleanTime.includes(':')) {
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
    }

    // Try import format patterns (1.5m, 90s, etc.)
    const importFormats = [
        // "1.5m" (decimal minutes)
        {
            pattern: /^(\d+(?:\.\d+)?)m$/i,
            converter: (match: RegExpMatchArray) => Math.round(parseFloat(match[1]) * 60 * 1000)
        },
        // "90s" (seconds with unit)
        {
            pattern: /^(\d+(?:\.\d+)?)s$/i,
            converter: (match: RegExpMatchArray) => Math.round(parseFloat(match[1]) * 1000)
        },
        // "90" (seconds - must be last to avoid conflicts)
        {
            pattern: /^(\d+(?:\.\d+)?)$/,
            converter: (match: RegExpMatchArray) => Math.round(parseFloat(match[1]) * 1000)
        }
    ];

    for (const format of importFormats) {
        const match = cleanTime.match(format.pattern);
        if (match) {
            try {
                const milliseconds = format.converter(match);
                
                // Validate result
                if (isNaN(milliseconds) || milliseconds < 0) {
                    return null;
                }
                
                // Sanity check - reject times longer than 24 hours
                if (milliseconds > 24 * 60 * 60 * 1000) {
                    return null;
                }
                
                return isNegative ? -milliseconds : milliseconds;
            } catch {
                return null;
            }
        }
    }

    return null;
};

/**
 * Convert a local datetime-local input value to UTC ISO string for database storage
 * @param localDateTime - Value from datetime-local input or Date object
 * @returns UTC ISO string for backend storage (e.g., "2025-01-21T18:00:00.000Z")
 */
export const convertLocalToUTC = (
  localDateTime: string | Date | null | undefined
): string | null => {
  if (!localDateTime) {
    return null;
  }
  
  // Handle both string and Date inputs
  let localDate: Date;
  if (localDateTime instanceof Date) {
    localDate = localDateTime;
  } else {
    // Create date object from local datetime-local input
    localDate = new Date(localDateTime);
  }
  
  // Check for invalid date
  if (isNaN(localDate.getTime())) {
    return null;
  }
  
  // Convert to UTC ISO string
  return localDate.toISOString();
};

/**
 * Convert a UTC ISO string to datetime-local input format
 * @param utcDateTime - ISO string from backend (stored in UTC)
 * @returns Local datetime string for datetime-local inputs (e.g., "2025-01-21T18:00")
 */
export const convertUTCToLocal = (
  utcDateTime: string | Date | null | undefined
): string => {
  if (!utcDateTime) {
    return '';
  }
  
  // Handle both string and Date inputs
  let utcDate: Date;
  if (utcDateTime instanceof Date) {
    utcDate = utcDateTime;
  } else {
    // Parse as UTC
    utcDate = new Date(utcDateTime + (utcDateTime.includes('Z') ? '' : 'Z'));
  }
  
  // Convert to local time and format for datetime-local input
  const year = utcDate.getFullYear();
  const month = String(utcDate.getMonth() + 1).padStart(2, '0');
  const day = String(utcDate.getDate()).padStart(2, '0');
  const hours = String(utcDate.getHours()).padStart(2, '0');
  const minutes = String(utcDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
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
 * Format absolute clock time from start time + offset (for script elements - never shows AM/PM)
 * Always uses H:MM:SS format for consistency with script element display
 * @param startTime - Show start time (Date object or ISO string)
 * @param offsetMs - Time offset in milliseconds (can be negative)
 * @param useMilitaryTime - Whether to use 24-hour format
 */
export const formatAbsoluteTime = (startTime: Date | string, offsetMs: number, useMilitaryTime: boolean = false): string => {
    const baseTime = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const absoluteTime = addTimeOffset(baseTime, offsetMs);
    
    const hours = absoluteTime.getHours();
    const minutes = absoluteTime.getMinutes();
    const seconds = absoluteTime.getSeconds();
    
    if (useMilitaryTime) {
        // 24-hour format: 0:00:00 to 23:59:59 (no leading zero on single digit hours for script consistency)
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        // 12-hour format without AM/PM: 1:00:00 to 12:59:59, proper 12-hour wrap
        const displayHours = hours % 12 === 0 ? 12 : hours % 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
};

/**
 * Format absolute time for NON-SCRIPT contexts (shows, venues, general timestamps)
 * Uses HH:MM (24hr) or h:mm a (12hr with AM/PM) format per specification
 * @param utcDateTime - ISO string from backend or Date object (stored in UTC)
 * @param useMilitaryTime - Whether to use 24-hour format
 * @returns Time string in local timezone (e.g., "6:00 PM" or "18:00")
 */
export const formatAbsoluteTimeStandard = (
  utcDateTime: string | Date | null | undefined,
  useMilitaryTime: boolean = false
): string => {
  if (!utcDateTime) return 'Not set';
  
  // Handle both string and Date inputs
  let utcDate: Date;
  if (utcDateTime instanceof Date) {
    utcDate = utcDateTime;
  } else {
    // Parse as UTC and display in local time
    utcDate = new Date(utcDateTime + (utcDateTime.includes('Z') ? '' : 'Z'));
  }
  
  if (useMilitaryTime) {
    // 24-hour format: HH:MM (always 2-digit hours)
    return utcDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } else {
    // 12-hour format: h:mm a (1-digit hours when possible, with AM/PM)
    return utcDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
};

/**
 * Format a UTC datetime for display in local time
 * @param utcDateTime - ISO string from backend or Date object (stored in UTC)
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted string in local timezone
 */
export const formatDateTimeLocal = (
  utcDateTime: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  if (!utcDateTime) return 'Not set';
  
  // Handle both string and Date inputs
  let utcDate: Date;
  if (utcDateTime instanceof Date) {
    utcDate = utcDateTime;
  } else {
    // Parse as UTC and display in local time
    utcDate = new Date(utcDateTime + (utcDateTime.includes('Z') ? '' : 'Z'));
  }
  return utcDate.toLocaleDateString('en-US', options);
};

/**
 * Format a UTC datetime string for display in friendly format
 * @param utcDateTime - ISO string from backend or Date object
 * @returns Formatted string like "Saturday, July 12, 2025"
 */
export const formatDateFriendly = (
  utcDateTime: string | Date | null | undefined
): string => {
  if (!utcDateTime) return 'No date set';
  
  // Handle both string and Date inputs
  let utcDate: Date;
  if (utcDateTime instanceof Date) {
    utcDate = utcDateTime;
  } else {
    // Parse as UTC and display in local time
    utcDate = new Date(utcDateTime + (utcDateTime.includes('Z') ? '' : 'Z'));
  }
  return utcDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format a UTC datetime string for human-readable display with day and time
 * @param utcDateTime - ISO string from backend or Date object (stored in UTC)
 * @param useMilitaryTime - Whether to use 24-hour format
 * @returns Formatted string like "Sunday, July 2 @ 7:30 PM" or "Sunday, July 2 @ 19:30"
 */
export const formatShowDateTime = (
  utcDateTime: string | Date | null | undefined,
  useMilitaryTime: boolean = false
): string => {
  if (!utcDateTime) return 'TBD';
  
  // Handle both string and Date inputs
  let utcDate: Date;
  if (utcDateTime instanceof Date) {
    utcDate = utcDateTime;
  } else {
    // Parse as UTC and display in local time
    utcDate = new Date(utcDateTime + (utcDateTime.includes('Z') ? '' : 'Z'));
  }
  
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  };
  
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: !useMilitaryTime
  };
  
  const datePart = utcDate.toLocaleDateString('en-US', dateOptions);
  const timePart = utcDate.toLocaleTimeString('en-US', timeOptions);
  
  return `${datePart} @ ${timePart}`;
};

// Legacy compatibility - re-export formatAbsoluteTimeStandard as formatTimeLocal for backward compatibility
export const formatTimeLocal = formatAbsoluteTimeStandard;

