// frontend/src/hooks/useAuth.ts
//
// Blok 017 auth context consumer hook, ported for Cuebe.
//
// This is the self-hosted auth hook backed by AuthContext. It is the single
// source of current-user / authentication state across the app.

import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '../contexts/AuthContext';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
