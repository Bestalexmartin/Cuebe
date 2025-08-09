// frontend/src/utils/dateTimeUtils.ts

/**
 * Utility functions for consistent datetime handling across the application.
 * All datetimes are stored in UTC in the database and should be displayed in local time.
 */

/**
 * Formats a UTC datetime for display in local time
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
 * Formats a UTC datetime to show only the time portion in local timezone
 * @param utcDateTime - ISO string from backend or Date object (stored in UTC)
 * @returns Time string in local timezone (e.g., "6:00 PM")
 */
export const formatTimeLocal = (
  utcDateTime: string | Date | null | undefined
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
  return utcDate.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  });
};

/**
 * Formats a UTC datetime string for display in friendly format
 * @param utcDateTimeString - ISO string from backend (stored in UTC)
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
 * Converts a datetime-local input value to UTC ISO string for sending to backend
 * @param localDateTimeString - Value from datetime-local input (e.g., "2025-01-21T18:00")
 * @returns UTC ISO string for backend storage
 */
export const convertLocalToUTC = (
  localDateTime: string | Date | null | undefined
): string | null => {
  if (!localDateTime) return null;
  
  // Handle both string and Date inputs
  let localDate: Date;
  if (localDateTime instanceof Date) {
    localDate = localDateTime;
  } else {
    // Create date object from local datetime-local input
    localDate = new Date(localDateTime);
  }
  // Convert to UTC ISO string
  return localDate.toISOString();
};

/**
 * Converts a UTC ISO string to datetime-local input format
 * @param utcDateTimeString - ISO string from backend (stored in UTC)
 * @returns Local datetime string for datetime-local inputs (e.g., "2025-01-21T18:00")
 */
export const convertUTCToLocal = (
  utcDateTime: string | Date | null | undefined
): string => {
  if (!utcDateTime) return '';
  
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
 * Formats a UTC datetime string for human-readable display with day and time
 * @param utcDateTime - ISO string from backend or Date object (stored in UTC)
 * @returns Formatted string like "Sunday, July 2 @ 7:30 PM"
 */
export const formatShowDateTime = (
  utcDateTime: string | Date | null | undefined
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
    hour12: true
  };
  
  const datePart = utcDate.toLocaleDateString('en-US', dateOptions);
  const timePart = utcDate.toLocaleTimeString('en-US', timeOptions);
  
  return `${datePart} @ ${timePart}`;
};