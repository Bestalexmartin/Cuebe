/**
 * Validates if a share token is present and properly formatted
 */
export const validateShareToken = (token: string | undefined): boolean => {
  return !!(token && token.trim().length > 0);
};

/**
 * Creates a safe, encoded share token for API requests
 */
export const encodeShareToken = (token: string): string => {
  return encodeURIComponent(token);
};

/**
 * Builds API URLs with share token parameter
 */
export const buildSharedApiUrl = (baseUrl: string, shareToken: string): string => {
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}share_token=${encodeShareToken(shareToken)}`;
};

/**
 * Standard error message for invalid share tokens
 */
export const INVALID_SHARE_TOKEN_ERROR = 'Invalid share link';

/**
 * Creates a standardized share token error
 */
export const createShareTokenError = (message?: string): Error => {
  return new Error(message || INVALID_SHARE_TOKEN_ERROR);
};