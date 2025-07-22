// frontend/src/utils/toastUtils.ts

import { useToast } from '@chakra-ui/react';
import { toastConfigs } from '../ChakraTheme';
import { EnhancedError, ErrorSeverity } from '../types/errorTypes';

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  isClosable?: boolean;
}

export interface EnhancedToastOptions extends ToastOptions {
  severity: ErrorSeverity;
}

export const useEnhancedToast = () => {
  const toast = useToast();

  const showToast = (options: EnhancedToastOptions) => {
    const { severity, ...baseOptions } = options;
    
    const config = toastConfigs[severity] || toastConfigs.info;

    toast({
      title: baseOptions.title,
      description: baseOptions.description,
      status: severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'info',
      duration: baseOptions.duration ?? (severity === 'error' ? 6000 : 4000),
      isClosable: baseOptions.isClosable ?? true,
      position: 'bottom',
      ...config
    });
  };

  const showSuccess = (title: string, description?: string, options?: ToastOptions) => {
    showToast({
      title,
      description,
      severity: 'success',
      ...options
    });
  };

  const showError = (error: EnhancedError | string, options?: ToastOptions) => {
    if (typeof error === 'string') {
      showToast({
        title: 'Error',
        description: error,
        severity: 'error',
        ...options
      });
    } else {
      showToast({
        title: getErrorTitle(error),
        description: error.message + (error.details ? ` (${error.details})` : ''),
        severity: error.severity,
        ...options
      });
    }
  };

  const showWarning = (title: string, description?: string, options?: ToastOptions) => {
    showToast({
      title,
      description,
      severity: 'warning',
      ...options
    });
  };

  const showInfo = (title: string, description?: string, options?: ToastOptions) => {
    showToast({
      title,
      description,
      severity: 'info',
      ...options
    });
  };

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

const getErrorTitle = (error: EnhancedError): string => {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Connection Error';
    case 'UNAUTHORIZED':
      return 'Authentication Required';
    case 'VALIDATION_ERROR':
      return 'Invalid Input';
    case 'SERVER_ERROR':
      return 'Server Error';
    case 'NOT_FOUND':
      return 'Not Found';
    case 'FORBIDDEN':
      return 'Access Denied';
    default:
      return 'Error';
  }
};