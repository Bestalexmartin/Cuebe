// frontend/src/hooks/useAuth.ts
//
// Blok 017 auth context consumer hook, ported for Cuebe.
//
// Note: this is the local self-hosted auth hook. It is unrelated to Clerk's
// useAuth (imported directly where still needed during the transition, e.g.
// useStableAuth). Consume this one via the named export to avoid ambiguity.

import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '../contexts/AuthContext';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
