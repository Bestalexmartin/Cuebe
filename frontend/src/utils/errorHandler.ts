// frontend/src/utils/errorHandler.ts

import {
  createApiError,
  EnhancedError,
  ERROR_CATEGORIES,
} from "../types/errorTypes";

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  exponentialBase: number;
}

export interface ErrorHandlerOptions {
  onRetry?: () => Promise<void>;
  retryConfig?: Partial<RetryConfig>;
  suppressToast?: boolean;
  context?: string; // Additional context for logging
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  exponentialBase: 2,
};

export class ErrorHandler {
  private retryAttempts: Map<string, number> = new Map();

  /**
   * Process and categorize an error from an API response
   */
  async handleApiError(
    error: any,
    context: string,
    _options: ErrorHandlerOptions = {},
  ): Promise<EnhancedError> {
    let apiError: EnhancedError;

    // Handle different error types
    if (error instanceof Response) {
      // Fetch response error
      const status = error.status;
      let message = `Request failed with status ${status}`;
      let details = "";

      try {
        const errorData = await error.json();
        message = errorData.message || errorData.detail || message;
        details = errorData.details || "";
      } catch {
        // Could not parse JSON, use default message
      }

      apiError = createApiError(message, status, details);
    } else if (error instanceof Error) {
      // Network or JavaScript error
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        // Network error
        apiError = {
          message:
            "Unable to connect to the server. Please check your internet connection.",
          severity: "error",
          retryable: true,
          code: ERROR_CATEGORIES.NETWORK.code,
        };
      } else {
        // Generic JavaScript error
        apiError = {
          message: error.message || "An unexpected error occurred",
          severity: "error",
          retryable: false,
          code: "UNKNOWN_ERROR",
        };
      }
    } else if (typeof error === "string") {
      // String error message
      apiError = {
        message: error,
        severity: "error",
        retryable: false,
        code: "UNKNOWN_ERROR",
      };
    } else {
      // Unknown error type
      apiError = {
        message: "An unexpected error occurred",
        severity: "error",
        retryable: false,
        code: "UNKNOWN_ERROR",
      };
    }

    // Add context to error
    if (context) {
      apiError.details = apiError.details
        ? `${apiError.details} (Context: ${context})`
        : `Context: ${context}`;
    }

    // Log error for debugging
    console.error(`[ErrorHandler] ${context}:`, {
      error: apiError,
      originalError: error,
      timestamp: new Date().toISOString(),
    });

    return apiError;
  }

  /**
   * Execute a function with automatic retry logic for retryable errors
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    options: ErrorHandlerOptions = {},
  ): Promise<T> {
    const config = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig };
    const currentAttempts = this.retryAttempts.get(operationId) || 0;

    try {
      const result = await operation();
      // Success - reset retry count
      this.retryAttempts.delete(operationId);
      return result;
    } catch (error) {
      const apiError = await this.handleApiError(
        error,
        options.context || operationId,
        options,
      );

      // Check if we should retry
      if (apiError.retryable && currentAttempts < config.maxRetries) {
        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.exponentialBase, currentAttempts),
          config.maxDelay,
        );

        // Add some jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;

        // Update retry count
        this.retryAttempts.set(operationId, currentAttempts + 1);

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, jitteredDelay));

        // Retry the operation
        return this.executeWithRetry(operation, operationId, options);
      }

      // Max retries reached or not retryable - reset count and throw
      this.retryAttempts.delete(operationId);
      throw apiError;
    }
  }

  /**
   * Get current retry attempt count for an operation
   */
  getRetryCount(operationId: string): number {
    return this.retryAttempts.get(operationId) || 0;
  }

  /**
   * Reset retry count for an operation
   */
  resetRetryCount(operationId: string): void {
    this.retryAttempts.delete(operationId);
  }

  /**
   * Clear all retry counts
   */
  clearAllRetryCounts(): void {
    this.retryAttempts.clear();
  }
}

// Global error handler instance
export const globalErrorHandler = new ErrorHandler();

/**
 * Enhanced fetch wrapper with automatic error handling and retry
 */
export async function enhancedFetch(
  url: string,
  options: RequestInit = {},
  context?: string,
  retryConfig?: Partial<RetryConfig>,
): Promise<Response> {
  const operationId = `fetch-${url}-${options.method || "GET"}`;

  return globalErrorHandler.executeWithRetry(
    async () => {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw response; // Will be handled by error handler
      }

      return response;
    },
    operationId,
    { context, retryConfig },
  );
}

/**
 * Check if the current environment supports network status detection
 */
export function supportsNetworkStatus(): boolean {
  return typeof navigator !== "undefined" && "onLine" in navigator;
}

/**
 * Get current network status
 */
export function isOnline(): boolean {
  if (!supportsNetworkStatus()) return true;
  return navigator.onLine;
}
