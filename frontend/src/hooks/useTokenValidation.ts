import { useState, useEffect, useCallback, useRef } from 'react';
import { validateShareToken, encodeShareToken } from '../utils/tokenValidation';

interface TokenValidationOptions {
  intervalMs?: number;
  onExpired?: () => void;
  enabled?: boolean;
}

interface TokenValidationResult {
  isValid: boolean;
  isValidating: boolean;
  lastValidated: number | null;
  forceValidate: () => void;
}

export const useTokenValidation = (
  shareToken: string | undefined,
  options: TokenValidationOptions = {}
): TokenValidationResult => {
  const {
    intervalMs = 45000, // Default 45 seconds
    onExpired,
    enabled = true
  } = options;

  const [isValid, setIsValid] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidated, setLastValidated] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearInterval = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const validateToken = useCallback(async () => {
    if (!validateShareToken(shareToken) || !enabled) {
      return;
    }

    setIsValidating(true);
    
    try {
      const response = await fetch(
        `/api/shared/${encodeShareToken(shareToken!)}/validate`,
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setIsValid(false);
          onExpired?.();
          return;
        }
        // For server errors (500, etc.), don't invalidate - could be temporary
        console.warn('Token validation server error:', response.status);
        return;
      }

      const data = await response.json();
      if (data.valid) {
        setIsValid(true);
        setLastValidated(Date.now());
      } else {
        setIsValid(false);
        onExpired?.();
      }
    } catch (error) {
      // Network errors shouldn't invalidate the token - could be temporary
      console.warn('Token validation network error:', error);
    } finally {
      setIsValidating(false);
    }
  }, [shareToken, enabled, onExpired]);

  // Force validation function
  const forceValidate = useCallback(() => {
    validateToken();
  }, [validateToken]);

  // Setup periodic validation
  useEffect(() => {
    if (!enabled || !validateShareToken(shareToken)) {
      clearInterval();
      return;
    }

    // Initial validation
    validateToken();

    // Setup periodic validation
    intervalRef.current = setInterval(validateToken, intervalMs);

    return clearInterval;
  }, [shareToken, enabled, intervalMs, validateToken, clearInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return clearInterval;
  }, [clearInterval]);

  return {
    isValid,
    isValidating,
    lastValidated,
    forceValidate
  };
};