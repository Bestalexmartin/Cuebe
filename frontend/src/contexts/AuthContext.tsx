// frontend/src/contexts/AuthContext.tsx
//
// Blok 017 auth context provider, ported for Cuebe.
//
// Manages global authentication state and the current user. Tokens live in
// HttpOnly cookies (no localStorage). Reactive token refresh is handled by
// apiFetch on 401; this provider adds proactive refresh while authenticated.
//
// This is the sole auth provider; it replaced the former Clerk integration.

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { LoginResponse, UserMeResponse } from '../types/auth';
import { authApi } from '../services/authApi';
import { attemptRefresh, onAuthLost } from '../services/apiFetch';
import { showWarningToast } from '../utils/authToast';

const TOKEN_REFRESH_MS = 4 * 60 * 60 * 1000; // 4 hours (access tokens expire at 8h)

export interface AuthContextType {
  user: UserMeResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLocked: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchUser: (targetUserId: string, pin: string) => Promise<void>;
  lock: () => void;
  unlock: (pin: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResponse> => {
    const result = await authApi.login(email, password);

    if (result.user && !result.mfa_required && !result.mfa_setup_required) {
      // Cookies are set by the server; fetch the full profile.
      try {
        const me = await authApi.me();
        setUser(me);
      } catch {
        // Login succeeded but /me failed; leave user unset and let the boot
        // path or a later refresh resolve it.
      }
      setIsLocked(false);
    }

    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Best-effort.
    }
    // Clear the CSRF cookie client-side to drop the stale session marker.
    document.cookie = 'bk_csrf=; max-age=0; path=/';
    setUser(null);
    setIsLocked(false);
  }, []);

  const switchUser = useCallback(async (targetUserId: string, pin: string) => {
    await authApi.switchUser(targetUserId, pin);
    // Cookies are updated by the server; fetch the new profile.
    const me = await authApi.me();
    setUser(me);
  }, []);

  const lock = useCallback(() => {
    setIsLocked(true);
  }, []);

  const unlock = useCallback(async (password: string) => {
    await authApi.unlock(password);
    setIsLocked(false);
  }, []);

  // Boot: load the user from existing cookies. Only call the API when a
  // session marker cookie exists, to avoid noisy 401s for anonymous visitors.
  useEffect(() => {
    async function boot() {
      const hasSession = document.cookie.includes('bk_csrf=');
      if (hasSession) {
        try {
          const me = await authApi.me();
          setUser(me);
        } catch {
          setUser(null);
        }
      }
      setIsLoading(false);
    }

    boot();
  }, []);

  // Listen for auth loss from apiFetch (e.g. refresh failed on 401).
  useEffect(() => {
    return onAuthLost(() => {
      const evicted = sessionStorage.getItem('cuebe_session_evicted');
      if (evicted) {
        sessionStorage.removeItem('cuebe_session_evicted');
        showWarningToast({
          title: 'Signed out',
          description:
            'You were signed out because your session limit was reached on another device.',
          duration: 8000,
        });
      }
      setUser(null);
      setIsLocked(false);
    });
  }, []);

  // Proactive token refresh keeps the session alive while authenticated:
  //   1. User on the page but idle on API calls (interval).
  //   2. User returns to the tab (visibility change).
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!user) return;

    intervalRef.current = setInterval(() => {
      attemptRefresh();
    }, TOKEN_REFRESH_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        attemptRefresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isLocked,
      login,
      logout,
      refreshUser,
      switchUser,
      lock,
      unlock,
    }),
    [user, isLoading, isLocked, login, logout, refreshUser, switchUser, lock, unlock],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
