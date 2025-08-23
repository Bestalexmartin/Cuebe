// frontend/src/hooks/useUserPreferences.ts

// This hook now simply re-exports the context-based implementation
// All preferences logic has been moved to PreferencesContext.tsx for app-level caching

export { useUserPreferences, type UserPreferences } from '../contexts/PreferencesContext';