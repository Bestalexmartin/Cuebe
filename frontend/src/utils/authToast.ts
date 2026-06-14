// frontend/src/utils/authToast.ts
//
// Standalone toast helpers for the Blok 017 auth layer.
//
// Cuebe's primary toast surface is the useEnhancedToast hook (see toastUtils.ts),
// which must be called from inside a component. The ported auth flows raise
// toasts from module-scope async handlers and from AuthContext effects, so they
// need a hook-free entry point. This binds Chakra's standalone toast to Cuebe's
// theme and toastConfigs, and exposes the same helper surface the ported Blok
// components expect (a toaster.create shim plus show*Toast helpers).

import { createStandaloneToast } from '@chakra-ui/react';
import chakraTheme, { toastConfigs } from '../ChakraTheme';

const { toast, ToastContainer } = createStandaloneToast({ theme: chakraTheme });

// Mount once near the app root so module-scope auth toasts have a render target.
export const AuthToastContainer = ToastContainer;

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ShowToastOptions {
  title: string;
  description?: string;
  duration?: number;
}

function statusFor(type: ToastType): 'success' | 'error' | 'warning' | 'info' {
  return type;
}

function emit(type: ToastType, options: ShowToastOptions) {
  const config = toastConfigs[type] || toastConfigs.info;
  toast({
    title: options.title,
    description: options.description,
    status: statusFor(type),
    duration: options.duration ?? (type === 'error' ? 6000 : type === 'warning' ? 5000 : 4000),
    isClosable: true,
    position: 'bottom',
    ...config,
  });
}

export const showSuccessToast = (options: ShowToastOptions) => emit('success', options);
export const showErrorToast = (options: ShowToastOptions) => emit('error', options);
export const showWarningToast = (options: ShowToastOptions) => emit('warning', options);
export const showInfoToast = (options: ShowToastOptions) => emit('info', options);

// Compatibility shim matching the Blok toaster.create({ title, description, type })
// call shape used throughout the ported auth components.
export const toaster = {
  create(options: { title: string; description?: string; type?: ToastType; duration?: number }) {
    emit(options.type ?? 'info', {
      title: options.title,
      description: options.description,
      duration: options.duration,
    });
  },
};
