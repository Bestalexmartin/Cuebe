// frontend/src/features/script/import/utils/timeConverter.ts

interface TimeFormat {
  pattern: RegExp;
  converter: (match: RegExpMatchArray) => number;
  description: string;
}

/**
 * Supported time formats for script imports
 */
const TIME_FORMATS: TimeFormat[] = [
  // "1:30:45" (hours:minutes:seconds)
  {
    pattern: /^(\d+):(\d+):(\d+)$/,
    converter: ([_, h, m, s]) => (parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s)) * 1000,
    description: "Hours:Minutes:Seconds (1:30:45)"
  },
  
  // "1:30" (minutes:seconds)
  {
    pattern: /^(\d+):(\d+)$/,
    converter: ([_, m, s]) => (parseInt(m) * 60 + parseInt(s)) * 1000,
    description: "Minutes:Seconds (1:30)"
  },
  
  // "1.5m" (decimal minutes)
  {
    pattern: /^(\d+(?:\.\d+)?)m$/i,
    converter: ([_, m]) => Math.round(parseFloat(m) * 60 * 1000),
    description: "Decimal minutes (1.5m)"
  },
  
  // "90s" (seconds with unit)
  {
    pattern: /^(\d+(?:\.\d+)?)s$/i,
    converter: ([_, s]) => Math.round(parseFloat(s) * 1000),
    description: "Seconds with unit (90s)"
  },
  
  // "90" (seconds - must be last to avoid conflicts)
  {
    pattern: /^(\d+(?:\.\d+)?)$/,
    converter: ([_, s]) => Math.round(parseFloat(s) * 1000),
    description: "Seconds (90)"
  }
];

export interface TimeConversionResult {
  success: boolean;
  milliseconds?: number;
  error?: string;
  detectedFormat?: string;
}

/**
 * Convert various time formats to milliseconds
 */
export const convertTimeToMs = (timeString: string): TimeConversionResult => {
  if (!timeString || typeof timeString !== 'string') {
    return {
      success: false,
      error: 'Time value is required'
    };
  }

  const trimmed = timeString.trim();
  
  if (trimmed === '') {
    return {
      success: false,
      error: 'Time value cannot be empty'
    };
  }

  for (const format of TIME_FORMATS) {
    const match = trimmed.match(format.pattern);
    if (match) {
      try {
        const milliseconds = format.converter(match);
        
        // Validate result
        if (isNaN(milliseconds) || milliseconds < 0) {
          return {
            success: false,
            error: `Invalid time calculation for "${timeString}"`
          };
        }
        
        // Sanity check - reject times longer than 24 hours
        if (milliseconds > 24 * 60 * 60 * 1000) {
          return {
            success: false,
            error: `Time value "${timeString}" is too large (max 24 hours)`
          };
        }
        
        return {
          success: true,
          milliseconds,
          detectedFormat: format.description
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to parse time "${timeString}": ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  }

  return {
    success: false,
    error: `Unrecognized time format: "${timeString}". Supported formats: ${TIME_FORMATS.map(f => f.description).join(', ')}`
  };
};

/**
 * Convert milliseconds back to human-readable time format
 */
export const formatTimeFromMs = (milliseconds: number, format: 'short' | 'long' = 'short'): string => {
  if (milliseconds < 0) return '0:00';
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (format === 'long' && hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Validate if a time string can be converted
 */
export const isValidTimeFormat = (timeString: string): boolean => {
  return convertTimeToMs(timeString).success;
};

/**
 * Get supported time format examples for user guidance
 */
export const getTimeFormatExamples = (): string[] => [
  '1:30 (1 minute 30 seconds)',
  '0:45 (45 seconds)', 
  '2:15:30 (2 hours 15 minutes 30 seconds)',
  '90 (90 seconds)',
  '90s (90 seconds)',
  '1.5m (1.5 minutes)'
];