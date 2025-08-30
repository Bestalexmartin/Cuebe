// frontend/src/utils/logger.ts

export const isDev = process.env.NODE_ENV !== 'production';

export const debug = (...args: any[]) => {
  if (isDev) console.debug(...args);
};

export const log = (...args: any[]) => {
  if (isDev) console.log(...args);
};

export const warn = (...args: any[]) => {
  if (isDev) console.warn(...args);
};

export const error = (...args: any[]) => {
  // Keep errors visible in all environments
  console.error(...args);
};

