// API configuration for development and production
export const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || '';

export const getApiUrl = (path: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // In development, use relative paths (proxy handles routing)
  // In production, use the full API base URL
  const finalUrl = API_BASE_URL ? `${API_BASE_URL}/${cleanPath}` : `/${cleanPath}`;

  console.log('🔍 DEBUG: getApiUrl called with:', path);
  console.log('🔍 DEBUG: API_BASE_URL:', API_BASE_URL);
  console.log('🔍 DEBUG: cleanPath:', cleanPath);
  console.log('🔍 DEBUG: finalUrl:', finalUrl);

  return finalUrl;
};