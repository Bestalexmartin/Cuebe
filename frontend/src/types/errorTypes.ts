// frontend/src/types/errorTypes.ts

export type ErrorSeverity = 'error' | 'warning' | 'info' | 'success';

export interface EnhancedError {
  message: string;
  severity: ErrorSeverity;
  retryable: boolean;
  code?: string;
  details?: string;
  field?: string; // For field-level validation errors
}

export interface ApiError extends EnhancedError {
  status?: number;
  timestamp?: string;
  requestId?: string;
}

export const ERROR_CATEGORIES = {
  NETWORK: {
    code: 'NETWORK_ERROR',
    retryable: true,
    severity: 'error' as ErrorSeverity,
    userAction: 'Check your connection and try again'
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    retryable: false,
    severity: 'warning' as ErrorSeverity,
    userAction: 'Please sign in again'
  },
  VALIDATION: {
    code: 'VALIDATION_ERROR',
    retryable: false,
    severity: 'warning' as ErrorSeverity,
    userAction: 'Please check your input'
  },
  SERVER: {
    code: 'SERVER_ERROR',
    retryable: true,
    severity: 'error' as ErrorSeverity,
    userAction: 'Please try again in a moment'
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    retryable: false,
    severity: 'info' as ErrorSeverity,
    userAction: 'The requested item was not found'
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    retryable: false,
    severity: 'warning' as ErrorSeverity,
    userAction: 'You do not have permission for this action'
  }
} as const;

export const createApiError = (
  message: string,
  status?: number,
  details?: string
): ApiError => {
  let category = ERROR_CATEGORIES.SERVER; // Default

  if (status) {
    switch (status) {
      case 401:
        category = ERROR_CATEGORIES.UNAUTHORIZED;
        break;
      case 403:
        category = ERROR_CATEGORIES.FORBIDDEN;
        break;
      case 404:
        category = ERROR_CATEGORIES.NOT_FOUND;
        break;
      case 400:
        category = ERROR_CATEGORIES.VALIDATION;
        break;
      case 500:
      case 502:
      case 503:
        category = ERROR_CATEGORIES.SERVER;
        break;
      default:
        if (status >= 500) {
          category = ERROR_CATEGORIES.SERVER;
        } else if (status >= 400) {
          category = ERROR_CATEGORIES.VALIDATION;
        }
    }
  }

  return {
    message,
    severity: category.severity,
    retryable: category.retryable,
    code: category.code,
    details,
    status,
    timestamp: new Date().toISOString()
  };
};