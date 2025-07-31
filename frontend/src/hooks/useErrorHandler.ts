// frontend/src/hooks/useErrorHandler.ts

import { useCallback, useState, useEffect, useMemo } from 'react';
import { globalErrorHandler, ErrorHandlerOptions, RetryConfig } from '../utils/errorHandler';
import { useEnhancedToast } from '../utils/toastUtils';
import { EnhancedError } from '../types/errorTypes';
import { isOnline, supportsNetworkStatus } from '../utils/errorHandler';

export interface UseErrorHandlerOptions {
  showToastOnError?: boolean;
  defaultRetryConfig?: Partial<RetryConfig>;
  context?: string;
}

export interface UseErrorHandlerReturn {
  handleError: (error: any, context?: string, options?: ErrorHandlerOptions) => Promise<EnhancedError>;
  executeWithRetry: <T>(
    operation: () => Promise<T>,
    operationId: string,
    options?: ErrorHandlerOptions
  ) => Promise<T>;
  isOnline: boolean;
  getRetryCount: (operationId: string) => number;
  resetRetryCount: (operationId: string) => void;
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn => {
  const { showToastOnError = true, defaultRetryConfig, context: defaultContext } = options;
  const { showError } = useEnhancedToast();
  const [isOnlineState, setIsOnlineState] = useState(isOnline());

  // Network status monitoring
  useEffect(() => {
    if (!supportsNetworkStatus()) return;

    const handleOnline = () => setIsOnlineState(true);
    const handleOffline = () => setIsOnlineState(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleError = useCallback(async (
    error: any,
    context?: string,
    handlerOptions: ErrorHandlerOptions = {}
  ): Promise<EnhancedError> => {
    const effectiveContext = context || defaultContext || 'Unknown operation';
    const mergedOptions = {
      retryConfig: { ...defaultRetryConfig, ...handlerOptions.retryConfig },
      ...handlerOptions
    };

    const apiError = await globalErrorHandler.handleApiError(error, effectiveContext, mergedOptions);

    // Show toast notification unless suppressed
    if (showToastOnError && !mergedOptions.suppressToast) {
      showError(apiError);
    }

    return apiError;
  }, [showToastOnError, defaultRetryConfig, defaultContext, showError]);

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    operationId: string,
    handlerOptions: ErrorHandlerOptions = {}
  ): Promise<T> => {
    const effectiveContext = handlerOptions.context || defaultContext || operationId;
    const mergedOptions = {
      retryConfig: { ...defaultRetryConfig, ...handlerOptions.retryConfig },
      context: effectiveContext,
      ...handlerOptions
    };

    try {
      return await globalErrorHandler.executeWithRetry(operation, operationId, mergedOptions);
    } catch (error) {
      // Error has already been processed by the error handler
      // Show toast if not suppressed
      if (showToastOnError && !mergedOptions.suppressToast && error instanceof Object && 'message' in error) {
        const apiError = error as EnhancedError;
        showError(apiError);
      }
      
      throw error;
    }
  }, [showToastOnError, defaultRetryConfig, defaultContext, showError]);

  const getRetryCount = useCallback((operationId: string): number => {
    return globalErrorHandler.getRetryCount(operationId);
  }, []);

  const resetRetryCount = useCallback((operationId: string): void => {
    globalErrorHandler.resetRetryCount(operationId);
  }, []);

  return useMemo(() => ({
    handleError,
    executeWithRetry,
    isOnline: isOnlineState,
    getRetryCount,
    resetRetryCount
  }), [handleError, executeWithRetry, isOnlineState, getRetryCount, resetRetryCount]);
};

/**
 * Hook for API operations with automatic error handling and retry
 */
export const useApiOperation = <T>(
  operation: () => Promise<T>,
  operationId: string,
  options: UseErrorHandlerOptions & { 
    onSuccess?: (data: T) => void;
    onError?: (error: EnhancedError) => void;
  } = {}
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<EnhancedError | null>(null);
  const [data, setData] = useState<T | null>(null);
  
  const { executeWithRetry } = useErrorHandler(options);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await executeWithRetry(operation, operationId, {
        context: options.context || operationId
      });
      
      setData(result);
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const apiError = err as EnhancedError;
      setError(apiError);
      options.onError?.(apiError);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, [operation, operationId, executeWithRetry, options]);

  const reset = useCallback(() => {
    setError(null);
    setData(null);
    setIsLoading(false);
  }, []);

  return useMemo(() => ({
    execute,
    reset,
    isLoading,
    error,
    data
  }), [execute, reset, isLoading, error, data]);
};