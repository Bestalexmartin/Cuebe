// frontend/src/utils/dateTimeUtils.ts

/**
 * Utility functions for consistent datetime handling across the application.
 * All datetimes are stored in UTC in the database and should be displayed in local time.
 */

/**
 * Formats a UTC datetime string for display in local time
 * @param utcDateTimeString - ISO string from backend (stored in UTC)
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted string in local timezone
 */
export const formatDateTimeLocal = (
  utcDateTimeString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  if (!utcDateTimeString) return 'Not set';
  
  // Parse as UTC and display in local time
  const utcDate = new Date(utcDateTimeString + (utcDateTimeString.includes('Z') ? '' : 'Z'));
  return utcDate.toLocaleDateString('en-US', options);
};

/**
 * Formats a UTC datetime string to show only the time portion in local timezone
 * @param utcDateTimeString - ISO string from backend (stored in UTC)
 * @returns Time string in local timezone (e.g., "6:00 PM")
 */
export const formatTimeLocal = (
  utcDateTimeString: string | null | undefined
): string => {
  if (!utcDateTimeString) return 'Not set';
  
  // Parse as UTC and display in local time
  const utcDate = new Date(utcDateTimeString + (utcDateTimeString.includes('Z') ? '' : 'Z'));
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
  utcDateTimeString: string | null | undefined
): string => {
  if (!utcDateTimeString) return 'No date set';
  
  // Parse as UTC and display in local time
  const utcDate = new Date(utcDateTimeString + (utcDateTimeString.includes('Z') ? '' : 'Z'));
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
  localDateTimeString: string | null | undefined
): string | null => {
  if (!localDateTimeString) return null;
  
  // Create date object from local datetime-local input
  const localDate = new Date(localDateTimeString);
  // Convert to UTC ISO string
  return localDate.toISOString();
};

/**
 * Converts a UTC ISO string to datetime-local input format
 * @param utcDateTimeString - ISO string from backend (stored in UTC)
 * @returns Local datetime string for datetime-local inputs (e.g., "2025-01-21T18:00")
 */
export const convertUTCToLocal = (
  utcDateTimeString: string | null | undefined
): string => {
  if (!utcDateTimeString) return '';
  
  // Parse as UTC
  const utcDate = new Date(utcDateTimeString + (utcDateTimeString.includes('Z') ? '' : 'Z'));
  // Convert to local time and format for datetime-local input
  const year = utcDate.getFullYear();
  const month = String(utcDate.getMonth() + 1).padStart(2, '0');
  const day = String(utcDate.getDate()).padStart(2, '0');
  const hours = String(utcDate.getHours()).padStart(2, '0');
  const minutes = String(utcDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};