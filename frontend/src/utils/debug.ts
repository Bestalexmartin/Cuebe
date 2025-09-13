// frontend/src/utils/debug.ts

export const isScopedTimingDebugEnabled = (): boolean => {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem('DEBUG_SCOPED_TIMING') === '1';
  } catch {
    return false;
  }
};

export const debugScopedTiming = (...args: any[]) => {
  if (isScopedTimingDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.log('[ScopedTiming]', ...args);
  }
};

