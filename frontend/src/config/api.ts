// API configuration for development and production
export const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || '';

export const getApiUrl = (path: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // In development, use relative paths (proxy handles routing)
  // In production, use the full API base URL
  return API_BASE_URL ? `${API_BASE_URL}/${cleanPath}` : `/${cleanPath}`;
};

export const getWsUrl = (path: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  if (API_BASE_URL) {
    // In production, convert HTTP API URL to WebSocket URL
    const wsUrl = API_BASE_URL.replace(/^https?:/, window.location.protocol === 'https:' ? 'wss:' : 'ws:');
    return `${wsUrl}/${cleanPath}`;
  } else {
    // In development, use local WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.hostname}:8004/${cleanPath}`;
  }
};